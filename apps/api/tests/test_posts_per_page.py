"""站点每页文章数配置测试。"""

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

            existing = await session.exec(select(User).where(User.username == "pagesizetest"))
            if existing.first() is not None:
                return
            session.add(User(username="pagesizetest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "pagesizetest", "password": "secret123"},
    )
    assert login.status_code == 200


def _create_published_post(client: TestClient, slug: str) -> None:
    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": slug,
            "slug": slug,
            "content_md": "hello",
            "status": "published",
            "tag_slugs": [],
        },
    )
    assert resp.status_code == 201


def test_posts_per_page_from_site_settings(client: TestClient) -> None:
    _login(client)

    baseline = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1, "page_size": 1}))
    initial_total = baseline["total"]

    for index in range(5):
        _create_published_post(client, f"page-size-{index}")

    patch = client.patch("/api/v1/admin/site-theme", json={"posts_per_page": 15})
    assert patch.status_code == 200
    theme = unwrap_api_response(patch)
    assert theme["posts_per_page"] == 15

    public = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1}))
    assert public["page_size"] == 15
    assert public["total"] == initial_total + 5

    explicit = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1, "page_size": 2}))
    assert explicit["page_size"] == 2
    assert len(explicit["items"]) == 2
