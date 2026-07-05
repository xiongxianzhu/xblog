"""管理端用户 API。"""

from __future__ import annotations

from fastapi import APIRouter, Request, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.user import User
from app.schemas.auth import UserActiveUpdate, UserAdmin
from app.services import audit_logs
from app.services import users as users_service

router = APIRouter()


@router.get("/users", response_model=list[UserAdmin])
async def list_users(session: SessionDep, _: CurrentUserDep) -> list[UserAdmin]:
    result = await session.exec(select(User).order_by(User.created_at.desc()))
    return [users_service.user_to_admin(user) for user in result.all() if user.id is not None]


@router.patch("/users/{user_id}", response_model=UserAdmin)
async def update_user_active(
    user_id: int,
    payload: UserActiveUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
    request: Request,
) -> UserAdmin:
    user = await users_service.get_user_or_404(session, user_id)
    updated = await users_service.set_user_active(session, user, is_active=payload.is_active)
    await audit_logs.record_operation(
        session,
        request=request,
        actor=current_user,
        action="user.enable" if payload.is_active else "user.disable",
        resource_type="user",
        resource_id=str(user.id),
        detail=f"{'启用' if payload.is_active else '禁用'}用户 {user.username}",
    )
    await session.commit()
    await session.refresh(updated)
    return users_service.user_to_admin(updated)


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
