"""站内搜索 API。"""

from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import or_, text
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.config import get_settings
from app.models.post import Post
from app.schemas.post import PostSummary
from app.services.posts import to_post_summary

router = APIRouter()
settings = get_settings()


@router.get("/search", response_model=list[PostSummary])
async def search_posts(
    session: SessionDep,
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> list[PostSummary]:
    offset = (page - 1) * page_size
    base = (
        select(Post)
        .where(Post.status == "published")
        .order_by(Post.published_at.desc(), Post.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    if settings.database_url.startswith("postgresql"):
        stmt = base.where(
            text(
                "to_tsvector('simple', coalesce(posts.title, '') || ' ' || "
                "coalesce(posts.excerpt, '') || ' ' || coalesce(posts.content_md, '')) "
                "@@ plainto_tsquery('simple', :query)"
            ).bindparams(query=q)
        )
    else:
        pattern = f"%{q}%"
        stmt = base.where(
            or_(
                Post.title.ilike(pattern),
                Post.excerpt.ilike(pattern),
                Post.content_md.ilike(pattern),
            )
        )
    result = await session.exec(stmt)
    posts = list(result.all())
    return [await to_post_summary(session, post) for post in posts]
