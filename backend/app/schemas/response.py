"""统一 API 响应 envelope。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    """非流式 JSON 接口统一响应体。"""

    code: int = 0
    msg: str = "ok"
    data: Any = Field(default_factory=dict)


def success(data: Any = None, *, msg: str = "ok") -> dict[str, Any]:
    if data is None:
        data = {}
    return {"code": 0, "msg": msg, "data": data}


def fail(msg: str = "请求失败", *, code: int = -1, data: Any = None) -> dict[str, Any]:
    if data is None:
        data = {}
    return {"code": code, "msg": msg, "data": data}
