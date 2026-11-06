"""管理员用户业务逻辑。"""

from __future__ import annotations

import re
import secrets

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import hash_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import AdminUserCreate, AdminUserUpdate, UserAdmin, UserPublic
from app.services.uploads import delete_avatar_file

_PHONE_PATTERN = re.compile(r"^1\d{10}$")


def user_to_public(user: User) -> UserPublic:
    return UserPublic(
        username=user.username,
        must_change_password=user.must_change_password,
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
        must_change_password=user.must_change_password,
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
    return user


async def save_admin_user(
    session: AsyncSession, payload: AdminUserCreate | AdminUserUpdate, user: User | None = None
) -> User:
    values = payload.model_dump(exclude_unset=True, exclude={"password", "username", "is_active"})
    if values.get("email"):
        values["email"] = values["email"].lower()
    if values.get("phone"):
        values["phone"] = _try_normalize_phone(values["phone"])
        if values["phone"] is None:
            raise HTTPException(status_code=422, detail="请输入有效的中国大陆手机号")
    for field in ("email", "phone"):
        value = values.get(field)
        if value:
            column = getattr(User, field)
            condition = func.lower(column) == value if field == "email" else column == value
            existing = (await session.exec(select(User).where(condition))).first()
            if existing and (user is None or existing.id != user.id):
                raise HTTPException(status_code=409, detail="邮箱或手机号已被其他用户使用")
    if user is None:
        assert isinstance(payload, AdminUserCreate)
        user = User(
            username=payload.username,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            must_change_password=True,
            is_active=payload.is_active,
            **values,
        )
    else:
        if "is_active" in payload.model_fields_set:
            await set_user_active(session, user, is_active=payload.is_active)
        for field, value in values.items():
            setattr(user, field, value)
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="用户名、邮箱或手机号已被使用") from exc
    return user


async def reset_admin_password(session: AsyncSession, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.must_change_password = True
    session.add(user)
    tokens = await session.exec(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    for token in tokens.all():
        await session.delete(token)


async def delete_user(session: AsyncSession, user: User) -> None:
    total = await count_users(session)
    if total <= 1 or (user.is_active and await count_active_users(session) <= 1):
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
