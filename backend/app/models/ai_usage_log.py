"""AI 调用审计日志（不含正文）。"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.timezone import now


class AiUsageLog(SQLModel, table=True):
    __tablename__ = "ai_usage_log"

    id: int | None = Field(default=None, primary_key=True)
    action: str = Field(max_length=32)
    provider_id: UUID | None = Field(default=None, foreign_key="ai_provider.id", ondelete="SET NULL")
    skill_id: UUID | None = Field(default=None, foreign_key="ai_skill.id", ondelete="SET NULL")
    latency_ms: int = Field(default=0)
    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    created_at: datetime | None = Field(default_factory=now, sa_type=DateTime(timezone=True))
