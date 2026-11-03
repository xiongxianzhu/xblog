"""密码登录账号解析测试。"""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.security import ACCESS_COOKIE, hash_password
from app.db.session import async_session_factory
from app.models.user import User
from tests.conftest import unwrap_api_response


def _seed_login_user() -> None:
    async def run() -> None:
        async with async_session_factory() as session:
            result = await session.exec(select(User).where(User.username == "login-user"))
            user = result.first()
            if user is None:
                user = User(
                    username="login-user",
                    password_hash=hash_password("secret123"),
                    email="Login.User@Example.com",
                    phone="13800138001",
                    is_active=True,
                )
                session.add(user)
            else:
                user.email = "Login.User@Example.com"
                user.phone = "13800138001"
                user.password_hash = hash_password("secret123")
                user.is_active = True
                session.add(user)
            await session.commit()

    asyncio.run(run())


def _login(client: TestClient, account: str, password: str = "secret123") -> None:
    resp = client.post("/api/v1/auth/login", json={"username": account, "password": password})
    assert resp.status_code == 200, resp.text
    assert ACCESS_COOKIE in resp.cookies


def test_login_with_username(client: TestClient) -> None:
    _seed_login_user()
    _login(client, "login-user")
    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["username"] == "login-user"


def test_login_with_phone(client: TestClient) -> None:
    _seed_login_user()
    _login(client, "13800138001")
    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["username"] == "login-user"


def test_login_with_phone_plus86(client: TestClient) -> None:
    _seed_login_user()
    _login(client, "+86 13800138001")
    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["username"] == "login-user"


def test_login_with_email(client: TestClient) -> None:
    _seed_login_user()
    _login(client, "login.user@example.com")
    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["username"] == "login-user"


def test_login_with_wrong_password(client: TestClient) -> None:
    _seed_login_user()
    resp = client.post("/api/v1/auth/login", json={"username": "login-user", "password": "wrong-pass"})
    assert resp.status_code == 401
