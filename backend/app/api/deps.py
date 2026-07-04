"""公共 FastAPI 依赖。"""

from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.auth_session import resolve_current_user
from app.core.security import ACCESS_COOKIE, REFRESH_COOKIE
from app.db.session import get_db
from app.models.user import User

SessionDep = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    response: Response,
    session: SessionDep,
    access_token: str | None = Cookie(default=None, alias=ACCESS_COOKIE),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
) -> User:
    user = await resolve_current_user(session, response, access_token, refresh_token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]

__all__ = ["SessionDep", "CurrentUserDep", "get_current_user", "get_db"]
