from typing import Literal

from pydantic import Field
from sqlmodel import SQLModel

SiteThemeMode = Literal["light", "dark"]
SiteThemePalette = Literal["editorial", "forest", "slate", "ink", "graphite", "ocean", "rose"]

DEFAULT_SITE_NAME = "xblog"
DEFAULT_SITE_TAGLINE = "Ink & Paper"
DEFAULT_COPYRIGHT_CONTENT = (
    "除非特别说明，任何媒体、网站或个人转载本博客的原创内容，请严格遵循 "
    "[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans) 的知识共享协议。"
)
NAV_ITEMS = ("blog", "about", "projects", "links", "search")
DEFAULT_POSTS_PER_PAGE = 10
MIN_POSTS_PER_PAGE = 5
MAX_POSTS_PER_PAGE = 50


class SiteThemePublic(SQLModel):
    mode: SiteThemeMode
    palette: SiteThemePalette
    site_name: str = DEFAULT_SITE_NAME
    site_tagline: str = DEFAULT_SITE_TAGLINE
    site_logo_url: str | None = None
    site_icp_number: str | None = None
    nav_order: list[str] = Field(default_factory=lambda: list(NAV_ITEMS))
    posts_per_page: int = DEFAULT_POSTS_PER_PAGE
    copyright_enabled: bool = False
    copyright_content: str = DEFAULT_COPYRIGHT_CONTENT


class SiteThemeUpdate(SQLModel):
    mode: SiteThemeMode | None = None
    palette: SiteThemePalette | None = None
    site_name: str | None = Field(default=None, min_length=1, max_length=100)
    site_tagline: str | None = Field(default=None, max_length=120)
    site_logo_url: str | None = Field(default=None, max_length=500)
    site_icp_number: str | None = Field(default=None, max_length=50)
    nav_order: list[str] | None = None
    posts_per_page: int | None = Field(default=None, ge=MIN_POSTS_PER_PAGE, le=MAX_POSTS_PER_PAGE)
    copyright_enabled: bool | None = None
    copyright_content: str | None = Field(default=None, max_length=500)
