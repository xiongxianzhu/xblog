"""短信登录 API。"""

from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.auth_cookies import set_auth_cookies
from app.api.deps import SessionDep
from app.schemas.auth import MessageResponse, TokenResponse
from app.schemas.auth_settings import LoginMethodsResponse, SmsLoginRequest, SmsSendCodeRequest
from app.services import auth_settings, sms_service

router = APIRouter()


@router.get("/login-methods", response_model=LoginMethodsResponse)
async def login_methods(session: SessionDep) -> LoginMethodsResponse:
    return await auth_settings.get_login_methods(session)


@router.post("/sms/send-code", response_model=MessageResponse)
async def send_sms_code(payload: SmsSendCodeRequest, session: SessionDep) -> MessageResponse:
    message = await sms_service.send_login_code(session, payload.phone)
    return MessageResponse(message=message)


@router.post("/sms/login", response_model=TokenResponse)
async def sms_login(payload: SmsLoginRequest, response: Response, session: SessionDep) -> TokenResponse:
    user = await sms_service.verify_login_code(session, payload.phone, payload.code)
    set_auth_cookies(response, user.username)
    return TokenResponse(username=user.username)
