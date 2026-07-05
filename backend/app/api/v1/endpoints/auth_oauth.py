"""OAuth 与密码找回 API。"""

from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
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
from app.services import audit_logs, auth_settings, login_guard, oauth_service, password_reset_service

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
async def forgot_password(payload: ForgotPasswordRequest, request: Request, session: SessionDep) -> MessageResponse:
    await login_guard.enforce_forgot_password_guard(session, request, payload.turnstile_token)
    message = await password_reset_service.request_password_reset(session, payload.username)
    return MessageResponse(message=message)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordRequest, session: SessionDep) -> None:
    await password_reset_service.reset_password_with_token(session, payload.token, payload.new_password)


def _oauth_start_redirect(url: str, state: str) -> RedirectResponse:
    redirect = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    set_oauth_state_cookie(redirect, state)
    return redirect


@router.get("/oauth/github/start")
async def github_login_start(session: SessionDep) -> RedirectResponse:
    if not await auth_settings.is_github_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub login is disabled")
    url, state = oauth_service.github_authorize_url(mode="login")
    return _oauth_start_redirect(url, state)


@router.get("/oauth/github/bind/start")
async def github_bind_start(session: SessionDep, current_user: CurrentUserDep) -> RedirectResponse:
    if not await auth_settings.is_github_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub login is disabled")
    url, state = oauth_service.github_authorize_url(mode="bind", username=current_user.username)
    return _oauth_start_redirect(url, state)


@router.get("/oauth/github/callback")
async def github_callback(
    response: Response,
    session: SessionDep,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    oauth_state: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
) -> RedirectResponse:
    return await _handle_oauth_callback(
        response=response,
        session=session,
        request=request,
        provider="github",
        code=code,
        state=state,
        oauth_state=oauth_state,
        login=lambda: oauth_service.login_with_github(session, code or ""),
        bind=lambda username: oauth_service.bind_github(session, username, code or ""),
    )


@router.get("/oauth/wechat/start")
async def wechat_login_start(session: SessionDep) -> RedirectResponse:
    if not await auth_settings.is_wechat_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat login is disabled")
    url, state = oauth_service.wechat_authorize_url(mode="login")
    return _oauth_start_redirect(url, state)


@router.get("/oauth/wechat/bind/start")
async def wechat_bind_start(session: SessionDep, current_user: CurrentUserDep) -> RedirectResponse:
    if not await auth_settings.is_wechat_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat login is disabled")
    url, state = oauth_service.wechat_authorize_url(mode="bind", username=current_user.username)
    return _oauth_start_redirect(url, state)


@router.get("/oauth/wechat/callback")
async def wechat_callback(
    response: Response,
    session: SessionDep,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    oauth_state: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
) -> RedirectResponse:
    return await _handle_oauth_callback(
        response=response,
        session=session,
        request=request,
        provider="wechat",
        code=code,
        state=state,
        oauth_state=oauth_state,
        login=lambda: oauth_service.login_with_wechat(session, code or ""),
        bind=lambda username: oauth_service.bind_wechat(session, username, code or ""),
    )


def _oauth_error_redirect(*, mode: str | None, error: str) -> str:
    if mode == "bind":
        return f"{oauth_service.admin_redirect('/admin/profile')}?error={error}"
    return f"{oauth_service.admin_redirect()}?error={error}"


def _parse_oauth_mode(state: str | None, *, provider: str) -> str | None:
    if not state:
        return None
    try:
        return str(oauth_service.parse_oauth_state(state, provider=provider)["mode"])
    except HTTPException:
        return None


async def _handle_oauth_callback(
    *,
    response: Response,
    session: SessionDep,
    request: Request,
    provider: str,
    code: str | None,
    state: str | None,
    oauth_state: str | None,
    login,
    bind,
) -> RedirectResponse:
    mode = _parse_oauth_mode(state, provider=provider)
    method = f"oauth_{provider}"

    async def _log_failure(reason: str, username: str = provider) -> None:
        if mode == "bind":
            return
        await audit_logs.record_login(
            session,
            request=request,
            username=username,
            method=method,
            success=False,
            failure_reason=reason,
        )
        await session.commit()

    if not code or not state:
        await _log_failure("oauth_failed")
        clear_oauth_state_cookie(response)
        redirect = RedirectResponse(
            url=_oauth_error_redirect(mode=mode, error="oauth_failed"),
            status_code=status.HTTP_302_FOUND,
        )
        clear_oauth_state_cookie(redirect)
        return redirect

    try:
        payload = oauth_service.parse_oauth_state(state, provider=provider)
    except HTTPException:
        await _log_failure("oauth_failed")
        clear_oauth_state_cookie(response)
        redirect = RedirectResponse(
            url=_oauth_error_redirect(mode=mode, error="oauth_failed"),
            status_code=status.HTTP_302_FOUND,
        )
        clear_oauth_state_cookie(redirect)
        return redirect

    mode = str(payload["mode"])
    if oauth_state is not None and oauth_state != state:
        await _log_failure("oauth_failed")
        redirect = RedirectResponse(
            url=_oauth_error_redirect(mode=mode, error="oauth_failed"),
            status_code=status.HTTP_302_FOUND,
        )
        clear_oauth_state_cookie(redirect)
        return redirect

    try:
        if mode == "bind":
            username = payload.get("sub")
            if not username:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
            await bind(username)
            redirect = RedirectResponse(
                url=f"{oauth_service.admin_redirect('/admin/profile')}?oauth=bound",
                status_code=status.HTTP_302_FOUND,
            )
            clear_oauth_state_cookie(redirect)
            return redirect

        user = await login()
        await audit_logs.record_login(
            session,
            request=request,
            username=user.username,
            method=method,
            success=True,
            user=user,
        )
        await session.commit()
        query = urlencode({"login": "success", "username": user.username})
        redirect = RedirectResponse(
            url=f"{oauth_service.admin_redirect('/admin/dashboard')}?{query}",
            status_code=status.HTTP_302_FOUND,
        )
        set_auth_cookies(redirect, user.username)
        clear_oauth_state_cookie(redirect)
        return redirect
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            error = "oauth_not_linked"
        elif exc.status_code == status.HTTP_409_CONFLICT:
            error = "oauth_already_linked"
        else:
            error = "oauth_failed"
        await _log_failure(error)
        redirect = RedirectResponse(
            url=_oauth_error_redirect(mode=mode, error=error),
            status_code=status.HTTP_302_FOUND,
        )
        clear_oauth_state_cookie(redirect)
        return redirect
