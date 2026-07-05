"""全局异常处理。"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.response import fail


def _format_error_detail(detail: Any) -> tuple[str, Any]:
    if isinstance(detail, str):
        return detail, {}
    if isinstance(detail, list):
        if detail and all(isinstance(item, str) for item in detail):
            return "；".join(detail), detail
        return "请求参数校验失败", detail
    if isinstance(detail, dict):
        msg = str(detail.get("msg") or detail.get("message") or "请求失败")
        return msg, detail
    return "请求失败", {}


class APIException(Exception):
    """业务异常，可自定义 code / msg / data。"""

    def __init__(
        self,
        msg: str = "请求错误",
        *,
        code: int = -1,
        data: Any = None,
        status_code: int = 400,
    ) -> None:
        self.msg = msg
        self.code = code
        self.data = {} if data is None else data
        self.status_code = status_code
        super().__init__(msg)

    def to_dict(self) -> dict[str, Any]:
        return fail(msg=self.msg, code=self.code, data=self.data)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIException)
    async def api_exception_handler(_: Request, exc: APIException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        msg, data = _format_error_detail(exc.detail)
        return JSONResponse(status_code=exc.status_code, content=fail(msg=msg, data=data))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=fail(msg="请求参数校验失败", data=exc.errors()),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=500, content=fail(msg="服务器内部错误"))
