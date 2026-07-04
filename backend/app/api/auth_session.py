"""认证会话解析：access 失效时自动用 refresh 续期。"""

from __future__ import annotations

from fastapi import Response
from jwt import InvalidTokenError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.auth_cookies import set_auth_cookies
from app.core.security import decode_token
from app.models.user import User


async def _load_user(session: AsyncSession, username: str | None) -> User | None:
    if not username:
        return None
    result = await session.exec(select(User).where(User.username == username))
    return result.first()


async def resolve_current_user(
    session: AsyncSession,
    response: Response,
    access_token: str | None,
    refresh_token: str | None,
) -> User | None:
    if access_token:
        try:
            payload = decode_token(access_token)
            if payload.get("type") == "access":
                user = await _load_user(session, payload.get("sub"))
                if user:
                    return user
        except InvalidTokenError:
            pass

    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                return None
            user = await _load_user(session, payload.get("sub"))
            if user:
                set_auth_cookies(response, user.username)
                return user
        except InvalidTokenError:
            return None

    return None
