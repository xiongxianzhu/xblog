"""固定页面。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class Page(SQLModel, table=True):
    __tablename__ = "pages"

    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(max_length=50, unique=True, index=True)
    title: str = Field(max_length=200)
    content_md: str = Field(default="")
    content_html: str = Field(default="")
    updated_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
