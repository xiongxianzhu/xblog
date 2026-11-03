"""管理员用户业务逻辑。"""

from __future__ import annotations

import re

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import UserAdmin, UserPublic
from app.services.uploads import delete_avatar_file

_PHONE_PATTERN = re.compile(r"^1\d{10}$")


def user_to_public(user: User) -> UserPublic:
    return UserPublic(
        username=user.username,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        phone=user.phone,
        email=user.email,
        birth_date=user.birth_date,
        gender=user.gender,
    )


def user_to_admin(user: User) -> UserAdmin:
    if user.id is None:
        raise ValueError("User id is required")
    return UserAdmin(
        id=user.id,
        username=user.username,
        nickname=user.nickname,
        email=user.email,
        phone=user.phone,
        birth_date=user.birth_date,
        gender=user.gender,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


async def count_users(session: AsyncSession) -> int:
    result = await session.exec(select(func.count()).select_from(User))
    return int(result.one())


async def count_active_users(session: AsyncSession) -> int:
    result = await session.exec(select(func.count()).select_from(User).where(User.is_active == True))  # noqa: E712
    return int(result.one())


async def get_user_or_404(session: AsyncSession, user_id: int) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user


def _try_normalize_phone(raw: str) -> str | None:
    phone = re.sub(r"\s+", "", raw.strip())
    if phone.startswith("+86"):
        phone = phone[3:]
    if phone.startswith("86") and len(phone) == 13:
        phone = phone[2:]
    if _PHONE_PATTERN.fullmatch(phone):
        return phone
    return None


async def get_user_by_login_identifier(session: AsyncSession, identifier: str) -> User | None:
    raw = identifier.strip()
    if not raw:
        return None

    if "@" in raw:
        result = await session.exec(select(User).where(func.lower(User.email) == raw.lower()))
        return result.first()

    phone = _try_normalize_phone(raw)
    if phone is not None:
        result = await session.exec(select(User).where(User.phone == phone))
        return result.first()

    result = await session.exec(select(User).where(User.username == raw))
    return result.first()


def ensure_user_can_authenticate(user: User) -> None:
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已禁用")


async def set_user_active(session: AsyncSession, user: User, *, is_active: bool) -> User:
    if not is_active and user.is_active:
        active_count = await count_active_users(session)
        if active_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="无法禁用唯一的管理员",
            )
    user.is_active = is_active
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def delete_user(session: AsyncSession, user: User) -> None:
    total = await count_users(session)
    if total <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="无法删除唯一的管理员",
        )

    tokens = await session.exec(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    for token in tokens.all():
        await session.delete(token)

    delete_avatar_file(user.avatar_url)
    await session.delete(user)
    await session.commit()
