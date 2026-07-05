"""公开搜索 API 测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.session import async_session_factory
from app.models.post import Post
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
