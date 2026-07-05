"""SQLModel 表模型；导入以确保 Alembic 侦测 metadata。"""

from sqlmodel import SQLModel

from app.models.ai_provider import AiProvider, AiProviderType
from app.models.ai_skill import AiSkill, AiSkillDefault
from app.models.ai_usage_log import AiUsageLog
from app.models.base import TimestampMixin
from app.models.login_log import LoginLog
from app.models.operation_log import OperationLog
from app.models.friend_link import FriendLink
from app.models.page import Page
from app.models.page_view import PageView
from app.models.password_reset_token import PasswordResetToken
from app.models.sms_verification_code import SmsVerificationCode
from app.models.post import Post, PostTag, Tag
from app.models.site_setting import SiteSetting
from app.models.user import User

__all__ = [
    "SQLModel",
    "AiProvider",
    "AiProviderType",
    "AiSkill",
    "AiSkillDefault",
    "AiUsageLog",
    "TimestampMixin",
    "LoginLog",
    "OperationLog",
    "FriendLink",
    "Page",
    "PageView",
    "PasswordResetToken",
    "SmsVerificationCode",
    "Post",
    "PostTag",
    "SiteSetting",
    "Tag",
    "User",
]
