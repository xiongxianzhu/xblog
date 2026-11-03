"""博客文章与标签关联。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now
from app.models.base import TimestampMixin


class PostTag(SQLModel, table=True):
    __tablename__ = "post_tags"

    post_id: int | None = Field(default=None, foreign_key="posts.id", primary_key=True)
    tag_id: int | None = Field(default=None, foreign_key="tags.id", primary_key=True)


class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True)
    slug: str = Field(max_length=50, unique=True, index=True)


class Post(TimestampMixin, SQLModel, table=True):
    __tablename__ = "posts"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    slug: str = Field(max_length=200, unique=True, index=True)
    content_md: str = Field(default="")
    content_html: str = Field(default="")
    excerpt: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    status: str = Field(default="draft", max_length=20, index=True)
    published_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    is_pinned: bool = Field(default=False, index=True)
    pinned_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    def touch_updated(self) -> None:
        self.updated_at = now()
