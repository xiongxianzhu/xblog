"""管理端文章 API。"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.post import Post
from app.schemas.common import MessageResponse
from app.schemas.post import PaginatedPostAdmins, PostAdmin, PostCoverUploadResponse, PostCreate, PostStats, PostUpdate
from app.services.posts import (
    apply_markdown,
    apply_pin_state,
    apply_publish_state,
    normalize_cover_url,
    sync_tags,
    to_post_admin,
    validate_status,
)
from app.services.revalidate import trigger_revalidate
from app.services.uploads import delete_post_cover_file, is_managed_post_cover_url, save_post_cover

router = APIRouter()


def _apply_post_search(stmt, q: str | None):
    if not q or not q.strip():
        return stmt
    term = f"%{q.strip()}%"
    return stmt.where(
        or_(
            Post.title.ilike(term),
            Post.slug.ilike(term),
            Post.excerpt.ilike(term),
        )
    )


@router.get("/posts", response_model=PaginatedPostAdmins)
async def list_posts(
    session: SessionDep,
    _: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=200),
) -> PaginatedPostAdmins:
    count_stmt = _apply_post_search(select(func.count()).select_from(Post), q)
    total = int((await session.exec(count_stmt)).one())
    offset = (page - 1) * page_size
    stmt = _apply_post_search(select(Post), q).order_by(
        Post.is_pinned.desc(),
        Post.updated_at.desc(),
        Post.id.desc(),
    ).offset(offset).limit(page_size)
    result = await session.exec(stmt)
    posts = list(result.all())
    return PaginatedPostAdmins(
        items=[await to_post_admin(session, post) for post in posts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/posts/stats", response_model=PostStats)
async def post_stats(session: SessionDep, _: CurrentUserDep) -> PostStats:
    total = int((await session.exec(select(func.count()).select_from(Post))).one())
    published = int(
        (await session.exec(select(func.count()).select_from(Post).where(Post.status == "published"))).one()
    )
    draft = int((await session.exec(select(func.count()).select_from(Post).where(Post.status == "draft"))).one())
    return PostStats(total=total, published=published, draft=draft)


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
    if payload.is_pinned:
        apply_pin_state(post, True)
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
    if payload.is_pinned is not None:
        apply_pin_state(post, payload.is_pinned)
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
