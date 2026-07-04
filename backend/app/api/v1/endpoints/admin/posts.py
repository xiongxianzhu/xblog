"""管理端文章 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.post import Post
from app.schemas.common import MessageResponse
from app.schemas.post import PostAdmin, PostCreate, PostUpdate
from app.services.posts import (
    apply_markdown,
    apply_publish_state,
    sync_tags,
    to_post_admin,
    validate_status,
)
from app.services.revalidate import trigger_revalidate

router = APIRouter()


@router.get("/posts", response_model=list[PostAdmin])
async def list_posts(
    session: SessionDep,
    _: CurrentUserDep,
) -> list[PostAdmin]:
    result = await session.exec(select(Post).order_by(Post.updated_at.desc()))
    posts = list(result.all())
    return [await to_post_admin(session, post) for post in posts]


@router.post("/posts", response_model=PostAdmin, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    session: SessionDep,
    _: CurrentUserDep,
) -> PostAdmin:
    validate_status(payload.status)
    existing = await session.exec(select(Post).where(Post.slug == payload.slug))
    if existing.first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    post = Post(
        title=payload.title,
        slug=payload.slug,
        excerpt=payload.excerpt,
        cover_url=payload.cover_url,
    )
    apply_markdown(post, payload.content_md)
    apply_publish_state(post, payload.status)
    session.add(post)
    await session.flush()
    await sync_tags(session, post.id or 0, payload.tag_slugs)
    await session.refresh(post)
    if payload.status == "published":
        await trigger_revalidate(["/", "/blog", f"/blog/{post.slug}"])
    return await to_post_admin(session, post)


@router.get("/posts/{post_id}", response_model=PostAdmin)
async def get_post(post_id: int, session: SessionDep, _: CurrentUserDep) -> PostAdmin:
    post = await session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return await to_post_admin(session, post)


@router.patch("/posts/{post_id}", response_model=PostAdmin)
async def update_post(
    post_id: int,
    payload: PostUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> PostAdmin:
    post = await session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if payload.slug and payload.slug != post.slug:
        existing = await session.exec(select(Post).where(Post.slug == payload.slug))
        if existing.first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
        post.slug = payload.slug
    if payload.title is not None:
        post.title = payload.title
    if payload.content_md is not None:
        apply_markdown(post, payload.content_md)
    if payload.excerpt is not None:
        post.excerpt = payload.excerpt
    if payload.cover_url is not None:
        post.cover_url = payload.cover_url
    if payload.status is not None:
        validate_status(payload.status)
        apply_publish_state(post, payload.status)
    if payload.tag_slugs is not None:
        await sync_tags(session, post.id or 0, payload.tag_slugs)
    post.touch_updated()
    await session.flush()
    await session.refresh(post)
    if payload.status == "published" or post.status == "published":
        await trigger_revalidate(["/", "/blog", f"/blog/{post.slug}"])
    return await to_post_admin(session, post)


@router.delete("/posts/{post_id}", response_model=MessageResponse)
async def delete_post(post_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    post = await session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await session.delete(post)
    return MessageResponse(message="deleted")
