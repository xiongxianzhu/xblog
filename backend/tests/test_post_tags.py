"""文章标签同步测试。"""

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

            existing = await session.exec(select(User).where(User.username == "tagtest"))
            if existing.first() is not None:
                return
            session.add(User(username="tagtest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "tagtest", "password": "secret123"},
    )
    assert login.status_code == 200


def test_create_post_auto_creates_tags(client: TestClient) -> None:
    _login(client)

    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "标签测试",
            "slug": "tag-auto-create",
            "content_md": "hello",
            "status": "published",
            "tag_slugs": ["new-tag", "new-tag", "life-log"],
        },
    )
    assert resp.status_code == 201
    body = unwrap_api_response(resp)
    slugs = {tag["slug"] for tag in body["tags"]}
    assert slugs == {"new-tag", "life-log"}


def test_create_post_tags_by_display_name(client: TestClient) -> None:
    _login(client)

    resp = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "中文标签",
            "slug": "cn-tags",
            "content_md": "hello",
            "status": "published",
            "tag_slugs": ["技术", "AI 动画", "技术"],
        },
    )
    assert resp.status_code == 201
    body = unwrap_api_response(resp)
    tags = {tag["name"]: tag["slug"] for tag in body["tags"]}
    assert tags == {"技术": "技术", "AI 动画": "ai-动画"}

    public = client.get("/api/v1/public/tags/%E6%8A%80%E6%9C%AF/posts")
    assert public.status_code == 200
    assert len(unwrap_api_response(public)) == 1

    public = client.get("/api/v1/public/tags/new-tag/posts")
    assert public.status_code == 200
    posts = unwrap_api_response(public)
    assert len(posts) == 1
    assert posts[0]["slug"] == "tag-auto-create"
