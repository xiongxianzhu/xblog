"""管理端固定页 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.timezone import now
from app.models.page import Page
from app.schemas.page import PageAdmin, PageUpdate
from app.services.markdown import render_markdown

router = APIRouter()


@router.get("/pages/{slug}", response_model=PageAdmin)
async def get_page(session: SessionDep, slug: str, _: CurrentUserDep) -> Page:
    result = await session.exec(select(Page).where(Page.slug == slug))
    page = result.first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.patch("/pages/{slug}", response_model=PageAdmin)
async def update_page(
    slug: str,
    payload: PageUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> Page:
    result = await session.exec(select(Page).where(Page.slug == slug))
    page = result.first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    if payload.title is not None:
        page.title = payload.title
    if payload.content_md is not None:
        page.content_md = payload.content_md
        page.content_html = render_markdown(payload.content_md)
    page.updated_at = now()
    await session.flush()
    await session.refresh(page)
    from app.services.revalidate import trigger_revalidate

    await trigger_revalidate([f"/{slug}"])
    return page
