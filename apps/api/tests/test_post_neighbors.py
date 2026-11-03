"""公开文章上一篇/下一篇测试。"""

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

            existing = await session.exec(select(User).where(User.username == "neighbortest"))
            if existing.first() is not None:
                return
            session.add(User(username="neighbortest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "neighbortest", "password": "secret123"},
    )
    assert login.status_code == 200


def _create_published_post(client: TestClient, slug: str, title: str, *, pinned: bool = False) -> None:
    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": title,
            "slug": slug,
            "content_md": "hello",
            "status": "published",
            "tag_slugs": [],
            "is_pinned": pinned,
        },
    )
    assert resp.status_code == 201


def test_public_post_neighbors(client: TestClient) -> None:
    _login(client)

    _create_published_post(client, "neighbor-oldest", "最早文章")
    _create_published_post(client, "neighbor-middle", "中间文章")
    _create_published_post(client, "neighbor-newest", "最新文章", pinned=True)

    middle = unwrap_api_response(client.get("/api/v1/public/posts/neighbor-middle"))
    assert middle["previous_post"] is not None
    assert middle["previous_post"]["slug"] == "neighbor-newest"
    assert middle["next_post"] is not None
    assert middle["next_post"]["slug"] == "neighbor-oldest"

    oldest = unwrap_api_response(client.get("/api/v1/public/posts/neighbor-oldest"))
    assert oldest["previous_post"] is not None
    assert oldest["previous_post"]["slug"] == "neighbor-middle"
    assert oldest["next_post"] is None

    newest = unwrap_api_response(client.get("/api/v1/public/posts/neighbor-newest"))
    assert newest["previous_post"] is None
    assert newest["next_post"] is not None
    assert newest["next_post"]["slug"] == "neighbor-middle"
