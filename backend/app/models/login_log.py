"""管理员登录审计日志。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class LoginLog(SQLModel, table=True):
    __tablename__ = "login_log"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    username: str = Field(max_length=64, index=True)
    method: str = Field(max_length=32, index=True)
    success: bool = Field(default=False, index=True)
    failure_reason: str | None = Field(default=None, max_length=64)
    ip_address: str | None = Field(default=None, max_length=45)
    user_agent: str | None = Field(default=None, max_length=500)
    created_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
