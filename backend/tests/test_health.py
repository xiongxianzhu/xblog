"""API 冒烟测试。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response


def test_public_health_ok(client: TestClient) -> None:
    resp = client.get("/api/v1/public/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"] == {"status": "ok"}


def test_admin_posts_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/v1/admin/posts")
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == -1
    assert body["msg"]


def test_auth_login_and_me(client: TestClient) -> None:
    from app.core.security import hash_password
    from app.db.session import async_session_factory
    from app.models.user import User

    async def create_user() -> None:
        async with async_session_factory() as session:
            session.add(User(username="tester", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "tester", "password": "secret123"},
    )
    assert login.status_code == 200
    assert unwrap_api_response(login)["username"] == "tester"

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert unwrap_api_response(me)["username"] == "tester"
