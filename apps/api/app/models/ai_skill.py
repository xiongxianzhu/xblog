"""Agent Skill 元数据表。"""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class AiSkill(TimestampMixin, SQLModel, table=True):
    __tablename__ = "ai_skill"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=64, unique=True, index=True)
    description: str = Field(max_length=1024)
    storage_path: str = Field(max_length=512)
    enabled: bool = Field(default=True)


class AiSkillDefault(SQLModel, table=True):
    __tablename__ = "ai_skill_default"

    scene: str = Field(primary_key=True, max_length=32)
    skill_id: UUID | None = Field(default=None, foreign_key="ai_skill.id", ondelete="SET NULL")
    builtin_skill_name: str | None = Field(default=None, max_length=64)
