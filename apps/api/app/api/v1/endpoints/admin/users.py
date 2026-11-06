"""管理端用户 API。"""

from __future__ import annotations

import secrets
from typing import Literal

from fastapi import APIRouter, Query, Request, Response, status
from sqlalchemy import func, or_
from sqlmodel import col, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.user import User
from app.schemas.auth import (
    AdminPasswordResetResult,
    AdminUserCreate,
    AdminUserUpdate,
    PaginatedUsers,
    UserAdmin,
)
from app.services import audit_logs
from app.services import users as users_service

router = APIRouter()


def _apply_user_search(
    stmt,
    q: str | None,
    is_active: bool | None = None,
    gender: str | None = None,
    must_change_password: bool | None = None,
):
    if is_active is not None:
        stmt = stmt.where(col(User.is_active).is_(is_active))
    if must_change_password is not None:
        stmt = stmt.where(col(User.must_change_password).is_(must_change_password))
    if gender is not None:
        stmt = stmt.where(col(User.gender).is_(None) if gender == "unset" else User.gender == gender)
    if not q or not q.strip():
        return stmt
    term = f"%{q.strip()}%"
    return stmt.where(
        or_(
            col(User.username).ilike(term),
            col(User.nickname).ilike(term),
            col(User.phone).ilike(term),
            col(User.email).ilike(term),
        )
    )


@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    session: SessionDep,
    _: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=200),
    is_active: bool | None = None,
    gender: Literal["male", "female", "other", "unset"] | None = None,
    must_change_password: bool | None = None,
) -> PaginatedUsers:
    count_stmt = _apply_user_search(select(func.count()).select_from(User), q, is_active, gender, must_change_password)
    total = int((await session.exec(count_stmt)).one())
    active_count = int(
        (await session.exec(select(func.count()).select_from(User).where(col(User.is_active).is_(True)))).one()
    )
    offset = (page - 1) * page_size
    stmt = (
        _apply_user_search(select(User), q, is_active, gender, must_change_password)
        .order_by(col(User.created_at).desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    users = [users_service.user_to_admin(user) for user in result.all() if user.id is not None]
    return PaginatedUsers(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        active_count=active_count,
    )


@router.get("/users/{user_id}", response_model=UserAdmin)
async def get_user(user_id: int, session: SessionDep, _: CurrentUserDep) -> UserAdmin:
    return users_service.user_to_admin(await users_service.get_user_or_404(session, user_id))


@router.patch("/users/{user_id}", response_model=UserAdmin)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
    request: Request,
) -> UserAdmin:
    user = await users_service.get_user_or_404(session, user_id)
    updated = await users_service.save_admin_user(session, payload, user)
    await audit_logs.record_operation(
        session,
        request=request,
        actor=current_user,
        action=("user.enable" if payload.is_active else "user.disable")
        if payload.model_fields_set == {"is_active"}
        else "user.update",
        resource_type="user",
        resource_id=str(user.id),
        detail=f"更新用户 {user.username}",
    )
    await session.commit()
    await session.refresh(updated)
    return users_service.user_to_admin(updated)


@router.post("/users", response_model=UserAdmin, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate, session: SessionDep, current_user: CurrentUserDep, request: Request
) -> UserAdmin:
    user = await users_service.save_admin_user(session, payload)
    await audit_logs.record_operation(
        session,
        request=request,
        actor=current_user,
        action="user.create",
        resource_type="user",
        resource_id=str(user.id),
        detail=f"创建用户 {user.username}",
    )
    await session.commit()
    await session.refresh(user)
    return users_service.user_to_admin(user)


@router.post("/users/{user_id}/reset-password", response_model=AdminPasswordResetResult)
async def reset_user_password(
    user_id: int,
    response: Response,
    session: SessionDep,
    current_user: CurrentUserDep,
    request: Request,
) -> AdminPasswordResetResult:
    user = await users_service.get_user_or_404(session, user_id)
    password = secrets.token_urlsafe(18)
    await users_service.reset_admin_password(session, user, password)
    await audit_logs.record_operation(
        session,
        request=request,
        actor=current_user,
        action="user.reset_password",
        resource_type="user",
        resource_id=str(user.id),
        detail=f"重置用户 {user.username} 的密码",
    )
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    return AdminPasswordResetResult(username=user.username, password=password)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    session: SessionDep,
    current_user: CurrentUserDep,
    request: Request,
) -> None:
    user = await users_service.get_user_or_404(session, user_id)
    await audit_logs.record_operation(
        session,
        request=request,
        actor=current_user,
        action="user.delete",
        resource_type="user",
        resource_id=str(user.id),
        detail=f"删除用户 {user.username}",
    )
    await users_service.delete_user(session, user)
