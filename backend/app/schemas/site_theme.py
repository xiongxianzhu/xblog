from typing import Literal

from sqlmodel import SQLModel

SiteThemeMode = Literal["light", "dark"]
SiteThemePalette = Literal["editorial", "forest", "slate", "ink"]


class SiteThemePublic(SQLModel):
    mode: SiteThemeMode
    palette: SiteThemePalette


class SiteThemeUpdate(SQLModel):
    mode: SiteThemeMode | None = None
    palette: SiteThemePalette | None = None
