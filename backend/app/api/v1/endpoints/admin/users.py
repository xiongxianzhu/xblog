"""管理端用户 API。"""

from __future__ import annotations

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.user import User
from app.schemas.auth import UserAdmin

router = APIRouter()


@router.get("/users", response_model=list[UserAdmin])
async def list_users(session: SessionDep, _: CurrentUserDep) -> list[UserAdmin]:
    result = await session.exec(select(User).order_by(User.created_at.desc()))
    return [
        UserAdmin(
            id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )
        for user in result.all()
        if user.id is not None
    ]
