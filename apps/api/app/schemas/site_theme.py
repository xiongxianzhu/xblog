from typing import Literal

from pydantic import Field, HttpUrl, field_validator
from pydantic_core import PydanticCustomError
from sqlmodel import SQLModel

SiteThemeMode = Literal["light", "dark"]
SiteThemePalette = Literal["editorial", "forest", "slate", "ink", "graphite", "ocean", "rose"]

DEFAULT_SITE_NAME = "xblog"
DEFAULT_SITE_TAGLINE = "Ink & Paper"
DEFAULT_COPYRIGHT_CONTENT = (
    "除非特别说明，任何媒体、网站或个人转载本博客的原创内容，请严格遵循 "
    "[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans) 的知识共享协议。"
)
NAV_ITEMS = ("blog", "tags", "about", "projects", "links", "search")
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
    site_base_url: str = ""
    github_link_enabled: bool = False
    github_link_url: str = ""
    article_share_enabled: bool = False
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
    site_base_url: str | None = Field(default=None, max_length=500)
    github_link_enabled: bool | None = None
    github_link_url: str | None = Field(default=None, max_length=500)
    article_share_enabled: bool | None = None
    copyright_enabled: bool | None = None
    copyright_content: str | None = Field(default=None, max_length=500)

    @field_validator("github_link_url", "site_base_url")
    @classmethod
    def validate_http_link(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return ""
        if not value.lower().startswith(("https://", "http://")) or "\\" in value:
            raise PydanticCustomError("github_link_url", "请输入完整的 HTTP/HTTPS 链接。")
        if any(ord(char) < 32 for char in value):
            raise PydanticCustomError("github_link_url", "链接不能包含控制字符。")
        parsed = HttpUrl(value)
        if parsed.username or parsed.password:
            raise PydanticCustomError("github_link_url", "链接不能包含账号或密码。")
        return str(parsed)

    @field_validator("site_base_url")
    @classmethod
    def validate_site_base_url(cls, value: str | None) -> str | None:
        if value and (HttpUrl(value).query is not None or HttpUrl(value).fragment is not None):
            raise PydanticCustomError("site_base_url", "公开站基础地址不能包含查询参数或锚点。")
        return value.rstrip("/") if value else value
