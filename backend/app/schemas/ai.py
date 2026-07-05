"""AI 模块 API schema。"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field, field_validator
from sqlmodel import SQLModel

from app.models.ai_provider import AiProviderType


class AiCompleteAction(StrEnum):
    POLISH = "polish"
    EXPAND = "expand"
    SHORTEN = "shorten"
    TITLE = "title"
    CHAT = "chat"
    GENERATE = "generate"


P1_ACTIONS = frozenset(
    {
        AiCompleteAction.POLISH,
        AiCompleteAction.EXPAND,
        AiCompleteAction.SHORTEN,
        AiCompleteAction.TITLE,
    }
)

P2_ACTIONS = P1_ACTIONS | {AiCompleteAction.CHAT}

P3_ACTIONS = P2_ACTIONS | {AiCompleteAction.GENERATE}

ALLOWED_ACTIONS = P3_ACTIONS


class AiProviderCreate(SQLModel):
    name: str = Field(min_length=1, max_length=128)
    provider_type: AiProviderType = AiProviderType.OPENAI_COMPATIBLE
    base_url: str = Field(min_length=1, max_length=512)
    model: str = Field(min_length=1, max_length=128)
    api_key: str | None = Field(default=None, max_length=512)
    enabled: bool = False
    is_default: bool = False
    extra_headers: dict[str, str] | None = None


class AiProviderUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=128)
    provider_type: AiProviderType | None = None
    base_url: str | None = Field(default=None, max_length=512)
    model: str | None = Field(default=None, max_length=128)
    api_key: str | None = Field(default=None, max_length=512)
    enabled: bool | None = None
    is_default: bool | None = None
    extra_headers: dict[str, str] | None = None


class AiProviderPublic(SQLModel):
    id: UUID
    name: str
    provider_type: str
    base_url: str
    model: str
    has_api_key: bool
    enabled: bool
    is_default: bool
    extra_headers: dict[str, str] | None
    created_at: datetime | None
    updated_at: datetime | None


class AiProviderTestResult(SQLModel):
    ok: bool
    latency_ms: int
    message: str


class AiSkillCreate(SQLModel):
    name: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1, max_length=1024)
    enabled: bool = True


class AiSkillUpdate(SQLModel):
    description: str | None = Field(default=None, max_length=1024)
    enabled: bool | None = None


class AiSkillPublic(SQLModel):
    id: UUID
    name: str
    description: str
    enabled: bool
    is_builtin: bool = False
    created_at: datetime | None
    updated_at: datetime | None


class AiSkillContent(SQLModel):
    content: str


class AiSkillDefaults(SQLModel):
    polish: UUID | None = None
    chat: UUID | None = None
    generate: UUID | None = None


class AiSkillDefaultsUpdate(SQLModel):
    polish: UUID | None = None
    chat: UUID | None = None
    generate: UUID | None = None


class AiCompleteMessage(SQLModel):
    role: str
    content: str


class AiCompleteSelection(SQLModel):
    text: str = ""


class AiCompleteDocument(SQLModel):
    title: str = ""
    content_md: str = ""


class AiCompleteGenerate(SQLModel):
    topic: str = ""
    outline: str = ""


class AiCompleteRequest(SQLModel):
    action: AiCompleteAction
    provider_id: UUID | None = None
    skill_id: UUID | None = None
    skill_ids: list[UUID] = Field(default_factory=list)
    messages: list[AiCompleteMessage] = Field(default_factory=list)
    selection: AiCompleteSelection | None = None
    document: AiCompleteDocument | None = None
    generate: AiCompleteGenerate | None = None

    @field_validator("messages", mode="before")
    @classmethod
    def default_messages(cls, value: list[AiCompleteMessage] | None) -> list[AiCompleteMessage]:
        return value or []

    @field_validator("skill_ids", mode="before")
    @classmethod
    def default_skill_ids(cls, value: list[UUID] | None) -> list[UUID]:
        return value or []

    @field_validator("skill_ids")
    @classmethod
    def limit_skill_ids(cls, value: list[UUID]) -> list[UUID]:
        if len(value) > 5:
            raise ValueError("单次最多选择 5 个 Skill")
        return value


class AiUsageStats(SQLModel):
    enabled_providers: int
    enabled_skills: int


class AiSkillRecommend(SQLModel):
    skill_id: UUID | None = None
    skill_name: str | None = None
