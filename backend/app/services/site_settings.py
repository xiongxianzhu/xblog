"""站点配置读写。"""

from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.site_setting import SiteSetting
from app.services.uploads import delete_site_logo_file, is_managed_site_logo_url
from app.schemas.site_theme import (
    DEFAULT_POSTS_PER_PAGE,
    DEFAULT_SITE_NAME,
    DEFAULT_SITE_TAGLINE,
    MAX_POSTS_PER_PAGE,
    MIN_POSTS_PER_PAGE,
    SiteThemePalette,
    SiteThemePublic,
    SiteThemeMode,
    SiteThemeUpdate,
)

THEME_MODE_KEY = "site.theme.mode"
THEME_PALETTE_KEY = "site.theme.palette"
SITE_NAME_KEY = "site.brand.name"
SITE_TAGLINE_KEY = "site.brand.tagline"
SITE_LOGO_URL_KEY = "site.brand.logo_url"
SITE_ICP_NUMBER_KEY = "site.brand.icp_number"
POSTS_PER_PAGE_KEY = "site.content.posts_per_page"

DEFAULT_MODE: SiteThemeMode = "light"
DEFAULT_PALETTE: SiteThemePalette = "editorial"

ALLOWED_MODES = frozenset({"light", "dark"})
ALLOWED_PALETTES = frozenset({"editorial", "forest", "slate", "ink", "graphite", "ocean", "rose"})


async def _get_value(session: AsyncSession, key: str) -> str | None:
    result = await session.exec(select(SiteSetting).where(SiteSetting.key == key))
    row = result.first()
    return row.value if row else None


async def _set_value(session: AsyncSession, key: str, value: str) -> None:
    result = await session.exec(select(SiteSetting).where(SiteSetting.key == key))
    row = result.first()
    if row is None:
        session.add(SiteSetting(key=key, value=value))
    else:
        row.value = value
    await session.flush()


def _normalize_mode(raw: str | None) -> SiteThemeMode:
    if raw in ALLOWED_MODES:
        return raw  # type: ignore[return-value]
    return DEFAULT_MODE


def _normalize_palette(raw: str | None) -> SiteThemePalette:
    if raw in ALLOWED_PALETTES:
        return raw  # type: ignore[return-value]
    return DEFAULT_PALETTE


def _normalize_posts_per_page(raw: str | None) -> int:
    if raw is None:
        return DEFAULT_POSTS_PER_PAGE
    try:
        value = int(raw.strip())
    except ValueError:
        return DEFAULT_POSTS_PER_PAGE
    return min(MAX_POSTS_PER_PAGE, max(MIN_POSTS_PER_PAGE, value))


async def get_posts_per_page(session: AsyncSession) -> int:
    return _normalize_posts_per_page(await _get_value(session, POSTS_PER_PAGE_KEY))


async def get_site_theme(session: AsyncSession) -> SiteThemePublic:
    mode = _normalize_mode(await _get_value(session, THEME_MODE_KEY))
    palette = _normalize_palette(await _get_value(session, THEME_PALETTE_KEY))
    raw_name = await _get_value(session, SITE_NAME_KEY)
    site_name = raw_name.strip() if raw_name and raw_name.strip() else DEFAULT_SITE_NAME
    raw_tagline = await _get_value(session, SITE_TAGLINE_KEY)
    site_tagline = raw_tagline.strip() if raw_tagline is not None else DEFAULT_SITE_TAGLINE
    raw_logo = await _get_value(session, SITE_LOGO_URL_KEY)
    site_logo_url = raw_logo.strip() if raw_logo and raw_logo.strip() else None
    raw_icp = await _get_value(session, SITE_ICP_NUMBER_KEY)
    site_icp_number = raw_icp.strip() if raw_icp and raw_icp.strip() else None
    posts_per_page = _normalize_posts_per_page(await _get_value(session, POSTS_PER_PAGE_KEY))
    return SiteThemePublic(
        mode=mode,
        palette=palette,
        site_name=site_name,
        site_tagline=site_tagline,
        site_logo_url=site_logo_url,
        site_icp_number=site_icp_number,
        posts_per_page=posts_per_page,
    )


async def update_site_theme(session: AsyncSession, payload: SiteThemeUpdate) -> SiteThemePublic:
    if payload.mode is not None:
        await _set_value(session, THEME_MODE_KEY, payload.mode)
    if payload.palette is not None:
        await _set_value(session, THEME_PALETTE_KEY, payload.palette)
    if payload.site_name is not None:
        await _set_value(session, SITE_NAME_KEY, payload.site_name.strip())
    if payload.site_tagline is not None:
        await _set_value(session, SITE_TAGLINE_KEY, payload.site_tagline.strip())
    if payload.site_logo_url is not None:
        current = await get_site_theme(session)
        logo = payload.site_logo_url.strip()
        if current.site_logo_url and current.site_logo_url != logo and is_managed_site_logo_url(current.site_logo_url):
            delete_site_logo_file(current.site_logo_url)
        await _set_value(session, SITE_LOGO_URL_KEY, logo)
    if payload.site_icp_number is not None:
        icp = payload.site_icp_number.strip()
        await _set_value(session, SITE_ICP_NUMBER_KEY, icp)
    if payload.posts_per_page is not None:
        await _set_value(session, POSTS_PER_PAGE_KEY, str(payload.posts_per_page))
    await session.commit()
    return await get_site_theme(session)
