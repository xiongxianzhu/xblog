"""应用时区：东八区（中国标准时间）。"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

CHINA_TZ = ZoneInfo("Asia/Shanghai")


def now() -> datetime:
    """返回带时区信息的当前东八区时间。"""
    return datetime.now(CHINA_TZ)
