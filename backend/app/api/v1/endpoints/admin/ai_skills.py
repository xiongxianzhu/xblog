"""管理端 Agent Skills API。"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.ai import (
    AiSkillContent,
    AiSkillCreate,
    AiSkillDefaults,
    AiSkillDefaultsUpdate,
    AiSkillPublic,
    AiSkillUpdate,
)
from app.schemas.common import MessageResponse
from app.services.ai.skills import (
    create_skill,
    delete_skill,
    get_skill_content,
    get_skill_defaults,
    list_skills,
    update_skill,
    update_skill_content,
    update_skill_defaults,
    upload_skill_zip,
)

router = APIRouter()


@router.get("/skills", response_model=list[AiSkillPublic])
async def list_ai_skills(session: SessionDep, _: CurrentUserDep) -> list[AiSkillPublic]:
    return await list_skills(session)


@router.post("/skills", response_model=AiSkillPublic, status_code=status.HTTP_201_CREATED)
async def create_ai_skill(payload: AiSkillCreate, session: SessionDep, _: CurrentUserDep) -> AiSkillPublic:
    return await create_skill(session, payload)


@router.post("/skills/upload", response_model=AiSkillPublic)
async def upload_ai_skill(
    session: SessionDep,
    _: CurrentUserDep,
    file: UploadFile = File(..., description="Skill zip 包"),  # noqa: B008
) -> AiSkillPublic:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请上传 .zip 格式的 Skill 包")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="上传文件为空")
    return await upload_skill_zip(session, raw)


@router.patch("/skills/{skill_id}", response_model=AiSkillPublic)
async def patch_ai_skill(
    skill_id: UUID,
    payload: AiSkillUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiSkillPublic:
    return await update_skill(session, skill_id, payload)


@router.delete("/skills/{skill_id}", response_model=MessageResponse)
async def remove_ai_skill(skill_id: UUID, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    await delete_skill(session, skill_id)
    return MessageResponse(message="deleted")


@router.get("/skills/{skill_id}/content", response_model=AiSkillContent)
async def read_ai_skill_content(skill_id: UUID, session: SessionDep, _: CurrentUserDep) -> AiSkillContent:
    content = await get_skill_content(session, skill_id)
    return AiSkillContent(content=content)


@router.patch("/skills/{skill_id}/content", response_model=AiSkillContent)
async def write_ai_skill_content(
    skill_id: UUID,
    payload: AiSkillContent,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiSkillContent:
    content = await update_skill_content(session, skill_id, payload.content)
    return AiSkillContent(content=content)


@router.get("/skill-defaults", response_model=AiSkillDefaults)
async def read_skill_defaults(session: SessionDep, _: CurrentUserDep) -> AiSkillDefaults:
    return await get_skill_defaults(session)


@router.patch("/skill-defaults", response_model=AiSkillDefaults)
async def patch_skill_defaults(
    payload: AiSkillDefaultsUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> AiSkillDefaults:
    return await update_skill_defaults(session, payload)
