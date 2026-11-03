"""管理后台操作审计日志。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class OperationLog(SQLModel, table=True):
    __tablename__ = "operation_log"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    username: str = Field(max_length=64, index=True)
    action: str = Field(max_length=64, index=True)
    resource_type: str | None = Field(default=None, max_length=32)
    resource_id: str | None = Field(default=None, max_length=64)
    detail: str | None = Field(default=None, max_length=500)
    ip_address: str | None = Field(default=None, max_length=45)
    created_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
