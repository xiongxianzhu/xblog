"""API 公共 schema。"""

from __future__ import annotations

from sqlmodel import SQLModel


class HealthResponse(SQLModel):
    status: str


class MessageResponse(SQLModel):
    message: str
