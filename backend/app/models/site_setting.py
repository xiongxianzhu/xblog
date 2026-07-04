"""站点级键值配置（主题等）。"""

from __future__ import annotations

from sqlmodel import Field, SQLModel


class SiteSetting(SQLModel, table=True):
    __tablename__ = "site_settings"

    key: str = Field(primary_key=True, max_length=64)
    value: str = Field(default="", max_length=500)
