"""公开站点主题配置。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.schemas.site_theme import SiteThemePublic
from app.services.site_settings import get_site_theme

router = APIRouter()


@router.get("/site-theme", response_model=SiteThemePublic)
async def read_site_theme(session: SessionDep) -> SiteThemePublic:
    return await get_site_theme(session)
