from typing import Literal

from pydantic import Field
from sqlmodel import SQLModel

SiteThemeMode = Literal["light", "dark"]
SiteThemePalette = Literal["editorial", "forest", "slate", "ink", "graphite", "ocean", "rose"]

DEFAULT_SITE_NAME = "xblog"
DEFAULT_SITE_TAGLINE = "Ink & Paper"


class SiteThemePublic(SQLModel):
    mode: SiteThemeMode
    palette: SiteThemePalette
    site_name: str = DEFAULT_SITE_NAME
    site_tagline: str = DEFAULT_SITE_TAGLINE
    site_logo_url: str | None = None
    site_icp_number: str | None = None


class SiteThemeUpdate(SQLModel):
    mode: SiteThemeMode | None = None
    palette: SiteThemePalette | None = None
    site_name: str | None = Field(default=None, min_length=1, max_length=100)
    site_tagline: str | None = Field(default=None, max_length=120)
    site_logo_url: str | None = Field(default=None, max_length=500)
    site_icp_number: str | None = Field(default=None, max_length=50)
