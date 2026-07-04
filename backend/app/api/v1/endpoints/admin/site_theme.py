"""管理端站点主题配置。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.site_theme import SiteThemePublic, SiteThemeUpdate
from app.services.revalidate import trigger_revalidate
from app.services.site_settings import get_site_theme, update_site_theme

router = APIRouter()

PUBLIC_PATHS = ["/", "/blog", "/about", "/projects", "/links", "/search"]


@router.get("/site-theme", response_model=SiteThemePublic)
async def read_site_theme(session: SessionDep, _: CurrentUserDep) -> SiteThemePublic:
    return await get_site_theme(session)


@router.patch("/site-theme", response_model=SiteThemePublic)
async def patch_site_theme(
    payload: SiteThemeUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> SiteThemePublic:
    theme = await update_site_theme(session, payload)
    await trigger_revalidate(PUBLIC_PATHS, layout=True)
    return theme
