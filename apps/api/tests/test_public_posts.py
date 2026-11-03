"""公开文章列表分页测试。"""

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

            existing = await session.exec(select(User).where(User.username == "pubpagetest"))
            if existing.first() is not None:
                return
            session.add(User(username="pubpagetest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "pubpagetest", "password": "secret123"},
    )
    assert login.status_code == 200


def _create_published_post(client: TestClient, slug: str, title: str) -> None:
    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": title,
            "slug": slug,
            "content_md": "hello",
            "status": "published",
            "tag_slugs": [],
        },
    )
    assert resp.status_code == 201


def test_public_posts_pagination(client: TestClient) -> None:
    _login(client)

    baseline = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1, "page_size": 1}))
    initial_total = baseline["total"]

    for index in range(3):
        _create_published_post(client, f"pub-page-{index}", f"公开分页 {index}")

    first_page = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 1, "page_size": 2}))
    assert first_page["total"] == initial_total + 3
    assert first_page["page"] == 1
    assert first_page["page_size"] == 2
    assert len(first_page["items"]) == 2

    expected_total = initial_total + 3
    second_page = unwrap_api_response(client.get("/api/v1/public/posts", params={"page": 2, "page_size": 2}))
    assert second_page["total"] == expected_total
    assert second_page["page"] == 2
    assert len(second_page["items"]) == min(2, max(0, expected_total - 2))

    slugs_page_one = {item["slug"] for item in first_page["items"]}
    slugs_page_two = {item["slug"] for item in second_page["items"]}
    assert slugs_page_one.isdisjoint(slugs_page_two)
