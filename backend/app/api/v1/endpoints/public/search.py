"""站内搜索 API。"""

from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import or_
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.post import Post
from app.schemas.post import PostSummary
from app.services.posts import to_post_summary

router = APIRouter()


def _text_search_filter(query: str):
    pattern = f"%{query}%"
    return or_(
        Post.title.ilike(pattern),
        Post.excerpt.ilike(pattern),
        Post.content_md.ilike(pattern),
    )


@router.get("/search", response_model=list[PostSummary])
async def search_posts(
    session: SessionDep,
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> list[PostSummary]:
    offset = (page - 1) * page_size
    stmt = (
        select(Post)
        .where(Post.status == "published")
        .where(_text_search_filter(q.strip()))
        .order_by(Post.published_at.desc(), Post.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    posts = list(result.all())
    return [await to_post_summary(session, post) for post in posts]
