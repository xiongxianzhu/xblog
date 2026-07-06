"""公开文章 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PaginatedPostSummaries, PostPublic, PostSummary
from app.services.posts import PUBLIC_POST_LIST_ORDER, to_post_public, to_post_summary
from app.services.site_settings import get_posts_per_page

router = APIRouter()


@router.get("/posts", response_model=PaginatedPostSummaries)
async def list_posts(
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=50),
) -> PaginatedPostSummaries:
    effective_page_size = page_size if page_size is not None else await get_posts_per_page(session)
    total_result = await session.exec(
        select(func.count()).select_from(Post).where(Post.status == "published")
    )
    total = int(total_result.one())
    offset = (page - 1) * effective_page_size
    stmt = (
        select(Post)
        .where(Post.status == "published")
        .order_by(*PUBLIC_POST_LIST_ORDER)
        .offset(offset)
        .limit(effective_page_size)
    )
    result = await session.exec(stmt)
    posts = list(result.all())
    return PaginatedPostSummaries(
        items=[await to_post_summary(session, post) for post in posts],
        total=total,
        page=page,
        page_size=effective_page_size,
    )


@router.get("/posts/{slug}", response_model=PostPublic)
async def get_post(session: SessionDep, slug: str) -> PostPublic:
    result = await session.exec(select(Post).where(Post.slug == slug, Post.status == "published"))
    post = result.first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return await to_post_public(session, post)


@router.get("/tags/{slug}/posts", response_model=list[PostSummary])
async def list_posts_by_tag(
    session: SessionDep,
    slug: str,
    page: int = Query(default=1, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=50),
) -> list[PostSummary]:
    tag_result = await session.exec(select(Tag).where(Tag.slug == slug))
    if tag_result.first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    effective_page_size = page_size if page_size is not None else await get_posts_per_page(session)
    offset = (page - 1) * effective_page_size
    stmt = (
        select(Post)
        .join(PostTag, PostTag.post_id == Post.id)
        .join(Tag, Tag.id == PostTag.tag_id)
        .where(Post.status == "published", Tag.slug == slug)
        .order_by(*PUBLIC_POST_LIST_ORDER)
        .offset(offset)
        .limit(effective_page_size)
    )
    result = await session.exec(stmt)
    posts = list(result.all())
    return [await to_post_summary(session, post) for post in posts]
