"""管理端站点主题配置。"""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.site_theme import SiteThemePublic, SiteThemeUpdate
from app.services.revalidate import trigger_revalidate
from app.services.site_settings import get_site_theme, update_site_theme
from app.services.uploads import delete_site_logo_file, is_managed_site_logo_url, save_site_logo

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


@router.post("/site-theme/logo", response_model=SiteThemePublic)
async def upload_site_theme_logo(
    session: SessionDep,
    _: CurrentUserDep,
    file: UploadFile = File(...),  # noqa: B008
) -> SiteThemePublic:
    current = await get_site_theme(session)
    if current.site_logo_url and is_managed_site_logo_url(current.site_logo_url):
        delete_site_logo_file(current.site_logo_url)
    logo_url = await save_site_logo(file)
    theme = await update_site_theme(session, SiteThemeUpdate(site_logo_url=logo_url))
    await trigger_revalidate(PUBLIC_PATHS, layout=True)
    return theme


@router.delete("/site-theme/logo", response_model=SiteThemePublic)
async def delete_site_theme_logo(session: SessionDep, _: CurrentUserDep) -> SiteThemePublic:
    current = await get_site_theme(session)
    if current.site_logo_url and is_managed_site_logo_url(current.site_logo_url):
        delete_site_logo_file(current.site_logo_url)
    theme = await update_site_theme(session, SiteThemeUpdate(site_logo_url=""))
    await trigger_revalidate(PUBLIC_PATHS, layout=True)
    return theme
