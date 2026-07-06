"""管理端文章统计测试。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response


def _login(client: TestClient) -> None:
    from app.core.security import hash_password
    from app.db.session import async_session_factory
    from app.models.user import User

    async def create_user() -> None:
        async with async_session_factory() as session:
            from sqlmodel import select

            existing = await session.exec(select(User).where(User.username == "statsdash"))
            if existing.first() is not None:
                return
            session.add(User(username="statsdash", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "statsdash", "password": "secret123"},
    )
    assert login.status_code == 200


def test_admin_post_stats(client: TestClient) -> None:
    _login(client)

    client.post(
        "/api/v1/admin/posts",
        json={"title": "草稿文", "slug": "stats-draft", "content_md": "x", "status": "draft"},
    )
    client.post(
        "/api/v1/admin/posts",
        json={"title": "已发布", "slug": "stats-pub", "content_md": "x", "status": "published"},
    )

    stats = unwrap_api_response(client.get("/api/v1/admin/posts/stats"))
    assert stats["total"] >= 2
    assert stats["published"] >= 1
    assert stats["draft"] >= 1
