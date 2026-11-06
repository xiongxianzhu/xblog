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


def test_public_nav_order(client: TestClient) -> None:
    _login(client)
    endpoint = "/api/v1/admin/site-theme"
    public = "/api/v1/public/site-theme"
    original = unwrap_api_response(client.get(public))["nav_order"]
    assert original == ["blog", "tags", "about", "projects", "links", "search"]
    reordered = original[::-1]
    assert client.patch(endpoint, json={"nav_order": reordered}).status_code == 200
    assert client.patch(endpoint, json={"nav_order": ["blog"] * 5}).status_code == 422
    assert client.patch(endpoint, json={"posts_per_page": 15}).status_code == 200
    assert unwrap_api_response(client.get(public))["nav_order"] == reordered


def test_tag_cloud_counts_only_published_posts(client: TestClient) -> None:
    _login(client)
    assert unwrap_api_response(client.get("/api/v1/public/tags")) == []
    for slug, status, tags in [
        ("cloud-a", "published", ["python", "linux"]),
        ("cloud-b", "published", ["python"]),
        ("cloud-draft", "draft", ["python", "private"]),
    ]:
        response = client.post(
            "/api/v1/admin/posts",
            json={"title": slug, "slug": slug, "status": status, "tag_slugs": tags},
        )
        assert response.status_code == 201
    tags = unwrap_api_response(client.get("/api/v1/public/tags"))
    assert [(tag["slug"], tag["post_count"]) for tag in tags] == [("python", 2), ("linux", 1)]
    assert all(tag["name"] and tag["id"] for tag in tags)


def test_existing_nav_order_keeps_order_and_adds_tags(client: TestClient) -> None:
    import asyncio

    from app.db.session import async_session_factory
    from app.services.site_settings import _set_value

    async def store_old_order() -> None:
        async with async_session_factory() as session:
            await _set_value(session, "site.nav.order", "search,links,projects,about,blog")
            await session.commit()

    asyncio.run(store_old_order())
    theme = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert theme["nav_order"] == ["search", "links", "projects", "about", "blog", "tags"]
