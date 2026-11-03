"""AI 模型提供商表。"""

from __future__ import annotations

from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON, Text
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class AiProviderType(StrEnum):
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    ZHIPU = "zhipu"
    GLM_CODING = "glm_coding"
    MINIMAX = "minimax"
    ANTHROPIC = "anthropic"
    OPENAI_COMPATIBLE = "openai_compatible"


class AiProvider(TimestampMixin, SQLModel, table=True):
    __tablename__ = "ai_provider"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=128)
    provider_type: str = Field(max_length=32, default=AiProviderType.OPENAI_COMPATIBLE)
    base_url: str = Field(max_length=512)
    model: str = Field(max_length=128)
    api_key_encrypted: str | None = Field(default=None, sa_type=Text)
    enabled: bool = Field(default=False)
    is_default: bool = Field(default=False)
    extra_headers: dict[str, str] | None = Field(default=None, sa_type=JSON)
