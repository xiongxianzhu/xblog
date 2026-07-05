"""登录与操作审计日志。"""

from __future__ import annotations

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.login_log import LoginLog
from app.models.operation_log import OperationLog
from app.models.user import User


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45] or None
    if request.client:
        return request.client.host[:45]
    return None


def client_user_agent(request: Request | None) -> str | None:
    if request is None:
        return None
    value = request.headers.get("user-agent")
    return value[:500] if value else None


async def record_login(
    session: AsyncSession,
    *,
    request: Request | None,
    username: str,
    method: str,
    success: bool,
    user: User | None = None,
    failure_reason: str | None = None,
) -> None:
    session.add(
        LoginLog(
            user_id=user.id if user else None,
            username=username,
            method=method,
            success=success,
            failure_reason=failure_reason,
            ip_address=client_ip(request),
            user_agent=client_user_agent(request),
        )
    )


async def record_operation(
    session: AsyncSession,
    *,
    request: Request | None,
    actor: User,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: str | None = None,
) -> None:
    session.add(
        OperationLog(
            user_id=actor.id,
            username=actor.username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            ip_address=client_ip(request),
        )
    )


async def list_login_logs(session: AsyncSession, *, limit: int = 200) -> list[LoginLog]:
    result = await session.exec(select(LoginLog).order_by(LoginLog.created_at.desc()).limit(limit))
    return list(result.all())


async def list_operation_logs(session: AsyncSession, *, limit: int = 200) -> list[OperationLog]:
    result = await session.exec(select(OperationLog).order_by(OperationLog.created_at.desc()).limit(limit))
    return list(result.all())
