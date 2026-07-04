"""SQLModel 表模型；导入以确保 Alembic 侦测 metadata。"""

from sqlmodel import SQLModel

from app.models.base import TimestampMixin
from app.models.friend_link import FriendLink
from app.models.page import Page
from app.models.page_view import PageView
from app.models.post import Post, PostTag, Tag
from app.models.site_setting import SiteSetting
from app.models.user import User

__all__ = [
    "SQLModel",
    "TimestampMixin",
    "FriendLink",
    "Page",
    "PageView",
    "Post",
    "PostTag",
    "SiteSetting",
    "Tag",
    "User",
]
