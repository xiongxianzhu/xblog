"""登录方式与短信登录测试。"""

from __future__ import annotations

import asyncio
import hashlib

from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.sms_verification_code import SmsVerificationCode
from app.models.user import User
from app.schemas.auth_settings import AuthSettingsUpdate
from app.services import auth_settings
from tests.conftest import unwrap_api_response


def _seed_sms_admin() -> None:
    async def seed() -> None:
        async with async_session_factory() as session:
            result = await session.exec(select(User).where(User.username == "smsadmin"))
            user = result.first()
            if user is None:
                user = User(username="smsadmin", password_hash=hash_password("password123"), phone="13800138000")
                session.add(user)
            else:
                user.phone = "13800138000"
                session.add(user)
            await session.commit()

    asyncio.run(seed())


def _enable_sms_login() -> None:
    async def enable() -> None:
        async with async_session_factory() as session:
            await auth_settings.update_auth_settings(session, AuthSettingsUpdate(sms_enabled=True))

    asyncio.run(enable())


def test_login_methods_defaults(client: TestClient) -> None:
    response = client.get("/api/v1/auth/login-methods")
    assert response.status_code == 200
    data = unwrap_api_response(response)
    assert data == {"sms": False, "github": False, "wechat": False}


def test_sms_login_flow(client: TestClient) -> None:
    _seed_sms_admin()
    _enable_sms_login()

    response = client.get("/api/v1/auth/login-methods")
    assert unwrap_api_response(response)["sms"] is True

    send_response = client.post("/api/v1/auth/sms/send-code", json={"phone": "13800138000"})
    assert send_response.status_code == 200

    async def read_latest_code() -> str:
        async with async_session_factory() as session:
            result = await session.exec(
                select(SmsVerificationCode)
                .where(SmsVerificationCode.phone == "13800138000")
                .where(SmsVerificationCode.used_at == None)  # noqa: E711
                .order_by(SmsVerificationCode.created_at.desc())  # type: ignore[arg-type]
            )
            record = result.first()
            assert record is not None
            for candidate in range(1_000_000):
                code = f"{candidate:06d}"
                if hashlib.sha256(code.encode()).hexdigest() == record.code_hash:
                    return code
            raise AssertionError("verification code not found")

    code = asyncio.run(read_latest_code())
    login_response = client.post(
        "/api/v1/auth/sms/login",
        json={"phone": "13800138000", "code": code},
    )
    assert login_response.status_code == 200
    data = unwrap_api_response(login_response)
    assert data["username"] == "smsadmin"
