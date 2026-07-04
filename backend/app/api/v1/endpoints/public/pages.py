"""公开固定页 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.page import Page
from app.schemas.page import PagePublic

router = APIRouter()


@router.get("/pages/{slug}", response_model=PagePublic)
async def get_page(session: SessionDep, slug: str) -> Page:
    result = await session.exec(select(Page).where(Page.slug == slug))
    page = result.first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page
