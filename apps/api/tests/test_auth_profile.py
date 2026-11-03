"""个人资料基本信息更新测试。"""

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
            if (await session.exec(select(User).where(User.username == "profile-user"))).first() is None:
                session.add(User(username="profile-user", password_hash=hash_password("secret123")))
                await session.commit()

    asyncio.run(seed())
    resp = client.post("/api/v1/auth/login", json={"username": "profile-user", "password": "secret123"})
    assert resp.status_code == 200
    assert ACCESS_COOKIE in resp.cookies


def test_update_profile_fields(client: TestClient) -> None:
    _login(client)

    resp = client.patch(
        "/api/v1/auth/profile",
        json={"nickname": "墨纸作者", "birth_date": "1990-05-01", "gender": "male"},
    )
    assert resp.status_code == 200
    data = unwrap_api_response(resp)
    assert data["nickname"] == "墨纸作者"
    assert data["birth_date"] == "1990-05-01"
    assert data["gender"] == "male"

    me = unwrap_api_response(client.get("/api/v1/auth/me"))
    assert me["nickname"] == "墨纸作者"


def test_update_profile_rejects_future_birth_date(client: TestClient) -> None:
    _login(client)

    resp = client.patch("/api/v1/auth/profile", json={"birth_date": "2099-01-01"})
    assert resp.status_code == 400


def test_clear_profile_fields(client: TestClient) -> None:
    _login(client)

    client.patch(
        "/api/v1/auth/profile",
        json={"nickname": "临时昵称", "birth_date": "1992-02-02", "gender": "female"},
    )
    cleared = client.patch(
        "/api/v1/auth/profile",
        json={"nickname": None, "birth_date": None, "gender": None},
    )
    assert cleared.status_code == 200
    data = unwrap_api_response(cleared)
    assert data["nickname"] is None
    assert data["birth_date"] is None
    assert data["gender"] is None
