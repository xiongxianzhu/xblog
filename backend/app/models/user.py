"""管理员用户。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class User(TimestampMixin, SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=50, unique=True, index=True)
    password_hash: str = Field(max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)
    last_login_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
