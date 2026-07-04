"""公开文章 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PostPublic, PostSummary
from app.services.posts import to_post_public, to_post_summary

router = APIRouter()


@router.get("/posts", response_model=list[PostSummary])
async def list_posts(
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> list[PostSummary]:
    offset = (page - 1) * page_size
    stmt = (
        select(Post)
        .where(Post.status == "published")
        .order_by(Post.published_at.desc(), Post.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    posts = list(result.all())
    return [await to_post_summary(session, post) for post in posts]


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
    page_size: int = Query(default=10, ge=1, le=50),
) -> list[PostSummary]:
    tag_result = await session.exec(select(Tag).where(Tag.slug == slug))
    if tag_result.first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    offset = (page - 1) * page_size
    stmt = (
        select(Post)
        .join(PostTag, PostTag.post_id == Post.id)
        .join(Tag, Tag.id == PostTag.tag_id)
        .where(Post.status == "published", Tag.slug == slug)
        .order_by(Post.published_at.desc(), Post.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    posts = list(result.all())
    return [await to_post_summary(session, post) for post in posts]
