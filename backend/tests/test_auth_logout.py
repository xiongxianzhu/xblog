"""认证 logout 与响应包装测试。"""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.core.security import ACCESS_COOKIE, REFRESH_COOKIE, hash_password
from app.db.session import async_session_factory
from app.models.user import User


def _login(client: TestClient) -> None:
    async def seed_user() -> None:
        async with async_session_factory() as session:
            session.add(User(username="logout-user", password_hash=hash_password("secret123")))
            await session.commit()

    asyncio.run(seed_user())
    resp = client.post("/api/v1/auth/login", json={"username": "logout-user", "password": "secret123"})
    assert resp.status_code == 200
    assert ACCESS_COOKIE in resp.cookies
    assert REFRESH_COOKIE in resp.cookies


def test_logout_clears_auth_cookies(client: TestClient) -> None:
    _login(client)

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    body = logout.json()
    assert body["code"] == 0

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 401
