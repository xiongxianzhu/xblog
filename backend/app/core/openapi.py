"""OpenAPI：文档中展示统一 { code, msg, data } 响应结构。"""

from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

_HTTP_METHODS = frozenset({"get", "post", "put", "patch", "delete", "head", "options"})
_SKIP_PATH_PREFIXES = ("/api/v1/uploads",)
_SKIP_OPERATIONS = {("/api/v1/admin/ai/complete", "post")}

_ENVELOPE_DESCRIPTION = (
    "非流式 JSON 接口统一返回 `{ code, msg, data }`：`code=0` 成功，`code=-1` 失败（可自定义其它 code），"
    "`data` 可为 `{}` 或 `[]`。SSE 流式接口（如 AI complete）不在此约定内。"
)

_API_ERROR_RESPONSE = {
    "type": "object",
    "properties": {
        "code": {"type": "integer", "example": -1, "description": "非 0 表示失败，默认 -1"},
        "msg": {"type": "string", "example": "请求失败"},
        "data": {
            "description": "附加信息，可为 {} 或 []",
            "oneOf": [
                {"type": "object", "additionalProperties": True},
                {"type": "array", "items": {}},
            ],
        },
    },
    "required": ["code", "msg", "data"],
}

_EMPTY_DATA_SCHEMA: dict[str, Any] = {"type": "object", "additionalProperties": True}


def _wrap_data_schema(data_schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "code": {"type": "integer", "example": 0, "description": "0 表示成功"},
            "msg": {"type": "string", "example": "ok"},
            "data": data_schema,
        },
        "required": ["code", "msg", "data"],
    }


def _schema_ref_name(schema: dict[str, Any]) -> str | None:
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
        return ref.rsplit("/", 1)[-1]
    return None


def _ensure_wrapped_schema(
    original: dict[str, Any],
    components: dict[str, Any],
    cache: dict[str, str],
) -> dict[str, Any]:
    ref_name = _schema_ref_name(original)
    if ref_name:
        cache_key = f"ref:{ref_name}"
        if cache_key in cache:
            return {"$ref": f"#/components/schemas/{cache[cache_key]}"}
        wrapped_name = f"Envelope_{ref_name}"
        schemas = components.setdefault("schemas", {})
        source = {"$ref": f"#/components/schemas/{ref_name}"} if ref_name in schemas else original
        schemas[wrapped_name] = _wrap_data_schema(source)
        cache[cache_key] = wrapped_name
        return {"$ref": f"#/components/schemas/{wrapped_name}"}

    cache_key = f"inline:{json.dumps(original, sort_keys=True)}"
    if cache_key in cache:
        return {"$ref": f"#/components/schemas/{cache[cache_key]}"}
    wrapped_name = f"EnvelopeInline{len(cache)}"
    components.setdefault("schemas", {})[wrapped_name] = _wrap_data_schema(original)
    cache[cache_key] = wrapped_name
    return {"$ref": f"#/components/schemas/{wrapped_name}"}


def _transform_responses(
    responses: dict[str, Any],
    components: dict[str, Any],
    cache: dict[str, str],
) -> dict[str, Any]:
    transformed: dict[str, Any] = {}
    empty_success = _ensure_wrapped_schema(_EMPTY_DATA_SCHEMA, components, cache)
    error_ref = {"$ref": "#/components/schemas/ApiErrorResponse"}

    for status_code, response in responses.items():
        if status_code == "204":
            transformed["200"] = {
                "description": response.get("description", "Successful Response"),
                "content": {"application/json": {"schema": empty_success}},
            }
            continue

        content = response.get("content", {})
        json_content = content.get("application/json")
        if not json_content:
            transformed[status_code] = response
            continue

        original_schema = json_content.get("schema", {})
        if status_code.startswith("2"):
            wrapped = _ensure_wrapped_schema(original_schema, components, cache)
            transformed[status_code] = {
                **response,
                "content": {"application/json": {**json_content, "schema": wrapped}},
            }
        else:
            transformed[status_code] = {
                **response,
                "content": {"application/json": {"schema": error_ref}},
            }

    return transformed


def apply_envelope_to_openapi(schema: dict[str, Any]) -> None:
    components = schema.setdefault("components", {})
    components.setdefault("schemas", {})["ApiErrorResponse"] = _API_ERROR_RESPONSE

    cache: dict[str, str] = {}
    for path, path_item in schema.get("paths", {}).items():
        if any(path.startswith(prefix) for prefix in _SKIP_PATH_PREFIXES):
            continue
        for method, operation in path_item.items():
            if method not in _HTTP_METHODS:
                continue
            if (path, method) in _SKIP_OPERATIONS:
                continue
            if "responses" in operation:
                operation["responses"] = _transform_responses(operation["responses"], components, cache)


def setup_openapi(app: FastAPI) -> None:
    description = app.description or ""
    if _ENVELOPE_DESCRIPTION not in description:
        app.description = f"{description}\n\n{_ENVELOPE_DESCRIPTION}".strip()

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema

        schema = get_openapi(
            title=app.title,
            version=app.version or "0.1.0",
            openapi_version=app.openapi_version,
            description=app.description,
            routes=app.routes,
        )
        apply_envelope_to_openapi(schema)
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi
