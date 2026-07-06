"""文章置顶测试。"""

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

            existing = await session.exec(select(User).where(User.username == "pintest"))
            if existing.first() is not None:
                return
            session.add(User(username="pintest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "pintest", "password": "secret123"},
    )
    assert login.status_code == 200


def _create_post(client: TestClient, slug: str, *, pinned: bool = False) -> int:
    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": slug,
            "slug": slug,
            "content_md": "hello",
            "status": "published",
            "tag_slugs": [],
            "is_pinned": pinned,
        },
    )
    assert resp.status_code == 201
    return unwrap_api_response(resp)["id"]


def test_pinned_posts_appear_first(client: TestClient) -> None:
    _login(client)

    _create_post(client, "pin-normal")
    _create_post(client, "pin-top", pinned=True)

    public = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1, "page_size": 10}))
    slugs = [item["slug"] for item in public["items"]]
    assert slugs.index("pin-top") < slugs.index("pin-normal")
    assert public["items"][0]["is_pinned"] is True


def test_unpublish_clears_pin(client: TestClient) -> None:
    _login(client)

    post_id = _create_post(client, "pin-draft-clear", pinned=True)
    patch = client.patch(f"/api/v1/admin/posts/{post_id}", json={"status": "draft"})
    assert patch.status_code == 200
    body = unwrap_api_response(patch)
    assert body["is_pinned"] is False
