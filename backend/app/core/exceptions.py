"""统一异常与全局处理器。"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIException(Exception):
    """业务异常基类。"""

    status_code: int = 400
    code: str = "API_ERROR"
    message: str = "请求错误"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(message or self.message)
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.details = details or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIException)
    async def api_exception_handler(_: Request, exc: APIException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": "HTTP_ERROR",
                "message": exc.detail if isinstance(exc.detail, str) else "请求错误",
                "details": exc.detail if isinstance(exc.detail, list) else [],
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "code": "VALIDATION_ERROR",
                "message": "请求参数校验失败",
                "details": exc.errors(),
            },
        )
