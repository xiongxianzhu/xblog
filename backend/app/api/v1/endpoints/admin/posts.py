"""管理端文章 API。"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.post import Post
from app.schemas.common import MessageResponse
from app.schemas.post import PostAdmin, PostCoverUploadResponse, PostCreate, PostUpdate
from app.services.posts import (
    apply_markdown,
    apply_publish_state,
    normalize_cover_url,
    sync_tags,
    to_post_admin,
    validate_status,
)
from app.services.revalidate import trigger_revalidate
from app.services.uploads import delete_post_cover_file, is_managed_post_cover_url, save_post_cover

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
        cover_url=normalize_cover_url(payload.cover_url),
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
    if "cover_url" in payload.model_fields_set:
        new_cover = normalize_cover_url(payload.cover_url)
        if new_cover != post.cover_url and is_managed_post_cover_url(post.cover_url):
            delete_post_cover_file(post.cover_url)
        post.cover_url = new_cover
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


@router.post("/posts/cover", response_model=PostCoverUploadResponse)
async def upload_post_cover(_: CurrentUserDep, file: UploadFile = File(...)) -> PostCoverUploadResponse:  # noqa: B008
    cover_url = await save_post_cover(file)
    return PostCoverUploadResponse(cover_url=cover_url)


@router.delete("/posts/cover", response_model=MessageResponse)
async def delete_uploaded_post_cover(
    _: CurrentUserDep,
    cover_url: str = Query(..., min_length=1),
) -> MessageResponse:
    if not is_managed_post_cover_url(cover_url):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a managed cover URL")
    delete_post_cover_file(cover_url)
    return MessageResponse(message="deleted")


@router.delete("/posts/{post_id}", response_model=MessageResponse)
async def delete_post(post_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    post = await session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if is_managed_post_cover_url(post.cover_url):
        delete_post_cover_file(post.cover_url)
    await session.delete(post)
    return MessageResponse(message="deleted")
