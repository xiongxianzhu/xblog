from sqlmodel import Field, SQLModel


class LoginMethodsResponse(SQLModel):
    sms: bool = False
    github: bool = False
    wechat: bool = False


class AuthSettingsAdmin(SQLModel):
    sms_enabled: bool
    sms_configured: bool
    github_enabled: bool
    github_configured: bool
    wechat_enabled: bool
    wechat_configured: bool
    turnstile_enabled: bool
    turnstile_configured: bool


class AuthSettingsUpdate(SQLModel):
    sms_enabled: bool | None = None
    github_enabled: bool | None = None
    wechat_enabled: bool | None = None
    turnstile_enabled: bool | None = None


class SmsSendCodeRequest(SQLModel):
    phone: str = Field(min_length=6, max_length=20)


class SmsLoginRequest(SQLModel):
    phone: str = Field(min_length=6, max_length=20)
    code: str = Field(min_length=6, max_length=6)
