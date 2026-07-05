"""友链。"""

from __future__ import annotations

from sqlmodel import Field, SQLModel


class FriendLink(SQLModel, table=True):
    __tablename__ = "friend_links"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    url: str = Field(max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=500)
    sort_order: int = Field(default=0)
