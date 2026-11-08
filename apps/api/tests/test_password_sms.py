"""Password login SMS challenge and database-setting integration tests."""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.config import get_settings
from app.core.security import ACCESS_COOKIE, create_access_token, decode_token, hash_password
from app.core.timezone import now
from app.db.session import async_session_factory
from app.models.login_log import LoginLog
from app.models.site_setting import SiteSetting
from app.models.sms_verification_code import SmsVerificationCode
from app.models.user import User
from app.schemas.auth_settings import AuthSettingsUpdate
from app.services import auth_settings, password_sms, sms_service
from tests.conftest import unwrap_api_response

PASSWORD = "password123"


@pytest.fixture
def account(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    async def seed() -> None:
        async with async_session_factory() as session:
            session.add(User(username="factoradmin", password_hash=hash_password(PASSWORD), phone="13800138000"))
            await session.commit()

    asyncio.run(seed())
    sent: list[str] = []

    async def deliver(phone: str, code: str) -> None:
        assert phone == "13800138000"
        sent.append(code)

    monkeypatch.setattr(sms_service, "_send_sms", deliver)
    return sent


def enable(value: bool = True) -> None:
    async def update() -> None:
        async with async_session_factory() as session:
            await auth_settings.update_auth_settings(session, AuthSettingsUpdate(password_sms_enabled=value))

    asyncio.run(update())


def start(client: TestClient) -> dict:
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD})
    assert response.status_code == 200, response.text
    assert "set-cookie" not in response.headers
    data = unwrap_api_response(response)
    assert data["sms_required"] is True
    assert data["masked_phone"] == "138****8000"
    return data


def finish(client: TestClient, challenge: dict, code: str):
    return client.post("/api/v1/auth/login/sms", json={"challenge_token": challenge["challenge_token"], "code": code})


def test_default_off_and_setting_persists(client: TestClient, account: list[str]) -> None:
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD})
    assert response.status_code == 200
    assert ACCESS_COOKIE in response.cookies
    assert account == []
    settings = unwrap_api_response(client.get("/api/v1/admin/auth-settings"))
    assert settings["password_sms_enabled"] is False
    updated = client.patch("/api/v1/admin/auth-settings", json={"password_sms_enabled": True})
    assert updated.status_code == 200
    assert unwrap_api_response(client.get("/api/v1/admin/auth-settings"))["password_sms_enabled"] is True

    async def check_row() -> None:
        async with async_session_factory() as session:
            rows = await session.exec(
                select(SiteSetting).where(SiteSetting.key == auth_settings.PASSWORD_SMS_ENABLED_KEY)
            )
            assert rows.one().value == "true"

    asyncio.run(check_row())
    assert client.patch("/api/v1/admin/auth-settings", json={"password_sms_enabled": False}).status_code == 200
    assert unwrap_api_response(client.get("/api/v1/admin/auth-settings"))["password_sms_enabled"] is False


def test_challenge_does_not_authenticate_and_consumes_once(client: TestClient, account: list[str]) -> None:
    enable()
    challenge = start(client)
    assert len(account) == 1
    assert client.get("/api/v1/auth/me").status_code == 401
    # A challenge is not a session token, even if placed in the access cookie.
    client.cookies.set(ACCESS_COOKIE, challenge["challenge_token"])
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.clear()

    async def check_before() -> None:
        async with async_session_factory() as session:
            user = (await session.exec(select(User).where(User.username == "factoradmin"))).one()
            assert user.last_login_at is None
            assert (await session.exec(select(LoginLog))).all() == []

    asyncio.run(check_before())
    response = finish(client, challenge, account[0])
    assert response.status_code == 200, response.text
    assert ACCESS_COOKIE in response.cookies
    assert unwrap_api_response(response)["username"] == "factoradmin"
    client.cookies.clear()
    replay = finish(client, challenge, account[0])
    assert replay.status_code == 400
    assert "set-cookie" not in replay.headers


def test_bad_password_never_sends(client: TestClient, account: list[str]) -> None:
    enable()
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": "wrong"})
    assert response.status_code == 401
    assert account == []


def test_wrong_codes_are_limited_and_audited(client: TestClient, account: list[str]) -> None:
    enable()
    challenge = start(client)
    wrong = "000000" if account[0] != "000000" else "111111"
    for attempt in range(password_sms.MAX_ATTEMPTS):
        response = finish(client, challenge, wrong)
        assert response.status_code == (429 if attempt == 4 else 400)
        assert "set-cookie" not in response.headers
    assert finish(client, challenge, account[0]).status_code == 400

    async def check_attempts() -> None:
        async with async_session_factory() as session:
            record = (await session.exec(select(SmsVerificationCode))).one()
            assert record.attempts == 5
            assert record.used_at is not None
            logs = (await session.exec(select(LoginLog))).all()
            assert len(logs) == 5
            assert all(not log.success and log.failure_reason == "invalid_second_factor" for log in logs)

    asyncio.run(check_attempts())


@pytest.mark.parametrize("change", ["expired", "disabled", "phone", "password", "setting", "purpose"])
def test_invalidated_challenges(client: TestClient, account: list[str], change: str) -> None:
    enable()
    challenge = start(client)

    async def invalidate() -> None:
        async with async_session_factory() as session:
            user = (await session.exec(select(User).where(User.username == "factoradmin"))).one()
            record = (await session.exec(select(SmsVerificationCode))).one()
            if change == "expired":
                record.expires_at = now() - timedelta(seconds=1)
            elif change == "disabled":
                user.is_active = False
            elif change == "phone":
                user.phone = "13900139000"
            elif change == "password":
                user.password_hash = hash_password("different123")
            elif change == "purpose":
                record.purpose = "login"
            elif change == "setting":
                await auth_settings.update_auth_settings(session, AuthSettingsUpdate(password_sms_enabled=False))
            session.add(user)
            session.add(record)
            await session.commit()

    asyncio.run(invalidate())
    response = finish(client, challenge, account[0])
    assert response.status_code in {400, 403}
    assert "set-cookie" not in response.headers


def test_send_limit_and_resend_invalidate_old_code(client: TestClient, account: list[str]) -> None:
    enable()
    old = start(client)
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD})
    assert response.status_code == 429
    assert len(account) == 1

    async def age_code() -> None:
        async with async_session_factory() as session:
            record = (await session.exec(select(SmsVerificationCode))).one()
            record.created_at = now() - timedelta(seconds=get_settings().sms_send_interval_seconds + 1)
            session.add(record)
            await session.commit()

    asyncio.run(age_code())
    new = start(client)
    assert finish(client, old, account[0]).status_code == 400
    assert finish(client, new, account[1]).status_code == 200


def test_sms_only_codes_cannot_satisfy_second_factor(client: TestClient, account: list[str]) -> None:
    enable()
    challenge = start(client)

    # The independent SMS-login endpoint cannot use this challenge's purpose/hash.
    async def enable_sms() -> None:
        async with async_session_factory() as session:
            await auth_settings.update_auth_settings(session, AuthSettingsUpdate(sms_enabled=True))

    asyncio.run(enable_sms())
    response = client.post("/api/v1/auth/sms/login", json={"phone": "13800138000", "code": account[0]})
    assert response.status_code == 400
    assert finish(client, challenge, account[0]).status_code == 200


def test_invalid_token_type_and_missing_phone(client: TestClient, account: list[str]) -> None:
    enable()
    assert finish(client, {"challenge_token": create_access_token("factoradmin")}, "123456").status_code == 400
    assert finish(client, {"challenge_token": "invalid"}, "123456").status_code == 400

    async def remove_phone() -> None:
        async with async_session_factory() as session:
            user = (await session.exec(select(User).where(User.username == "factoradmin"))).one()
            user.phone = None
            session.add(user)
            await session.commit()

    asyncio.run(remove_phone())
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD})
    assert response.status_code == 403
    assert account == []


def test_unbound_admin_cannot_enable(client: TestClient, account: list[str]) -> None:
    assert client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD}).status_code == 200

    async def remove_phone() -> None:
        async with async_session_factory() as session:
            user = (await session.exec(select(User).where(User.username == "factoradmin"))).one()
            user.phone = None
            session.add(user)
            await session.commit()

    asyncio.run(remove_phone())
    assert client.patch("/api/v1/admin/auth-settings", json={"password_sms_enabled": True}).status_code == 400


def test_unavailable_delivery_cannot_enable(
    client: TestClient, account: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    assert client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD}).status_code == 200
    monkeypatch.setattr(get_settings(), "sms_provider", "aliyun")
    response = client.patch("/api/v1/admin/auth-settings", json={"password_sms_enabled": True})
    assert response.status_code == 400
    assert client.patch("/api/v1/admin/auth-settings", json={"password_sms_enabled": False}).status_code == 200


def test_challenge_claims_do_not_expose_phone_or_password(client: TestClient, account: list[str]) -> None:
    enable()
    challenge = start(client)
    payload = decode_token(challenge["challenge_token"])
    assert "13800138000" not in str(payload)
    assert PASSWORD not in str(payload)


def test_delivery_failure_does_not_persist_challenge(
    client: TestClient, account: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    enable()

    async def fail(phone: str, code: str) -> None:
        raise HTTPException(status_code=503, detail="SMS unavailable")

    monkeypatch.setattr(sms_service, "_send_sms", fail)
    response = client.post("/api/v1/auth/login", json={"username": "factoradmin", "password": PASSWORD})
    assert response.status_code == 503
    assert "set-cookie" not in response.headers

    async def check_empty() -> None:
        async with async_session_factory() as session:
            assert (await session.exec(select(SmsVerificationCode))).all() == []

    asyncio.run(check_empty())


def test_parallel_verification_consumes_code_once(client: TestClient, account: list[str]) -> None:
    from app.db.session import engine

    if engine.dialect.name != "postgresql":
        pytest.skip("Concurrent row-lock acceptance requires PostgreSQL")
    enable()
    challenge = start(client)
    barrier = Barrier(2)

    def verify():
        parallel = TestClient(client.app)
        barrier.wait(timeout=10)
        return finish(parallel, challenge, account[0])

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(verify) for _ in range(2)]
        responses = [future.result(timeout=20) for future in futures]
    assert sorted(response.status_code for response in responses) == [200, 400]
    assert sum(ACCESS_COOKIE in response.cookies for response in responses) == 1
