"""Markdown import results and portable article metadata."""

from datetime import datetime
from typing import Literal

from pydantic import Field, StrictBool
from sqlmodel import SQLModel

from app.schemas.post import PostCreate


class MarkdownPostMetadata(PostCreate):
    status: Literal["draft", "published"] = "draft"
    is_pinned: StrictBool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None
    pinned_at: datetime | None = None
    tag_slugs: list[str] = Field(default_factory=list, max_length=10)


class PostImportResult(SQLModel):
    filename: str
    status: Literal["imported", "skipped", "failed"]
    message: str
    post_id: int | None = None


class PostImportReport(SQLModel):
    imported: int
    skipped: int
    failed: int
    results: list[PostImportResult]
