"""访问统计。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class PageView(SQLModel, table=True):
    __tablename__ = "page_views"

    id: int | None = Field(default=None, primary_key=True)
    path: str = Field(max_length=500, index=True)
    referrer: str | None = Field(default=None, max_length=500)
    visited_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True), index=True)
