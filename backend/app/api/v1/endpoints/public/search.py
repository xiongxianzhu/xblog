"""站内搜索 API。"""

from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import exists, or_
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PostSummary
from app.services.posts import to_post_summary

router = APIRouter()


def _like_pattern(query: str) -> str:
    return f"%{query}%"


def _text_search_filter(query: str):
    pattern = _like_pattern(query)
    tag_match = exists(
        select(PostTag.post_id)
        .join(Tag, Tag.id == PostTag.tag_id)
        .where(
            PostTag.post_id == Post.id,
            or_(Tag.name.ilike(pattern), Tag.slug.ilike(pattern)),
        )
    )
    return or_(
        Post.title.ilike(pattern),
        Post.slug.ilike(pattern),
        Post.excerpt.ilike(pattern),
        Post.content_md.ilike(pattern),
        tag_match,
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
