"""统一 JSON 响应包装中间件。"""

from __future__ import annotations

import json
from typing import Any

from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.schemas.response import fail, success

_ENVELOPE_KEYS = frozenset({"code", "msg", "data"})
_SKIP_HEADER_NAMES = frozenset({"content-length", "content-type", "transfer-encoding"})


def is_enveloped(payload: Any) -> bool:
    return isinstance(payload, dict) and _ENVELOPE_KEYS.issubset(payload.keys())


def _apply_forwarded_headers(source: Headers, target: JSONResponse) -> JSONResponse:
    for name in source.keys():
        lower = name.lower()
        if lower in _SKIP_HEADER_NAMES:
            continue
        if lower == "set-cookie":
            for value in source.getlist("set-cookie"):
                target.headers.append("set-cookie", value)
            continue
        target.headers[name] = source[name]
    return target


def _envelope_json_response(source: Response, content: dict[str, Any], *, status_code: int = 200) -> JSONResponse:
    return _apply_forwarded_headers(source.headers, JSONResponse(content=content, status_code=status_code))


async def envelope_middleware(request: Request, call_next) -> Response:
    path = request.url.path
    if not path.startswith("/api/v1") or path.startswith("/api/v1/uploads"):
        return await call_next(request)

    response = await call_next(request)
    content_type = response.headers.get("content-type", "")

    if "text/event-stream" in content_type:
        return response
    if "application/json" not in content_type and response.status_code != 204:
        return response

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    if response.status_code == 204 or not body:
        return _envelope_json_response(response, success())

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(content=body, status_code=response.status_code, headers=dict(response.headers))

    if is_enveloped(payload):
        return _envelope_json_response(response, payload, status_code=response.status_code)

    if response.status_code >= 400:
        msg = "请求失败"
        data: Any = {}
        if isinstance(payload, dict) and "detail" in payload:
            detail = payload["detail"]
            if isinstance(detail, str):
                msg = detail
            elif isinstance(detail, list):
                if detail and all(isinstance(x, str) for x in detail):
                    msg = "；".join(detail)
                elif detail and all(isinstance(x, dict) for x in detail):
                    msg = "请求参数校验失败"
                    data = detail
                else:
                    msg = "请求参数校验失败"
                    data = detail
        elif isinstance(payload, list):
            msg = "请求参数校验失败"
            data = payload
        return _envelope_json_response(response, fail(msg=msg, data=data), status_code=response.status_code)

    return _envelope_json_response(response, success(payload), status_code=response.status_code)
