"""OAuth 与找回密码 API 测试。"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import ACCESS_COOKIE, OAUTH_STATE_COOKIE, hash_password
from app.db.session import async_session_factory
from app.models.user import User
from app.services import auth_settings
from app.schemas.auth_settings import AuthSettingsUpdate


@pytest.fixture
def github_oauth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GITHUB_CLIENT_ID", "test-github-client-id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "test-github-client-secret")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _login(client: TestClient, username: str = "oauth-user") -> None:
    async def seed() -> None:
        async with async_session_factory() as session:
            from sqlmodel import select

            if (await session.exec(select(User).where(User.username == username))).first() is None:
                session.add(User(username=username, password_hash=hash_password("secret123")))
                await session.commit()

    asyncio.run(seed())
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": "secret123"})
    assert resp.status_code == 200
    assert ACCESS_COOKIE in resp.cookies


def test_oauth_providers_defaults(client: TestClient) -> None:
    response = client.get("/api/v1/auth/oauth/providers")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"] == {"github": False, "wechat": False}


def test_forgot_password_always_returns_message(client: TestClient) -> None:
    response = client.post("/api/v1/auth/forgot-password", json={"username": "nobody"})
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert "message" in body["data"]


def test_github_bind_start_sets_oauth_state_cookie(client: TestClient, github_oauth_env: None) -> None:
    async def enable_github() -> None:
        async with async_session_factory() as session:
            await auth_settings.update_auth_settings(session, AuthSettingsUpdate(github_enabled=True))

    asyncio.run(enable_github())
    _login(client)

    response = client.get("/api/v1/auth/oauth/github/bind/start", follow_redirects=False)
    assert response.status_code == 302
    assert OAUTH_STATE_COOKIE in response.cookies
    assert response.headers["location"].startswith("https://github.com/login/oauth/authorize")
