"""登录与操作审计日志。"""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, Request
from sqlalchemy import func, or_
from sqlalchemy.sql.elements import ColumnElement
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import CHINA_TZ
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


def _normalize_log_time_range(
    start_at: datetime | None, end_at: datetime | None
) -> tuple[datetime | None, datetime | None]:
    start = start_at.replace(tzinfo=CHINA_TZ) if start_at is not None and start_at.tzinfo is None else start_at
    end = end_at.replace(tzinfo=CHINA_TZ) if end_at is not None and end_at.tzinfo is None else end_at
    if start is not None and end is not None and start > end:
        raise HTTPException(status_code=422, detail="开始时间不能晚于结束时间")
    return start, end


async def list_login_logs(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    success: bool | None = None,
    method: str | None = None,
    failure_reason: str | None = None,
    q: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> tuple[list[LoginLog], int]:
    offset = (page - 1) * page_size
    conditions: list[ColumnElement[bool]] = []
    start_at, end_at = _normalize_log_time_range(start_at, end_at)
    if start_at is not None:
        conditions.append(col(LoginLog.created_at) >= start_at)
    if end_at is not None:
        conditions.append(col(LoginLog.created_at) <= end_at)
    if q and q.strip():
        term = "%" + q.strip().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"
        conditions.append(
            or_(
                col(LoginLog.username).ilike(term, escape="!"),
                col(LoginLog.ip_address).ilike(term, escape="!"),
                col(LoginLog.user_agent).ilike(term, escape="!"),
                col(LoginLog.method).ilike(term, escape="!"),
                col(LoginLog.failure_reason).ilike(term, escape="!"),
            )
        )

    if success is not None:
        conditions.append(col(LoginLog.success).is_(success))
    if method is not None:
        conditions.append(col(LoginLog.method) == method)
    if failure_reason is not None:
        conditions.append(col(LoginLog.failure_reason) == failure_reason)
    count_result = await session.exec(select(func.count()).select_from(LoginLog).where(*conditions))
    total = int(count_result.one())
    result = await session.exec(
        select(LoginLog).where(*conditions).order_by(col(LoginLog.created_at).desc()).offset(offset).limit(page_size)
    )
    return list(result.all()), total


async def list_operation_logs(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    action: str | None = None,
    resource_type: str | None = None,
    q: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> tuple[list[OperationLog], int]:
    offset = (page - 1) * page_size
    conditions: list[ColumnElement[bool]] = []
    start_at, end_at = _normalize_log_time_range(start_at, end_at)
    if start_at is not None:
        conditions.append(col(OperationLog.created_at) >= start_at)
    if end_at is not None:
        conditions.append(col(OperationLog.created_at) <= end_at)
    if q and q.strip():
        term = "%" + q.strip().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"
        conditions.append(
            or_(
                col(OperationLog.username).ilike(term, escape="!"),
                col(OperationLog.ip_address).ilike(term, escape="!"),
                col(OperationLog.action).ilike(term, escape="!"),
                col(OperationLog.resource_type).ilike(term, escape="!"),
                col(OperationLog.resource_id).ilike(term, escape="!"),
                col(OperationLog.detail).ilike(term, escape="!"),
            )
        )

    if action is not None:
        conditions.append(col(OperationLog.action) == action)
    if resource_type is not None:
        conditions.append(col(OperationLog.resource_type) == resource_type)
    count_result = await session.exec(select(func.count()).select_from(OperationLog).where(*conditions))
    total = int(count_result.one())
    result = await session.exec(
        select(OperationLog)
        .where(*conditions)
        .order_by(col(OperationLog.created_at).desc())
        .offset(offset)
        .limit(page_size)
    )
    return list(result.all()), total
