"""管理端登录方式配置。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.auth_settings import AuthSettingsAdmin, AuthSettingsUpdate
from app.services import auth_settings

router = APIRouter()


@router.get("/auth-settings", response_model=AuthSettingsAdmin)
async def read_auth_settings(session: SessionDep, _: CurrentUserDep) -> AuthSettingsAdmin:
    return await auth_settings.get_auth_settings_admin(session)


@router.patch("/auth-settings", response_model=AuthSettingsAdmin)
async def patch_auth_settings(
    payload: AuthSettingsUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> AuthSettingsAdmin:
    return await auth_settings.update_auth_settings(session, payload)
