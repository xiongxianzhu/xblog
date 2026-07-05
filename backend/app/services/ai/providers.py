"""模型提供商 CRUD 与连接测试。"""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import now
from app.models.ai_provider import AiProvider
from app.schemas.ai import AiProviderCreate, AiProviderPublic, AiProviderTestResult, AiProviderUpdate
from app.services.ai.crypto import decrypt_api_key, encrypt_api_key
from app.services.ai.llm_client import test_llm_connection


def to_provider_public(provider: AiProvider) -> AiProviderPublic:
    return AiProviderPublic(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        base_url=provider.base_url.rstrip("/"),
        model=provider.model,
        has_api_key=bool(provider.api_key_encrypted),
        enabled=provider.enabled,
        is_default=provider.is_default,
        extra_headers=provider.extra_headers,
        created_at=provider.created_at,
        updated_at=provider.updated_at,
    )


async def list_providers(session: AsyncSession) -> list[AiProviderPublic]:
    result = await session.exec(select(AiProvider).order_by(AiProvider.created_at.desc()))
    return [to_provider_public(row) for row in result.all()]


async def get_provider(session: AsyncSession, provider_id: UUID) -> AiProvider:
    provider = await session.get(AiProvider, provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider


async def _clear_other_defaults(session: AsyncSession, keep_id: UUID | None = None) -> None:
    result = await session.exec(select(AiProvider).where(AiProvider.is_default.is_(True)))
    for row in result.all():
        if keep_id is None or row.id != keep_id:
            row.is_default = False
            session.add(row)


async def create_provider(session: AsyncSession, payload: AiProviderCreate) -> AiProviderPublic:
    if payload.is_default:
        await _clear_other_defaults(session)
    if payload.enabled and payload.is_default is False:
        pass
    provider = AiProvider(
        name=payload.name.strip(),
        provider_type=payload.provider_type.value,
        base_url=payload.base_url.strip().rstrip("/"),
        model=payload.model.strip(),
        enabled=payload.enabled,
        is_default=payload.is_default,
        extra_headers=payload.extra_headers,
    )
    if payload.api_key:
        provider.api_key_encrypted = encrypt_api_key(payload.api_key.strip())
    session.add(provider)
    await session.flush()
    await session.refresh(provider)
    return to_provider_public(provider)


async def update_provider(session: AsyncSession, provider_id: UUID, payload: AiProviderUpdate) -> AiProviderPublic:
    provider = await get_provider(session, provider_id)
    if payload.name is not None:
        provider.name = payload.name.strip()
    if payload.provider_type is not None:
        provider.provider_type = payload.provider_type.value
    if payload.base_url is not None:
        provider.base_url = payload.base_url.strip().rstrip("/")
    if payload.model is not None:
        provider.model = payload.model.strip()
    if payload.extra_headers is not None:
        provider.extra_headers = payload.extra_headers
    if payload.api_key is not None:
        if payload.api_key == "":
            provider.api_key_encrypted = None
        else:
            provider.api_key_encrypted = encrypt_api_key(payload.api_key.strip())
    if payload.enabled is not None:
        provider.enabled = payload.enabled
        if not provider.enabled:
            provider.is_default = False
    if payload.is_default is not None:
        if payload.is_default:
            if not provider.enabled:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="未激活的提供商不能设为默认")
            await _clear_other_defaults(session, keep_id=provider.id)
            provider.is_default = True
        else:
            provider.is_default = False
    provider.updated_at = now()
    session.add(provider)
    await session.flush()
    await session.refresh(provider)
    return to_provider_public(provider)


async def delete_provider(session: AsyncSession, provider_id: UUID) -> None:
    provider = await get_provider(session, provider_id)
    await session.delete(provider)


async def resolve_active_provider(session: AsyncSession, provider_id: UUID | None) -> AiProvider:
    if provider_id is not None:
        provider = await get_provider(session, provider_id)
        if not provider.enabled:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该提供商未激活")
        if not provider.api_key_encrypted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该提供商未配置 API Key")
        return provider

    result = await session.exec(
        select(AiProvider).where(AiProvider.enabled.is_(True), AiProvider.is_default.is_(True))
    )
    provider = result.first()
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未配置已激活的默认模型提供商，请前往设置 → AI 模型",
        )
    if not provider.api_key_encrypted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="默认提供商未配置 API Key")
    return provider


async def count_enabled_providers(session: AsyncSession) -> int:
    result = await session.exec(select(AiProvider).where(AiProvider.enabled.is_(True)))
    return len(list(result.all()))


def provider_plain_api_key(provider: AiProvider) -> str:
    if not provider.api_key_encrypted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="提供商未配置 API Key")
    try:
        return decrypt_api_key(provider.api_key_encrypted)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


async def test_provider(session: AsyncSession, provider_id: UUID) -> AiProviderTestResult:
    provider = await get_provider(session, provider_id)
    api_key = provider_plain_api_key(provider)
    started = time.perf_counter()
    ok, message = await test_llm_connection(provider, api_key)
    latency_ms = int((time.perf_counter() - started) * 1000)
    return AiProviderTestResult(ok=ok, latency_ms=latency_ms, message=message)
