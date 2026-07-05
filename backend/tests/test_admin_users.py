"""管理端用户 API 测试。"""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.security import ACCESS_COOKIE, hash_password
from app.db.session import async_session_factory
from app.models.user import User
from tests.conftest import unwrap_api_response


def _ensure_user(username: str) -> None:
    async def run() -> None:
        async with async_session_factory() as session:
            result = await session.exec(select(User).where(User.username == username))
            if result.first() is None:
                session.add(User(username=username, password_hash=hash_password("secret123"), is_active=True))
                await session.commit()

    asyncio.run(run())


def _reset_to_single_user(username: str) -> None:
    async def run() -> None:
        async with async_session_factory() as session:
            result = await session.exec(select(User))
            for user in result.all():
                await session.delete(user)
            session.add(User(username=username, password_hash=hash_password("secret123"), is_active=True))
            await session.commit()

    asyncio.run(run())


def _login(client: TestClient, username: str) -> None:
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": "secret123"})
    assert resp.status_code == 200
    assert ACCESS_COOKIE in resp.cookies


def test_list_users_includes_is_active(client: TestClient) -> None:
    _ensure_user("admin-a")
    _ensure_user("admin-b")
    _login(client, "admin-a")

    resp = client.get("/api/v1/admin/users")
    assert resp.status_code == 200
    users = unwrap_api_response(resp)
    assert isinstance(users, list)
    assert len(users) >= 2
    assert all("is_active" in user for user in users)
    assert all(key in users[0] for key in ("nickname", "email", "phone"))


def test_disable_and_enable_user(client: TestClient) -> None:
    _ensure_user("toggle-a")
    _ensure_user("toggle-b")
    _login(client, "toggle-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))
    target = next(user for user in users if user["username"] == "toggle-b")

    disable = client.patch(f"/api/v1/admin/users/{target['id']}", json={"is_active": False})
    assert disable.status_code == 200
    assert unwrap_api_response(disable)["is_active"] is False

    enable = client.patch(f"/api/v1/admin/users/{target['id']}", json={"is_active": True})
    assert enable.status_code == 200
    assert unwrap_api_response(enable)["is_active"] is True


def test_cannot_disable_last_active_admin(client: TestClient) -> None:
    _reset_to_single_user("solo-admin")
    _login(client, "solo-admin")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))
    user_id = users[0]["id"]
    resp = client.patch(f"/api/v1/admin/users/{user_id}", json={"is_active": False})
    assert resp.status_code == 409
    assert "唯一" in resp.json()["msg"]


def test_cannot_delete_last_admin(client: TestClient) -> None:
    _reset_to_single_user("only-admin")
    _login(client, "only-admin")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))
    user_id = users[0]["id"]
    resp = client.delete(f"/api/v1/admin/users/{user_id}")
    assert resp.status_code == 409
    assert "唯一" in resp.json()["msg"]


def test_delete_user_when_multiple_exist(client: TestClient) -> None:
    _ensure_user("delete-a")
    _ensure_user("delete-b")
    _login(client, "delete-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))
    target = next(user for user in users if user["username"] == "delete-b")

    resp = client.delete(f"/api/v1/admin/users/{target['id']}")
    assert resp.status_code == 200

    remaining = unwrap_api_response(client.get("/api/v1/admin/users"))
    assert all(user["username"] != "delete-b" for user in remaining)


def test_disabled_user_cannot_login(client: TestClient) -> None:
    _ensure_user("disabled-a")
    _ensure_user("disabled-b")
    _login(client, "disabled-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))
    target = next(user for user in users if user["username"] == "disabled-b")
    client.patch(f"/api/v1/admin/users/{target['id']}", json={"is_active": False})

    client.post("/api/v1/auth/logout")
    login = client.post("/api/v1/auth/login", json={"username": "disabled-b", "password": "secret123"})
    assert login.status_code == 403
    assert "禁用" in login.json()["msg"]
