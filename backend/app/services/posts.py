"""文章相关业务辅助。"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import Integer, and_, cast, func, or_
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import now
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PostAdmin, PostNeighbor, PostPublic, PostSummary, TagPublic
from app.services.markdown import render_markdown

_TAG_SLUG_RE = re.compile(r"^[\w\u4e00-\u9fff-]+$", re.UNICODE)
_SORT_MIN_DT = datetime(1970, 1, 1, tzinfo=timezone.utc)

PUBLIC_POST_LIST_ORDER = (
    Post.is_pinned.desc(),
    Post.pinned_at.desc(),
    Post.published_at.desc(),
    Post.id.desc(),
)

PUBLIC_POST_LIST_ORDER_ASC = (
    Post.is_pinned.asc(),
    Post.pinned_at.asc(),
    Post.published_at.asc(),
    Post.id.asc(),
)


def normalize_tag_slug(raw: str) -> str:
    slug = raw.strip().lower()
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty tag")
    if len(slug) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag too long")
    if not _TAG_SLUG_RE.fullmatch(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tag: use letters, numbers, hyphens or CJK characters",
        )
    return slug


def slugify_tag_label(raw: str) -> str:
    slug = raw.strip().lower()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return normalize_tag_slug(slug)


def tag_name_from_slug(slug: str) -> str:
    name = slug.replace("-", " ").strip()
    return name[:50] if name else slug


async def resolve_tag(session: AsyncSession, raw: str) -> Tag:
    label = raw.strip()
    if not label:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty tag")
    if len(label) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag too long")

    by_name = await session.exec(select(Tag).where(Tag.name == label))
    existing = by_name.first()
    if existing is not None:
        return existing

    slug = slugify_tag_label(label)
    by_slug = await session.exec(select(Tag).where(Tag.slug == slug))
    existing = by_slug.first()
    if existing is not None:
        return existing

    tag = Tag(name=label, slug=slug)
    session.add(tag)
    await session.flush()
    await session.refresh(tag)
    return tag


async def get_or_create_tag(session: AsyncSession, raw_slug: str) -> Tag:
    """兼容旧 slug 输入；新代码请用 resolve_tag。"""
    return await resolve_tag(session, raw_slug)


async def load_tags(session: AsyncSession, post_id: int) -> list[Tag]:
    stmt = select(Tag).join(PostTag, PostTag.tag_id == Tag.id).where(PostTag.post_id == post_id)
    result = await session.exec(stmt)
    return list(result.all())

async def sync_tags(session: AsyncSession, post_id: int, tag_slugs: list[str]) -> None:
    await session.exec(delete(PostTag).where(PostTag.post_id == post_id))
    if not tag_slugs:
        return

    unique_labels: list[str] = []
    seen: set[str] = set()
    for raw in tag_slugs:
        label = raw.strip()
        if not label:
            continue
        key = label.casefold()
        if key not in seen:
            seen.add(key)
            unique_labels.append(label)

    for label in unique_labels:
        tag = await resolve_tag(session, label)
        session.add(PostTag(post_id=post_id, tag_id=tag.id or 0))

def apply_publish_state(post: Post, status_value: str) -> None:
    post.status = status_value
    if status_value == "published" and post.published_at is None:
        post.published_at = now()
    if status_value != "published" and post.is_pinned:
        apply_pin_state(post, False)


def apply_pin_state(post: Post, is_pinned: bool) -> None:
    post.is_pinned = is_pinned
    post.pinned_at = now() if is_pinned else None


def apply_markdown(post: Post, content_md: str) -> None:
    post.content_md = content_md
    post.content_html = render_markdown(content_md)


def validate_status(status_value: str) -> None:
    if status_value not in {"draft", "published"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")


def normalize_cover_url(cover_url: str | None) -> str | None:
    if cover_url is None:
        return None
    trimmed = cover_url.strip()
    return trimmed or None


async def to_post_summary(session: AsyncSession, post: Post) -> PostSummary:
    tags = await load_tags(session, post.id or 0)
    return PostSummary(
        id=post.id or 0,
        title=post.title,
        slug=post.slug,
        excerpt=post.excerpt,
        cover_url=post.cover_url,
        published_at=post.published_at,
        is_pinned=post.is_pinned,
        tags=[TagPublic.model_validate(tag) for tag in tags],
    )


async def to_post_public(session: AsyncSession, post: Post) -> PostPublic:
    summary = await to_post_summary(session, post)
    previous_post, next_post = await get_post_neighbors(session, post)
    return PostPublic(
        content_html=post.content_html,
        previous_post=previous_post,
        next_post=next_post,
        **summary.model_dump(),
    )


def _post_sort_floor(post: Post) -> tuple[bool, datetime, datetime, int]:
    return (
        post.is_pinned,
        post.pinned_at or _SORT_MIN_DT,
        post.published_at or _SORT_MIN_DT,
        post.id or 0,
    )


def _post_sort_exprs() -> tuple:
    return (
        cast(Post.is_pinned, Integer),
        func.coalesce(Post.pinned_at, _SORT_MIN_DT),
        func.coalesce(Post.published_at, _SORT_MIN_DT),
        Post.id,
    )


def _post_sorts_higher_than(post: Post):
    pin, pinned_at, published_at, post_id = _post_sort_floor(post)
    pin_expr, pinned_expr, published_expr, id_expr = _post_sort_exprs()
    return or_(
        pin_expr > int(pin),
        and_(pin_expr == int(pin), pinned_expr > pinned_at),
        and_(pin_expr == int(pin), pinned_expr == pinned_at, published_expr > published_at),
        and_(pin_expr == int(pin), pinned_expr == pinned_at, published_expr == published_at, id_expr > post_id),
    )


def _post_sorts_lower_than(post: Post):
    pin, pinned_at, published_at, post_id = _post_sort_floor(post)
    pin_expr, pinned_expr, published_expr, id_expr = _post_sort_exprs()
    return or_(
        pin_expr < int(pin),
        and_(pin_expr == int(pin), pinned_expr < pinned_at),
        and_(pin_expr == int(pin), pinned_expr == pinned_at, published_expr < published_at),
        and_(pin_expr == int(pin), pinned_expr == pinned_at, published_expr == published_at, id_expr < post_id),
    )


def _to_post_neighbor(post: Post) -> PostNeighbor:
    return PostNeighbor(title=post.title, slug=post.slug, published_at=post.published_at)


async def get_post_neighbors(
    session: AsyncSession,
    post: Post,
) -> tuple[PostNeighbor | None, PostNeighbor | None]:
    """按公开列表排序返回上一篇（列表更靠前/更新）与下一篇（列表更靠后/更旧）。"""
    newer_stmt = (
        select(Post)
        .where(Post.status == "published", _post_sorts_higher_than(post))
        .order_by(*PUBLIC_POST_LIST_ORDER_ASC)
        .limit(1)
    )
    older_stmt = (
        select(Post)
        .where(Post.status == "published", _post_sorts_lower_than(post))
        .order_by(*PUBLIC_POST_LIST_ORDER)
        .limit(1)
    )

    newer_result = await session.exec(newer_stmt)
    older_result = await session.exec(older_stmt)
    newer_post = newer_result.first()
    older_post = older_result.first()

    return (
        _to_post_neighbor(newer_post) if newer_post is not None else None,
        _to_post_neighbor(older_post) if older_post is not None else None,
    )


async def to_post_admin(session: AsyncSession, post: Post) -> PostAdmin:
    summary = await to_post_summary(session, post)
    return PostAdmin(
        content_md=post.content_md,
        status=post.status,
        created_at=post.created_at,
        updated_at=post.updated_at,
        **summary.model_dump(),
    )
