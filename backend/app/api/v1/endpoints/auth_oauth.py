"""OAuth 与密码找回 API。"""

from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from fastapi.responses import RedirectResponse

from app.api.auth_cookies import clear_oauth_state_cookie, set_auth_cookies, set_oauth_state_cookie
from app.api.deps import CurrentUserDep, SessionDep
from app.core.security import OAUTH_STATE_COOKIE
from app.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    OAuthLinksResponse,
    OAuthProvidersResponse,
    ResetPasswordRequest,
)
from app.services import auth_settings, oauth_service, password_reset_service

router = APIRouter()


@router.get("/oauth/providers", response_model=OAuthProvidersResponse)
async def oauth_providers(session: SessionDep) -> OAuthProvidersResponse:
    methods = await auth_settings.get_login_methods(session)
    return OAuthProvidersResponse(github=methods.github, wechat=methods.wechat)


@router.get("/oauth/links", response_model=OAuthLinksResponse)
async def oauth_links(current_user: CurrentUserDep) -> OAuthLinksResponse:
    return OAuthLinksResponse(
        github=bool(current_user.github_id),
        wechat=bool(current_user.wechat_openid),
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, session: SessionDep) -> MessageResponse:
    message = await password_reset_service.request_password_reset(session, payload.username)
    return MessageResponse(message=message)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordRequest, session: SessionDep) -> None:
    await password_reset_service.reset_password_with_token(session, payload.token, payload.new_password)


@router.get("/oauth/github/start")
async def github_login_start(response: Response, session: SessionDep) -> RedirectResponse:
    if not await auth_settings.is_github_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub login is disabled")
    url, state = oauth_service.github_authorize_url(mode="login")
    set_oauth_state_cookie(response, state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/github/bind/start")
async def github_bind_start(response: Response, session: SessionDep, current_user: CurrentUserDep) -> RedirectResponse:
    if not await auth_settings.is_github_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub login is disabled")
    url, state = oauth_service.github_authorize_url(mode="bind", username=current_user.username)
    set_oauth_state_cookie(response, state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/github/callback")
async def github_callback(
    response: Response,
    session: SessionDep,
    code: str | None = None,
    state: str | None = None,
    oauth_state: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
) -> RedirectResponse:
    return await _handle_oauth_callback(
        response=response,
        session=session,
        provider="github",
        code=code,
        state=state,
        oauth_state=oauth_state,
        login=lambda: oauth_service.login_with_github(session, code or ""),
        bind=lambda username: oauth_service.bind_github(session, username, code or ""),
    )


@router.get("/oauth/wechat/start")
async def wechat_login_start(response: Response, session: SessionDep) -> RedirectResponse:
    if not await auth_settings.is_wechat_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat login is disabled")
    url, state = oauth_service.wechat_authorize_url(mode="login")
    set_oauth_state_cookie(response, state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/wechat/bind/start")
async def wechat_bind_start(response: Response, session: SessionDep, current_user: CurrentUserDep) -> RedirectResponse:
    if not await auth_settings.is_wechat_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat login is disabled")
    url, state = oauth_service.wechat_authorize_url(mode="bind", username=current_user.username)
    set_oauth_state_cookie(response, state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/wechat/callback")
async def wechat_callback(
    response: Response,
    session: SessionDep,
    code: str | None = None,
    state: str | None = None,
    oauth_state: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
) -> RedirectResponse:
    return await _handle_oauth_callback(
        response=response,
        session=session,
        provider="wechat",
        code=code,
        state=state,
        oauth_state=oauth_state,
        login=lambda: oauth_service.login_with_wechat(session, code or ""),
        bind=lambda username: oauth_service.bind_wechat(session, username, code or ""),
    )


async def _handle_oauth_callback(
    *,
    response: Response,
    session: SessionDep,
    provider: str,
    code: str | None,
    state: str | None,
    oauth_state: str | None,
    login,
    bind,
) -> RedirectResponse:
    if not code or not state or not oauth_state or oauth_state != state:
        clear_oauth_state_cookie(response)
        return RedirectResponse(
            url=f"{oauth_service.admin_redirect()}?error=oauth_failed",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        payload = oauth_service.parse_oauth_state(state, provider=provider)
        mode = payload["mode"]

        if mode == "bind":
            username = payload.get("sub")
            if not username:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
            await bind(username)
            clear_oauth_state_cookie(response)
            return RedirectResponse(
                url=f"{oauth_service.admin_redirect('/admin/profile')}?oauth=bound",
                status_code=status.HTTP_302_FOUND,
            )

        user = await login()
        set_auth_cookies(response, user.username)
        clear_oauth_state_cookie(response)
        return RedirectResponse(
            url=oauth_service.admin_redirect("/admin/dashboard"),
            status_code=status.HTTP_302_FOUND,
        )
    except HTTPException as exc:
        clear_oauth_state_cookie(response)
        error = "oauth_not_linked" if exc.status_code == status.HTTP_403_FORBIDDEN else "oauth_failed"
        return RedirectResponse(
            url=f"{oauth_service.admin_redirect()}?error={error}",
            status_code=status.HTTP_302_FOUND,
        )
