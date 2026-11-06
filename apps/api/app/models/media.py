"""Persistent media library, separate from temporary editor uploads."""

from sqlalchemy import BigInteger, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class MediaGroup(SQLModel, table=True):
    __tablename__ = "media_groups"
    __table_args__ = (UniqueConstraint("kind", "name", name="uq_media_group_kind_name"),)

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(max_length=16, index=True)
    name: str = Field(max_length=80)


class MediaAsset(TimestampMixin, SQLModel, table=True):
    __tablename__ = "media_assets"

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(max_length=16, index=True)
    name: str = Field(max_length=255)
    original_name: str = Field(max_length=255)
    filename: str = Field(max_length=80, unique=True)
    mime_type: str = Field(max_length=100)
    size_bytes: int = Field(sa_type=BigInteger())
    group_id: int | None = Field(default=None, foreign_key="media_groups.id", ondelete="SET NULL", index=True)
