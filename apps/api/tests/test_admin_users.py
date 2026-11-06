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
    users = unwrap_api_response(resp)["items"]
    assert isinstance(users, list)
    assert len(users) >= 2
    assert all("is_active" in user for user in users)
    assert all(key in users[0] for key in ("nickname", "email", "phone"))


def test_disable_and_enable_user(client: TestClient) -> None:
    _ensure_user("toggle-a")
    _ensure_user("toggle-b")
    _login(client, "toggle-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
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

    users = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
    user_id = users[0]["id"]
    resp = client.patch(f"/api/v1/admin/users/{user_id}", json={"is_active": False})
    assert resp.status_code == 409
    assert "唯一" in resp.json()["msg"]


def test_cannot_delete_last_admin(client: TestClient) -> None:
    _reset_to_single_user("only-admin")
    _login(client, "only-admin")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
    user_id = users[0]["id"]
    resp = client.delete(f"/api/v1/admin/users/{user_id}")
    assert resp.status_code == 409
    assert "唯一" in resp.json()["msg"]


def test_delete_user_when_multiple_exist(client: TestClient) -> None:
    _ensure_user("delete-a")
    _ensure_user("delete-b")
    _login(client, "delete-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
    target = next(user for user in users if user["username"] == "delete-b")

    resp = client.delete(f"/api/v1/admin/users/{target['id']}")
    assert resp.status_code == 200

    remaining = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
    assert all(user["username"] != "delete-b" for user in remaining)


def test_disabled_user_cannot_login(client: TestClient) -> None:
    _ensure_user("disabled-a")
    _ensure_user("disabled-b")
    _login(client, "disabled-a")

    users = unwrap_api_response(client.get("/api/v1/admin/users"))["items"]
    target = next(user for user in users if user["username"] == "disabled-b")
    client.patch(f"/api/v1/admin/users/{target['id']}", json={"is_active": False})

    client.post("/api/v1/auth/logout")
    login = client.post("/api/v1/auth/login", json={"username": "disabled-b", "password": "secret123"})
    assert login.status_code == 403
    assert "禁用" in login.json()["msg"]


def test_create_edit_and_reset_user_password(client: TestClient) -> None:
    _ensure_user("owner")
    _login(client, "owner")
    created = client.post("/api/v1/admin/users", json={"username": "new-admin", "email": "New@Example.com"})
    assert created.status_code == 201
    user = unwrap_api_response(created)
    assert user["email"] == "new@example.com"
    assert "password_hash" not in user
    user_id = user["id"]
    detail = client.get(f"/api/v1/admin/users/{user_id}")
    assert detail.status_code == 200
    assert unwrap_api_response(detail) == user
    assert client.get("/api/v1/admin/users/999999").status_code == 404
    edited = client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={
            "nickname": " 新昵称 ",
            "phone": "+86 13800138000",
            "gender": "female",
            "birth_date": "1995-01-02",
        },
    )
    assert edited.status_code == 200
    profile = unwrap_api_response(edited)
    assert profile["nickname"] == "新昵称"
    assert profile["phone"] == "13800138000"
    assert profile["email"] == "new@example.com"
    assert profile["birth_date"] == "1995-01-02"
    first = client.post(f"/api/v1/admin/users/{user_id}/reset-password")
    assert first.status_code == 200
    assert first.headers["cache-control"] == "no-store"
    old_password = unwrap_api_response(first)["password"]
    second = client.post(f"/api/v1/admin/users/{user_id}/reset-password")
    credentials = unwrap_api_response(second)
    assert credentials["username"] == "new-admin"
    assert len(credentials["password"]) == 24
    assert credentials["password"] != old_password
    detail = unwrap_api_response(client.get(f"/api/v1/admin/users/{user_id}"))
    assert "password" not in detail
    client.post("/api/v1/auth/logout")
    assert (
        client.post("/api/v1/auth/login", json={"username": "new-admin", "password": old_password}).status_code == 401
    )
    assert client.post("/api/v1/auth/login", json=credentials).status_code == 200
    assert unwrap_api_response(client.get("/api/v1/auth/me"))["must_change_password"] is True
    assert client.get("/api/v1/admin/users").status_code == 403
    assert client.patch("/api/v1/auth/profile", json={"nickname": "blocked"}).status_code == 403
    assert client.post("/api/v1/auth/refresh").status_code == 200
    assert client.get("/api/v1/admin/users").status_code == 403
    assert (
        client.post(
            "/api/v1/auth/change-password",
            json={
                "new_password": "chosen-secret123",
            },
        ).status_code
        == 200
    )
    assert unwrap_api_response(client.get("/api/v1/auth/me"))["must_change_password"] is False
    assert client.get("/api/v1/admin/users").status_code == 200
    # The exemption ends once the required password change has completed.
    assert client.post("/api/v1/auth/change-password", json={"new_password": "another-secret123"}).status_code == 400
    assert (
        client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "wrong-password",
                "new_password": "another-secret123",
            },
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "chosen-secret123",
                "new_password": "another-secret123",
            },
        ).status_code
        == 200
    )
    # An administrator reset must require a change again, including for an open session.
    client.post("/api/v1/auth/logout")
    _login(client, "owner")
    third = unwrap_api_response(client.post(f"/api/v1/admin/users/{user_id}/reset-password"))
    client.post("/api/v1/auth/logout")
    assert client.post("/api/v1/auth/login", json=third).status_code == 200
    assert client.get("/api/v1/admin/users").status_code == 403


def test_cli_created_user_must_change_password(client: TestClient) -> None:
    from app.cli import create_admin

    asyncio.run(create_admin("first-login", "secret123"))
    _login(client, "first-login")
    assert unwrap_api_response(client.get("/api/v1/auth/me"))["must_change_password"] is True
    assert client.get("/api/v1/admin/users").status_code == 403


def test_required_password_change_accepts_same_password(client: TestClient) -> None:
    from app.cli import create_admin

    asyncio.run(create_admin("same-password", "secret123"))
    _login(client, "same-password")
    assert client.post("/api/v1/auth/change-password", json={"new_password": "secret123"}).status_code == 200
    assert unwrap_api_response(client.get("/api/v1/auth/me"))["must_change_password"] is False
    assert client.get("/api/v1/admin/users").status_code == 200
    client.post("/api/v1/auth/logout")
    _login(client, "same-password")
    assert client.get("/api/v1/admin/users").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "secret123",
                "new_password": "secret123",
            },
        ).status_code
        == 400
    )


def test_admin_user_validation_and_duplicates(client: TestClient) -> None:
    _ensure_user("owner")
    _login(client, "owner")
    assert client.post("/api/v1/admin/users", json={"username": "owner"}).status_code == 409
    for payload in (
        {"username": " "},
        {"username": 12},
        {"username": "bad", "email": "invalid"},
        {"username": "bad", "phone": "123"},
    ):
        assert client.post("/api/v1/admin/users", json=payload).status_code in (400, 422)
    created = client.post("/api/v1/admin/users", json={"username": "second", "email": "a@example.com"})
    user_id = unwrap_api_response(created)["id"]
    assert client.post("/api/v1/admin/users", json={"username": "third", "email": "A@example.com"}).status_code == 409
    cleared = client.patch(f"/api/v1/admin/users/{user_id}", json={"email": None})
    assert unwrap_api_response(cleared)["email"] is None


def test_user_writes_require_authentication(client: TestClient) -> None:
    client.cookies.clear()
    assert client.post("/api/v1/auth/change-password", json={"new_password": "some-secret123"}).status_code == 401
    assert client.get("/api/v1/admin/users/1").status_code == 401
    assert client.post("/api/v1/admin/users", json={"username": "new-admin"}).status_code == 401
    assert client.patch("/api/v1/admin/users/1", json={"nickname": "changed"}).status_code == 401
    assert client.post("/api/v1/admin/users/1/reset-password").status_code == 401


def test_cannot_delete_last_active_admin_with_disabled_user(client: TestClient) -> None:
    _ensure_user("owner")
    _login(client, "owner")
    client.post("/api/v1/admin/users", json={"username": "disabled", "is_active": False})
    owner = next(
        user for user in unwrap_api_response(client.get("/api/v1/admin/users"))["items"] if user["username"] == "owner"
    )
    assert client.delete(f"/api/v1/admin/users/{owner['id']}").status_code == 409
