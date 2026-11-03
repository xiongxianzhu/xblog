"""Administrator header shortcut settings."""

from pydantic import Field, HttpUrl, field_validator
from pydantic_core import PydanticCustomError
from sqlmodel import SQLModel


class HeaderLinkSettings(SQLModel):
    enabled: bool = True
    name: str = Field(default="公开站", min_length=1, max_length=40)
    url: str = Field(default="/", min_length=1, max_length=500)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        value = value.strip()
        if value == "/":
            return value
        if not value.lower().startswith(("http://", "https://")):
            raise PydanticCustomError("header_link_url", "请输入完整的 HTTP/HTTPS 地址，或 / 表示本站首页。")
        if any(ord(char) < 32 for char in value) or "\\" in value:
            raise PydanticCustomError("header_link_url", "请输入有效的 HTTP/HTTPS 地址，或 / 表示本站首页。")
        parsed = HttpUrl(value)
        if parsed.username or parsed.password:
            raise PydanticCustomError("header_link_url", "链接不能包含账号或密码。")
        return value
