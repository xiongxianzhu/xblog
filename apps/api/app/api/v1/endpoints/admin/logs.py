"""管理端审计日志 API。"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.models.login_log import LoginLog
from app.models.operation_log import OperationLog
from app.schemas.admin.logs import (
    LoginLogAdmin,
    OperationLogAdmin,
    PaginatedLoginLogs,
    PaginatedOperationLogs,
)
from app.services import audit_logs

router = APIRouter()


@router.get("/logs/login/{log_id}", response_model=LoginLogAdmin)
async def get_login_log(log_id: int, session: SessionDep, _: CurrentUserDep) -> LoginLogAdmin:
    row = await session.get(LoginLog, log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="登录日志不存在")
    return _login_log_to_admin(row)


@router.get("/logs/operations/{log_id}", response_model=OperationLogAdmin)
async def get_operation_log(log_id: int, session: SessionDep, _: CurrentUserDep) -> OperationLogAdmin:
    row = await session.get(OperationLog, log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="操作日志不存在")
    return _operation_log_to_admin(row)


def _login_log_to_admin(row: LoginLog) -> LoginLogAdmin:
    assert row.id is not None
    return LoginLogAdmin(
        id=row.id,
        user_id=row.user_id,
        username=row.username,
        method=row.method,
        success=row.success,
        failure_reason=row.failure_reason,
        ip_address=row.ip_address,
        user_agent=row.user_agent,
        created_at=row.created_at,
    )


def _operation_log_to_admin(row: OperationLog) -> OperationLogAdmin:
    assert row.id is not None
    return OperationLogAdmin(
        id=row.id,
        user_id=row.user_id,
        username=row.username,
        action=row.action,
        resource_type=row.resource_type,
        resource_id=row.resource_id,
        detail=row.detail,
        ip_address=row.ip_address,
        created_at=row.created_at,
    )


@router.get("/logs/login", response_model=PaginatedLoginLogs)
async def list_login_logs(
    session: SessionDep,
    _: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    success: bool | None = None,
    method: str | None = Query(default=None, max_length=32),
    failure_reason: str | None = Query(default=None, max_length=64),
    q: str | None = Query(default=None, max_length=200),
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> PaginatedLoginLogs:
    rows, total = await audit_logs.list_login_logs(
        session,
        q=q,
        start_at=start_at,
        end_at=end_at,
        page=page,
        page_size=page_size,
        success=success,
        method=method,
        failure_reason=failure_reason,
    )
    return PaginatedLoginLogs(
        items=[_login_log_to_admin(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/logs/operations", response_model=PaginatedOperationLogs)
async def list_operation_logs(
    session: SessionDep,
    _: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    action: str | None = Query(default=None, max_length=64),
    resource_type: str | None = Query(default=None, max_length=32),
    q: str | None = Query(default=None, max_length=200),
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> PaginatedOperationLogs:
    rows, total = await audit_logs.list_operation_logs(
        session,
        q=q,
        start_at=start_at,
        end_at=end_at,
        page=page,
        page_size=page_size,
        action=action,
        resource_type=resource_type,
    )
    return PaginatedOperationLogs(
        items=[_operation_log_to_admin(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
