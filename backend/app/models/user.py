"""管理员用户。"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class User(TimestampMixin, SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=50, unique=True, index=True)
    nickname: str | None = Field(default=None, max_length=50)
    password_hash: str = Field(max_length=255)
    email: str | None = Field(default=None, max_length=255, unique=True, index=True)
    phone: str | None = Field(default=None, max_length=20, unique=True, index=True)
    birth_date: date | None = Field(default=None, sa_type=Date())
    gender: str | None = Field(default=None, max_length=20)
    github_id: str | None = Field(default=None, max_length=64, unique=True, index=True)
    wechat_openid: str | None = Field(default=None, max_length=128, unique=True, index=True)
    avatar_url: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True, index=True)
    last_login_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
