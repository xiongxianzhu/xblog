"""AI 写作网关：prompt 组装与 SSE 流式调用。"""

from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator

from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.ai_usage_log import AiUsageLog
from app.schemas.ai import ALLOWED_ACTIONS, P1_ACTIONS, AiCompleteAction, AiCompleteRequest
from app.services.ai.llm_client import stream_llm
from app.services.ai.providers import provider_plain_api_key, resolve_active_provider
from app.services.ai.recommend import resolve_skill

BASE_SYSTEM = (
    "你是 xblog 博客写作助手。输出 Markdown，保持结构清晰，不编造外链或虚假事实。"
    "只输出用户请求的内容，不要附加解释性前后缀。"
)

ACTION_INSTRUCTIONS: dict[AiCompleteAction, str] = {
    AiCompleteAction.POLISH: "润色以下 Markdown 选区，修正语病，保持原有结构与语气。",
    AiCompleteAction.EXPAND: "在保持原意的前提下扩写以下 Markdown 选区，增加细节与可读性。",
    AiCompleteAction.SHORTEN: "精简以下 Markdown 选区，保留核心信息。",
    AiCompleteAction.TITLE: "根据以下内容生成一个简洁的中文标题，只输出标题文本，不要引号或 Markdown 标题符号。",
    AiCompleteAction.CHAT: "根据对话与文章上下文回答管理员的问题，必要时给出可直接粘贴的 Markdown 片段。",
    AiCompleteAction.GENERATE: "根据主题与大纲生成完整 Markdown 文章草稿，含合理标题层级。",
}


def _build_messages(payload: AiCompleteRequest, skill_body: str) -> list[dict[str, str]]:
    system_parts = [BASE_SYSTEM]
    if skill_body:
        system_parts.append(f"\n\n## 写作 Skill\n\n{skill_body}")
    system_parts.append(f"\n\n## 当前任务\n\n{ACTION_INSTRUCTIONS[payload.action]}")
    messages: list[dict[str, str]] = [{"role": "system", "content": "".join(system_parts)}]

    if payload.action in P1_ACTIONS:
        selection = (payload.selection.text if payload.selection else "").strip()
        if not selection:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="选区文本不能为空")
        messages.append({"role": "user", "content": selection})
        return messages

    if payload.action == AiCompleteAction.CHAT:
        if not payload.messages:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="对话消息不能为空")
        doc = payload.document
        if doc and (doc.title or doc.content_md):
            summary = doc.content_md[:4000]
            messages.append(
                {
                    "role": "user",
                    "content": f"当前文章标题：{doc.title}\n\n正文摘要：\n{summary}",
                }
            )
        for item in payload.messages:
            role = item.role if item.role in {"user", "assistant"} else "user"
            messages.append({"role": role, "content": item.content})
        return messages

    if payload.action == AiCompleteAction.GENERATE:
        gen = payload.generate
        topic = (gen.topic if gen else "").strip()
        if not topic:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="生成主题不能为空")
        outline = (gen.outline if gen else "").strip()
        user_content = f"主题：{topic}"
        if outline:
            user_content += f"\n\n大纲：\n{outline}"
        messages.append({"role": "user", "content": user_content})
        return messages

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的 action")


def _user_text_for_recommend(payload: AiCompleteRequest) -> str:
    parts: list[str] = []
    if payload.selection and payload.selection.text:
        parts.append(payload.selection.text)
    if payload.document:
        parts.extend([payload.document.title, payload.document.content_md])
    if payload.generate:
        parts.extend([payload.generate.topic, payload.generate.outline])
    for msg in payload.messages:
        parts.append(msg.content)
    return " ".join(parts)


async def stream_complete(
    session: AsyncSession,
    payload: AiCompleteRequest,
) -> AsyncIterator[str]:
    if payload.action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该 action 尚未开放")

    provider = await resolve_active_provider(session, payload.provider_id)
    user_text = _user_text_for_recommend(payload)
    skill, skill_body = await resolve_skill(
        session,
        action=payload.action,
        skill_id=payload.skill_id,
        user_text=user_text,
    )
    messages = _build_messages(payload, skill_body)
    api_key = provider_plain_api_key(provider)

    started = time.perf_counter()
    prompt_tokens = 0
    completion_tokens = 0

    async for chunk in stream_llm(provider, api_key, messages):
        if chunk["type"] == "delta":
            yield _sse("delta", {"content": chunk["content"]})
        elif chunk["type"] == "thinking":
            yield _sse("thinking", {"content": chunk["content"]})
        elif chunk["type"] == "usage":
            prompt_tokens = chunk.get("prompt_tokens", 0)
            completion_tokens = chunk.get("completion_tokens", 0)

    latency_ms = int((time.perf_counter() - started) * 1000)
    session.add(
        AiUsageLog(
            action=payload.action.value,
            provider_id=provider.id,
            skill_id=skill.id if skill else None,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
    )
    yield _sse(
        "done",
        {
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
            },
            "skill_id": str(skill.id) if skill else None,
            "skill_name": skill.name if skill else None,
        },
    )


def _sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
