"""LLM 出站请求：OpenAI 兼容与 Anthropic Messages。"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException, status

from app.models.ai_provider import AiProvider, AiProviderType


def is_anthropic_provider(provider: AiProvider) -> bool:
    return provider.provider_type == AiProviderType.ANTHROPIC.value


def _split_anthropic_messages(messages: list[dict[str, str]]) -> tuple[str, list[dict[str, str]]]:
    system_parts: list[str] = []
    conversation: list[dict[str, str]] = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        if role == "system":
            system_parts.append(content)
        elif role in {"user", "assistant"}:
            conversation.append({"role": role, "content": content})
    if not conversation:
        conversation = [{"role": "user", "content": "ping"}]
    return "\n\n".join(system_parts), conversation


async def stream_llm(
    provider: AiProvider,
    api_key: str,
    messages: list[dict[str, str]],
) -> AsyncIterator[dict[str, object]]:
    if is_anthropic_provider(provider):
        async for chunk in _anthropic_stream(provider, api_key, messages):
            yield chunk
        return
    async for chunk in _openai_stream(provider, api_key, messages):
        yield chunk


def _extract_reasoning_delta(delta: dict[str, object]) -> str | None:
    for key in ("reasoning_content", "reasoning", "thinking"):
        value = delta.get(key)
        if isinstance(value, str) and value:
            return value
    return None


async def test_llm_connection(provider: AiProvider, api_key: str) -> tuple[bool, str]:
    if is_anthropic_provider(provider):
        return await _test_anthropic(provider, api_key)
    return await _test_openai(provider, api_key)


async def _test_openai(provider: AiProvider, api_key: str) -> tuple[bool, str]:
    url = f"{provider.base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if provider.extra_headers:
        headers.update(provider.extra_headers)
    payload = {
        "model": provider.model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            return False, response.text[:500]
        return True, "连接成功"
    except httpx.HTTPError as exc:
        return False, str(exc)


async def _test_anthropic(provider: AiProvider, api_key: str) -> tuple[bool, str]:
    url = f"{provider.base_url.rstrip('/')}/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    if provider.extra_headers:
        headers.update(provider.extra_headers)
    payload = {
        "model": provider.model,
        "max_tokens": 5,
        "messages": [{"role": "user", "content": "ping"}],
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            return False, response.text[:500]
        return True, "连接成功"
    except httpx.HTTPError as exc:
        return False, str(exc)


async def _openai_stream(
    provider: AiProvider,
    api_key: str,
    messages: list[dict[str, str]],
) -> AsyncIterator[dict[str, object]]:
    url = f"{provider.base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if provider.extra_headers:
        headers.update(provider.extra_headers)
    body = {"model": provider.model, "messages": messages, "stream": True, "stream_options": {"include_usage": True}}

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=body, headers=headers) as response:
                if response.status_code >= 400:
                    text = await response.aread()
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=text.decode("utf-8", errors="replace")[:500],
                    )
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        payload = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if payload.get("usage"):
                        usage = payload["usage"]
                        yield {
                            "type": "usage",
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                        }
                    choices = payload.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    reasoning = _extract_reasoning_delta(delta)
                    if reasoning:
                        yield {"type": "thinking", "content": reasoning}
                    content = delta.get("content")
                    if content:
                        yield {"type": "delta", "content": content}
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


async def _anthropic_stream(
    provider: AiProvider,
    api_key: str,
    messages: list[dict[str, str]],
) -> AsyncIterator[dict[str, object]]:
    system, conversation = _split_anthropic_messages(messages)
    url = f"{provider.base_url.rstrip('/')}/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    if provider.extra_headers:
        headers.update(provider.extra_headers)
    body: dict[str, object] = {
        "model": provider.model,
        "max_tokens": 4096,
        "messages": conversation,
        "stream": True,
    }
    if system:
        body["system"] = system

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=body, headers=headers) as response:
                if response.status_code >= 400:
                    text = await response.aread()
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=text.decode("utf-8", errors="replace")[:500],
                    )
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        payload = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    event_type = payload.get("type")
                    if event_type == "content_block_delta":
                        delta = payload.get("delta") or {}
                        if delta.get("type") == "thinking_delta":
                            thinking = delta.get("thinking")
                            if thinking:
                                yield {"type": "thinking", "content": thinking}
                        text = delta.get("text")
                        if text:
                            yield {"type": "delta", "content": text}
                    elif event_type == "message_delta":
                        usage = payload.get("usage") or {}
                        yield {
                            "type": "usage",
                            "prompt_tokens": usage.get("input_tokens", 0),
                            "completion_tokens": usage.get("output_tokens", 0),
                        }
                    elif event_type == "message_start":
                        message = payload.get("message") or {}
                        usage = message.get("usage") or {}
                        if usage.get("input_tokens"):
                            yield {
                                "type": "usage",
                                "prompt_tokens": usage.get("input_tokens", 0),
                                "completion_tokens": usage.get("output_tokens", 0),
                            }
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
