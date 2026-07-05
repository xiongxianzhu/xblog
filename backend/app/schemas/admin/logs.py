"""管理端日志 API 模型。"""

from __future__ import annotations

from datetime import datetime

from sqlmodel import SQLModel


class LoginLogAdmin(SQLModel):
    id: int
    user_id: int | None
    username: str
    method: str
    success: bool
    failure_reason: str | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime | None


class OperationLogAdmin(SQLModel):
    id: int
    user_id: int | None
    username: str
    action: str
    resource_type: str | None
    resource_id: str | None
    detail: str | None
    ip_address: str | None
    created_at: datetime | None


class PaginatedLoginLogs(SQLModel):
    items: list[LoginLogAdmin]
    total: int
    page: int
    page_size: int


class PaginatedOperationLogs(SQLModel):
    items: list[OperationLogAdmin]
    total: int
    page: int
    page_size: int
