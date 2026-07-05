"""管理端审计日志 API。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.models.login_log import LoginLog
from app.models.operation_log import OperationLog
from app.schemas.admin.logs import LoginLogAdmin, OperationLogAdmin
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


@router.get("/logs/login", response_model=list[LoginLogAdmin])
async def list_login_logs(session: SessionDep, _: CurrentUserDep) -> list[LoginLogAdmin]:
    rows = await audit_logs.list_login_logs(session)
    return [_login_log_to_admin(row) for row in rows]


@router.get("/logs/operations", response_model=list[OperationLogAdmin])
async def list_operation_logs(session: SessionDep, _: CurrentUserDep) -> list[OperationLogAdmin]:
    rows = await audit_logs.list_operation_logs(session)
    return [_operation_log_to_admin(row) for row in rows]
