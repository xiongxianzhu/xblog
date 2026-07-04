"""SQLModel 公共 mixin 与基类约定。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class TimestampMixin(SQLModel):
    """公共时间戳字段（供 `table=True` 模型继承）。"""

    created_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
