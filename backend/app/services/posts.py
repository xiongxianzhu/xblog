"""文章相关业务辅助。"""

from __future__ import annotations

import re

from fastapi import HTTPException, status
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import now
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PostAdmin, PostPublic, PostSummary, TagPublic
from app.services.markdown import render_markdown

_TAG_SLUG_RE = re.compile(r"^[\w\u4e00-\u9fff-]+$", re.UNICODE)


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
        tags=[TagPublic.model_validate(tag) for tag in tags],
    )


async def to_post_public(session: AsyncSession, post: Post) -> PostPublic:
    summary = await to_post_summary(session, post)
    return PostPublic(content_html=post.content_html, **summary.model_dump())


async def to_post_admin(session: AsyncSession, post: Post) -> PostAdmin:
    summary = await to_post_summary(session, post)
    return PostAdmin(
        content_md=post.content_md,
        status=post.status,
        created_at=post.created_at,
        updated_at=post.updated_at,
        **summary.model_dump(),
    )
