"""站点配置读写。"""

from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.site_setting import SiteSetting
from app.schemas.site_theme import SiteThemePalette, SiteThemePublic, SiteThemeMode, SiteThemeUpdate

THEME_MODE_KEY = "site.theme.mode"
THEME_PALETTE_KEY = "site.theme.palette"

DEFAULT_MODE: SiteThemeMode = "light"
DEFAULT_PALETTE: SiteThemePalette = "editorial"

ALLOWED_MODES = frozenset({"light", "dark"})
ALLOWED_PALETTES = frozenset({"editorial", "forest", "slate", "ink"})


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


async def get_site_theme(session: AsyncSession) -> SiteThemePublic:
    mode = _normalize_mode(await _get_value(session, THEME_MODE_KEY))
    palette = _normalize_palette(await _get_value(session, THEME_PALETTE_KEY))
    return SiteThemePublic(mode=mode, palette=palette)


async def update_site_theme(session: AsyncSession, payload: SiteThemeUpdate) -> SiteThemePublic:
    if payload.mode is not None:
        await _set_value(session, THEME_MODE_KEY, payload.mode)
    if payload.palette is not None:
        await _set_value(session, THEME_PALETTE_KEY, payload.palette)
    await session.commit()
    return await get_site_theme(session)
