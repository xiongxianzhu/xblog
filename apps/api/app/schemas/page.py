from datetime import datetime

from sqlmodel import Field, SQLModel


class PagePublic(SQLModel):
    slug: str
    title: str
    content_html: str
    updated_at: datetime | None


class PageAdmin(SQLModel):
    slug: str
    title: str
    content_md: str
    updated_at: datetime | None


class PageUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content_md: str | None = None
