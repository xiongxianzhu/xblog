"""管理端审计日志 API。"""

from __future__ import annotations

from fastapi import APIRouter, Query

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
) -> PaginatedLoginLogs:
    rows, total = await audit_logs.list_login_logs(session, page=page, page_size=page_size)
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
) -> PaginatedOperationLogs:
    rows, total = await audit_logs.list_operation_logs(session, page=page, page_size=page_size)
    return PaginatedOperationLogs(
        items=[_operation_log_to_admin(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
