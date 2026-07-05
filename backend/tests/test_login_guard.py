"""登录限流与 Turnstile guard 测试。"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.config import get_settings

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.login_log import LoginLog
from app.models.user import User
from tests.conftest import unwrap_api_response


def _seed_user() -> None:
    async def run() -> None:
        async with async_session_factory() as session:
            result = await session.exec(select(User).where(User.username == "guard-user"))
            user = result.first()
            if user is None:
                user = User(
                    username="guard-user",
                    password_hash=hash_password("secret123"),
                    is_active=True,
                )
                session.add(user)
            else:
                user.password_hash = hash_password("secret123")
                user.is_active = True
                session.add(user)
            await session.commit()

    asyncio.run(run())


async def _seed_failures(count: int, *, username: str = "guard-user", ip: str = "testclient") -> None:
    async with async_session_factory() as session:
        for _ in range(count):
            session.add(
                LoginLog(
                    username=username,
                    method="password",
                    success=False,
                    failure_reason="invalid_credentials",
                    ip_address=ip,
                )
            )
        await session.commit()


def _seed_failures_sync(count: int, *, username: str = "guard-user", ip: str = "testclient") -> None:
    asyncio.run(_seed_failures(count, username=username, ip=ip))


def test_login_guard_defaults(client: TestClient) -> None:
    response = client.get("/api/v1/auth/login-guard")
    assert response.status_code == 200
    data = unwrap_api_response(response)
    assert data["captcha_required"] is False
    assert data["locked"] is False
    assert data["failure_count"] == 0


def test_login_guard_turnstile_disabled_when_not_enabled(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "test-site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "test-secret-key")
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/login-guard")
    assert response.status_code == 200
    data = unwrap_api_response(response)
    assert data["captcha_enabled"] is False
    assert data["site_key"] is None

    get_settings.cache_clear()


def test_login_guard_after_failures(client: TestClient) -> None:
    _seed_failures_sync(3)
    response = client.get("/api/v1/auth/login-guard", params={"username": "guard-user"})
    assert response.status_code == 200
    data = unwrap_api_response(response)
    assert data["captcha_required"] is True
    assert data["failure_count"] >= 3


def test_login_locked_after_many_failures(client: TestClient) -> None:
    _seed_user()
    _seed_failures_sync(10)
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "guard-user", "password": "secret123"},
    )
    assert response.status_code == 429


def test_forgot_password_rate_limit(client: TestClient) -> None:
    for _ in range(3):
        response = client.post("/api/v1/auth/forgot-password", json={"username": "nobody"})
        assert response.status_code == 200
    response = client.post("/api/v1/auth/forgot-password", json={"username": "nobody"})
    assert response.status_code == 429


def test_login_wrong_password_returns_captcha_hint(client: TestClient) -> None:
    _seed_user()
    _seed_failures_sync(2)
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "guard-user", "password": "wrong-pass"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["data"]["captcha_required"] is True
    assert body["data"]["failure_count"] == 3
