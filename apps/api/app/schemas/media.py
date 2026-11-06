from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator
from sqlmodel import SQLModel

MediaKind = Literal["image", "audio", "video"]


class MediaGroupName(SQLModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class MediaGroupCreate(MediaGroupName):
    kind: MediaKind


class MediaGroupPublic(SQLModel):
    id: int
    kind: MediaKind
    name: str
    count: int


class MediaGroups(SQLModel):
    items: list[MediaGroupPublic]
    total_count: int
    ungrouped_count: int


class MediaPublic(SQLModel):
    id: int
    kind: MediaKind
    name: str
    original_name: str
    url: str
    mime_type: str
    size_bytes: int
    group_id: int | None
    created_at: datetime | None
    updated_at: datetime | None


class MediaList(SQLModel):
    items: list[MediaPublic]
    total: int
    page: int
    page_size: int


class MediaUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    group_id: int | None = Field(default=None, ge=1)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value
