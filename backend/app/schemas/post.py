from datetime import datetime

from sqlmodel import Field, SQLModel


class TagPublic(SQLModel):
    id: int
    name: str
    slug: str


class PostSummary(SQLModel):
    id: int
    title: str
    slug: str
    excerpt: str | None
    cover_url: str | None
    published_at: datetime | None
    tags: list[TagPublic] = []


class PostPublic(PostSummary):
    content_html: str


class PostCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200)
    content_md: str = ""
    excerpt: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    status: str = Field(default="draft")
    tag_slugs: list[str] = []


class PostUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=200)
    content_md: str | None = None
    excerpt: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    status: str | None = None
    tag_slugs: list[str] | None = None


class PostAdmin(PostSummary):
    content_md: str
    status: str
    created_at: datetime | None
    updated_at: datetime | None
