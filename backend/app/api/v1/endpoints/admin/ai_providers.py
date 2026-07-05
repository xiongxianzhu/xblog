"""管理端 AI 模型提供商 API。"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.ai import (
    AiCompleteAction,
    AiProviderCreate,
    AiProviderPublic,
    AiProviderTestResult,
    AiProviderUpdate,
    AiSkillRecommend,
    AiUsageStats,
)
from app.schemas.common import MessageResponse
from app.services.ai.providers import (
    count_enabled_providers,
    create_provider,
    delete_provider,
    get_provider,
    list_providers,
    test_provider,
    to_provider_public,
    update_provider,
)
from app.services.ai.recommend import resolve_skill
from app.services.ai.skills import count_enabled_skills

router = APIRouter()


@router.get("/providers", response_model=list[AiProviderPublic])
async def list_ai_providers(session: SessionDep, _: CurrentUserDep) -> list[AiProviderPublic]:
    return await list_providers(session)


@router.get("/status", response_model=AiUsageStats)
async def ai_status(session: SessionDep, _: CurrentUserDep) -> AiUsageStats:
    return AiUsageStats(
        enabled_providers=await count_enabled_providers(session),
        enabled_skills=await count_enabled_skills(session),
    )


@router.get("/recommend", response_model=AiSkillRecommend)
async def recommend_ai_skill(
    session: SessionDep,
    _: CurrentUserDep,
    action: AiCompleteAction = AiCompleteAction.CHAT,
    text: str = Query(default="", max_length=8000),
) -> AiSkillRecommend:
    skill, _ = await resolve_skill(session, action=action, skill_id=None, user_text=text)
    if skill is None:
        return AiSkillRecommend()
    return AiSkillRecommend(skill_id=skill.id, skill_name=skill.name)


@router.post("/providers", response_model=AiProviderPublic, status_code=status.HTTP_201_CREATED)
async def create_ai_provider(
    payload: AiProviderCreate,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiProviderPublic:
    return await create_provider(session, payload)


@router.get("/providers/{provider_id}", response_model=AiProviderPublic)
async def get_ai_provider(provider_id: UUID, session: SessionDep, _: CurrentUserDep) -> AiProviderPublic:
    provider = await get_provider(session, provider_id)
    return to_provider_public(provider)


@router.patch("/providers/{provider_id}", response_model=AiProviderPublic)
async def patch_ai_provider(
    provider_id: UUID,
    payload: AiProviderUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiProviderPublic:
    return await update_provider(session, provider_id, payload)


@router.delete("/providers/{provider_id}", response_model=MessageResponse)
async def remove_ai_provider(provider_id: UUID, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    await delete_provider(session, provider_id)
    return MessageResponse(message="deleted")


@router.post("/providers/{provider_id}/test", response_model=AiProviderTestResult)
async def test_ai_provider(
    provider_id: UUID,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiProviderTestResult:
    return await test_provider(session, provider_id)
