from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Cookie, File, HTTPException, Request, Response, UploadFile, status
from jwt import InvalidTokenError
from sqlalchemy import func
from sqlmodel import select

from app.api.auth_cookies import clear_auth_cookies, set_auth_cookies
from app.api.deps import CurrentUserDep, SessionDep
from app.core.security import REFRESH_COOKIE, decode_token, hash_password, verify_password
from app.core.timezone import now
from app.models.user import User
from app.schemas.auth import (
    AvatarUploadResponse,
    BindEmailRequest,
    BindPhoneRequest,
    ChangePasswordRequest,
    LoginGuardResponse,
    LoginRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserPublic,
)
from app.services import audit_logs, login_guard, sms_service
from app.services.uploads import delete_avatar_file, save_user_avatar
from app.services.users import ensure_user_can_authenticate, get_user_by_login_identifier, user_to_public

router = APIRouter()


@router.get("/login-guard", response_model=LoginGuardResponse)
async def get_login_guard(
    request: Request,
    session: SessionDep,
    username: str | None = None,
) -> LoginGuardResponse:
    return await login_guard.login_guard_status(session, request, username=username)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, response: Response, session: SessionDep, request: Request) -> TokenResponse:
    await login_guard.enforce_login_guard(
        session,
        request,
        username=payload.username,
        turnstile_token=payload.turnstile_token,
    )

    user = await get_user_by_login_identifier(session, payload.username)
    if user is None or not verify_password(payload.password, user.password_hash):
        await audit_logs.record_login(
            session,
            request=request,
            username=payload.username.strip(),
            method="password",
            success=False,
            failure_reason="invalid_credentials",
        )
        await session.commit()
        failures = await login_guard.count_recent_login_failures(
            session,
            ip=audit_logs.client_ip(request),
            username=payload.username,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=login_guard.login_invalid_credentials_detail(failures),
        )
    try:
        ensure_user_can_authenticate(user)
    except HTTPException as exc:
        await audit_logs.record_login(
            session,
            request=request,
            username=user.username,
            method="password",
            success=False,
            user=user,
            failure_reason="user_disabled",
        )
        await session.commit()
        raise exc
    user.last_login_at = now()
    session.add(user)
    await audit_logs.record_login(
        session,
        request=request,
        username=user.username,
        method="password",
        success=True,
        user=user,
    )
    await session.commit()
    set_auth_cookies(response, user.username)
    return TokenResponse(username=user.username)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    clear_auth_cookies(response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    session: SessionDep,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    try:
        payload = decode_token(refresh_token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    result = await session.exec(select(User).where(User.username == username))
    user = result.first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    ensure_user_can_authenticate(user)
    set_auth_cookies(response, user.username)
    return TokenResponse(username=user.username)


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUserDep) -> UserPublic:
    return user_to_public(current_user)


@router.patch("/phone", response_model=UserPublic)
async def bind_phone(
    payload: BindPhoneRequest,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> UserPublic:
    normalized = sms_service.normalize_phone(payload.phone)
    result = await session.exec(select(User).where(User.phone == normalized))
    existing = result.first()
    if existing is not None and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number is already linked")
    current_user.phone = normalized
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return user_to_public(current_user)


@router.patch("/email", response_model=UserPublic)
async def bind_email(
    payload: BindEmailRequest,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> UserPublic:
    normalized = payload.email.strip().lower()
    result = await session.exec(select(User).where(func.lower(User.email) == normalized))
    existing = result.first()
    if existing is not None and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already linked")
    current_user.email = normalized
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return user_to_public(current_user)


@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> UserPublic:
    if payload.birth_date is not None and payload.birth_date > date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Birth date cannot be in the future")

    current_user.nickname = payload.nickname
    current_user.birth_date = payload.birth_date
    current_user.gender = payload.gender
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return user_to_public(current_user)


@router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    current_user: CurrentUserDep,
    session: SessionDep,
    file: UploadFile = File(...),
) -> AvatarUploadResponse:
    delete_avatar_file(current_user.avatar_url)
    avatar_url = await save_user_avatar(current_user.username, file)
    current_user.avatar_url = avatar_url
    session.add(current_user)
    await session.commit()
    return AvatarUploadResponse(avatar_url=avatar_url)


@router.delete("/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def remove_avatar(current_user: CurrentUserDep, session: SessionDep) -> None:
    delete_avatar_file(current_user.avatar_url)
    current_user.avatar_url = None
    session.add(current_user)
    await session.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> None:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    session.add(current_user)
    await session.commit()
