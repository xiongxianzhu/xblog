"""密码找回与重置。"""

from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.core.security import hash_password
from app.core.timezone import now
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services import email_service

settings = get_settings()

FORGOT_PASSWORD_MESSAGE = "若账号存在且已绑定邮箱，你将收到重置密码邮件。"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def request_password_reset(session: AsyncSession, username: str) -> str:
    result = await session.exec(select(User).where(User.username == username))
    user = result.first()
    if user is None or not user.email or not email_service.smtp_enabled():
        return FORGOT_PASSWORD_MESSAGE

    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=now() + timedelta(minutes=settings.password_reset_expire_minutes),
    )
    session.add(token)
    await session.commit()

    reset_url = f"{settings.frontend_url.rstrip('/')}/admin/reset-password?token={raw_token}"
    await email_service.send_email(
        to=user.email,
        subject="xblog 管理员密码重置",
        body=(
            f"你好 {user.username}，\n\n"
            f"请点击以下链接重置密码（{settings.password_reset_expire_minutes} 分钟内有效）：\n"
            f"{reset_url}\n\n"
            "如非本人操作，请忽略此邮件。"
        ),
    )
    return FORGOT_PASSWORD_MESSAGE


async def reset_password_with_token(session: AsyncSession, token: str, new_password: str) -> None:
    token_hash = _hash_token(token)
    result = await session.exec(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == token_hash)
        .where(PasswordResetToken.used_at == None)  # noqa: E711
    )
    reset_token = result.first()
    if reset_token is None or reset_token.expires_at < now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user = await session.get(User, reset_token.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user.password_hash = hash_password(new_password)
    reset_token.used_at = now()
    session.add(user)
    session.add(reset_token)
    await session.commit()
