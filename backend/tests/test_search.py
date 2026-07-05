"""公开搜索 API 测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.session import async_session_factory
from app.models.post import Post, PostTag, Tag
from tests.conftest import unwrap_api_response


def test_search_matches_chinese_title(client: TestClient) -> None:
    async def seed_post() -> None:
        async with async_session_factory() as session:
            session.add(
                Post(
                    title="我的第一篇博客文章",
                    slug="my-first-post",
                    content_md="正文内容",
                    status="published",
                    published_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()

    asyncio.run(seed_post())

    resp = client.get("/api/v1/public/search", params={"q": "博客"})
    assert resp.status_code == 200
    results = unwrap_api_response(resp)
    assert len(results) == 1
    assert results[0]["title"] == "我的第一篇博客文章"


def test_search_skips_draft_posts(client: TestClient) -> None:
    async def seed_post() -> None:
        async with async_session_factory() as session:
            session.add(
                Post(
                    title="草稿里的博客标题",
                    slug="draft-post",
                    content_md="正文",
                    status="draft",
                )
            )
            await session.commit()

    asyncio.run(seed_post())

    resp = client.get("/api/v1/public/search", params={"q": "草稿里的"})
    assert resp.status_code == 200
    assert unwrap_api_response(resp) == []


def test_search_matches_partial_title(client: TestClient) -> None:
    async def seed_post() -> None:
        async with async_session_factory() as session:
            session.add(
                Post(
                    title="我的第一篇博客文章",
                    slug="partial-title-post",
                    content_md="正文内容",
                    status="published",
                    published_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()

    asyncio.run(seed_post())

    resp = client.get("/api/v1/public/search", params={"q": "第一篇"})
    assert resp.status_code == 200
    results = unwrap_api_response(resp)
    assert any(item["slug"] == "partial-title-post" for item in results)


def test_search_matches_chinese_tag_name(client: TestClient) -> None:
    async def seed_post() -> None:
        async with async_session_factory() as session:
            tag = Tag(name="AI动画", slug="ai-donghua-tag")
            session.add(tag)
            await session.flush()
            post = Post(
                title="无关标题",
                slug="tagged-post-search",
                content_md="正文",
                status="published",
                published_at=datetime.now(timezone.utc),
            )
            session.add(post)
            await session.flush()
            session.add(PostTag(post_id=post.id, tag_id=tag.id))
            await session.commit()

    asyncio.run(seed_post())

    resp = client.get("/api/v1/public/search", params={"q": "动画"})
    assert resp.status_code == 200
    results = unwrap_api_response(resp)
    assert len(results) == 1
    assert results[0]["slug"] == "tagged-post-search"


def test_search_matches_chinese_tag_slug(client: TestClient) -> None:
    async def seed_post() -> None:
        async with async_session_factory() as session:
            tag = Tag(name="影视动画", slug="ai动画")
            session.add(tag)
            await session.flush()
            post = Post(
                title="另一篇文章",
                slug="another-post-search",
                content_md="正文",
                status="published",
                published_at=datetime.now(timezone.utc),
            )
            session.add(post)
            await session.flush()
            session.add(PostTag(post_id=post.id, tag_id=tag.id))
            await session.commit()

    asyncio.run(seed_post())

    resp = client.get("/api/v1/public/search", params={"q": "ai动画"})
    assert resp.status_code == 200
    results = unwrap_api_response(resp)
    assert any(item["slug"] == "another-post-search" for item in results)
