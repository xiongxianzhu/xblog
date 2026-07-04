"""文章相关业务辅助。"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import now
from app.models.post import Post, PostTag, Tag
from app.schemas.post import PostAdmin, PostPublic, PostSummary, TagPublic
from app.services.markdown import render_markdown


async def load_tags(session: AsyncSession, post_id: int) -> list[Tag]:
    stmt = select(Tag).join(PostTag, PostTag.tag_id == Tag.id).where(PostTag.post_id == post_id)
    result = await session.exec(stmt)
    return list(result.all())


async def sync_tags(session: AsyncSession, post_id: int, tag_slugs: list[str]) -> None:
    await session.exec(delete(PostTag).where(PostTag.post_id == post_id))
    if not tag_slugs:
        return
    result = await session.exec(select(Tag).where(Tag.slug.in_(tag_slugs)))
    tags = list(result.all())
    if len(tags) != len(set(tag_slugs)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown tag slug")
    for tag in tags:
        session.add(PostTag(post_id=post_id, tag_id=tag.id))


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
