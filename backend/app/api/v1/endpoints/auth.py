"""认证 API。"""

from __future__ import annotations

from fastapi import APIRouter, Cookie, File, HTTPException, Response, UploadFile, status
from jwt import InvalidTokenError
from sqlmodel import select

from app.api.auth_cookies import clear_auth_cookies, set_auth_cookies
from app.api.deps import CurrentUserDep, SessionDep
from app.core.security import REFRESH_COOKIE, decode_token, hash_password, verify_password
from app.core.timezone import now
from app.models.user import User
from app.schemas.auth import (
    AvatarUploadResponse,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
    UserPublic,
)
from app.services.uploads import delete_avatar_file, save_user_avatar

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, response: Response, session: SessionDep) -> TokenResponse:
    result = await session.exec(select(User).where(User.username == payload.username))
    user = result.first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.last_login_at = now()
    session.add(user)
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
    set_auth_cookies(response, user.username)
    return TokenResponse(username=user.username)


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUserDep) -> UserPublic:
    return UserPublic(username=current_user.username, avatar_url=current_user.avatar_url)


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
