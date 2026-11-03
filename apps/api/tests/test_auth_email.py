"""个人资料邮箱绑定测试。"""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.security import ACCESS_COOKIE, hash_password
from app.db.session import async_session_factory
from app.models.user import User
from tests.conftest import unwrap_api_response


def _login(client: TestClient) -> None:
    async def seed() -> None:
        async with async_session_factory() as session:
            if (await session.exec(select(User).where(User.username == "email-user"))).first() is None:
                session.add(User(username="email-user", password_hash=hash_password("secret123")))
                await session.commit()

    asyncio.run(seed())
    resp = client.post("/api/v1/auth/login", json={"username": "email-user", "password": "secret123"})
    assert resp.status_code == 200
    assert ACCESS_COOKIE in resp.cookies


def test_bind_email_and_login(client: TestClient) -> None:
    _login(client)

    bind = client.patch("/api/v1/auth/email", json={"email": "User@Example.com"})
    assert bind.status_code == 200
    data = unwrap_api_response(bind)
    assert data["email"] == "user@example.com"

    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["email"] == "user@example.com"

    client.post("/api/v1/auth/logout")
    login = client.post("/api/v1/auth/login", json={"username": "user@example.com", "password": "secret123"})
    assert login.status_code == 200


def test_bind_email_conflict(client: TestClient) -> None:
    async def seed() -> None:
        async with async_session_factory() as session:
            if (await session.exec(select(User).where(User.username == "email-a"))).first() is None:
                session.add(
                    User(
                        username="email-a",
                        password_hash=hash_password("secret123"),
                        email="taken@example.com",
                    )
                )
            if (await session.exec(select(User).where(User.username == "email-b"))).first() is None:
                session.add(User(username="email-b", password_hash=hash_password("secret123")))
            await session.commit()

    asyncio.run(seed())

    login_b = client.post("/api/v1/auth/login", json={"username": "email-b", "password": "secret123"})
    assert login_b.status_code == 200

    conflict = client.patch("/api/v1/auth/email", json={"email": "taken@example.com"})
    assert conflict.status_code == 409
