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
    is_pinned: bool = False
    tags: list[TagPublic] = []


class PostNeighbor(SQLModel):
    title: str
    slug: str
    published_at: datetime | None


class PaginatedPostSummaries(SQLModel):
    items: list[PostSummary]
    total: int
    page: int
    page_size: int


class PostPublic(PostSummary):
    content_html: str
    previous_post: PostNeighbor | None = None
    next_post: PostNeighbor | None = None


class PostCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200)
    content_md: str = ""
    excerpt: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    status: str = Field(default="draft")
    tag_slugs: list[str] = []
    is_pinned: bool = False


class PostUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=200)
    content_md: str | None = None
    excerpt: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    status: str | None = None
    tag_slugs: list[str] | None = None
    is_pinned: bool | None = None


class PostAdmin(PostSummary):
    content_md: str
    status: str
    created_at: datetime | None
    updated_at: datetime | None


class PaginatedPostAdmins(SQLModel):
    items: list[PostAdmin]
    total: int
    page: int
    page_size: int


class PostStats(SQLModel):
    total: int
    published: int
    draft: int


class PostCoverUploadResponse(SQLModel):
    cover_url: str
