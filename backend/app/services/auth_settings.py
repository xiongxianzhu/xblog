"""管理后台登录方式配置。"""

from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.models.site_setting import SiteSetting
from app.schemas.auth_settings import AuthSettingsAdmin, AuthSettingsUpdate, LoginMethodsResponse

OAUTH_GITHUB_ENABLED_KEY = "auth.oauth.github.enabled"
OAUTH_WECHAT_ENABLED_KEY = "auth.oauth.wechat.enabled"
SMS_ENABLED_KEY = "auth.sms.enabled"


async def _get_value(session: AsyncSession, key: str) -> str | None:
    result = await session.exec(select(SiteSetting).where(SiteSetting.key == key))
    row = result.first()
    return row.value if row else None


async def _set_value(session: AsyncSession, key: str, value: str) -> None:
    result = await session.exec(select(SiteSetting).where(SiteSetting.key == key))
    row = result.first()
    if row is None:
        session.add(SiteSetting(key=key, value=value))
    else:
        row.value = value
    await session.flush()


def _parse_bool(raw: str | None, *, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _format_bool(value: bool) -> str:
    return "true" if value else "false"


def sms_configured() -> bool:
    settings = get_settings()
    if settings.sms_provider == "dev":
        return True
    return bool(
        settings.aliyun_sms_access_key_id
        and settings.aliyun_sms_access_key_secret
        and settings.aliyun_sms_sign_name
        and settings.aliyun_sms_template_code
    )


async def get_auth_settings_admin(session: AsyncSession) -> AuthSettingsAdmin:
    settings = get_settings()
    return AuthSettingsAdmin(
        sms_enabled=_parse_bool(await _get_value(session, SMS_ENABLED_KEY)),
        sms_configured=sms_configured(),
        github_enabled=_parse_bool(await _get_value(session, OAUTH_GITHUB_ENABLED_KEY)),
        github_configured=settings.github_oauth_enabled,
        wechat_enabled=_parse_bool(await _get_value(session, OAUTH_WECHAT_ENABLED_KEY)),
        wechat_configured=settings.wechat_oauth_enabled,
    )


async def update_auth_settings(session: AsyncSession, payload: AuthSettingsUpdate) -> AuthSettingsAdmin:
    if payload.sms_enabled is not None:
        await _set_value(session, SMS_ENABLED_KEY, _format_bool(payload.sms_enabled))
    if payload.github_enabled is not None:
        await _set_value(session, OAUTH_GITHUB_ENABLED_KEY, _format_bool(payload.github_enabled))
    if payload.wechat_enabled is not None:
        await _set_value(session, OAUTH_WECHAT_ENABLED_KEY, _format_bool(payload.wechat_enabled))
    await session.commit()
    return await get_auth_settings_admin(session)


async def get_login_methods(session: AsyncSession) -> LoginMethodsResponse:
    settings = get_settings()
    sms_enabled = _parse_bool(await _get_value(session, SMS_ENABLED_KEY))
    github_enabled = _parse_bool(await _get_value(session, OAUTH_GITHUB_ENABLED_KEY))
    wechat_enabled = _parse_bool(await _get_value(session, OAUTH_WECHAT_ENABLED_KEY))
    return LoginMethodsResponse(
        sms=sms_enabled and sms_configured(),
        github=github_enabled and settings.github_oauth_enabled,
        wechat=wechat_enabled and settings.wechat_oauth_enabled,
    )


async def is_sms_login_available(session: AsyncSession) -> bool:
    methods = await get_login_methods(session)
    return methods.sms


async def is_github_login_available(session: AsyncSession) -> bool:
    methods = await get_login_methods(session)
    return methods.github


async def is_wechat_login_available(session: AsyncSession) -> bool:
    methods = await get_login_methods(session)
    return methods.wechat
