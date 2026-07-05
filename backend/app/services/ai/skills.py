"""Skill 业务服务。"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.timezone import now
from app.models.ai_skill import AiSkill, AiSkillDefault
from app.schemas.ai import AiSkillCreate, AiSkillDefaults, AiSkillDefaultsUpdate, AiSkillPublic, AiSkillUpdate
from app.services.ai.builtin_skills import (
    builtin_skill_id,
    is_builtin_skill_id,
    is_builtin_skill_name,
    list_builtin_skill_names,
    parse_builtin_skill_meta,
    read_builtin_skill_md,
    resolve_builtin_name,
)
from app.services.ai.skills_io import (
    SkillValidationError,
    extract_zip_to_skill,
    read_skill_body,
    remove_skill_dir,
    skill_md_path,
    validate_skill_md_content,
    write_skill_md,
)

SCENES = ("polish", "chat", "generate")


@dataclass(frozen=True)
class SkillRef:
    id: UUID
    name: str


def read_skill_body_unified(name: str) -> str:
    if is_builtin_skill_name(name):
        from app.services.ai.builtin_skills import read_builtin_skill_body

        return read_builtin_skill_body(name)
    return read_skill_body(name)


def to_skill_public(skill: AiSkill, *, is_builtin: bool = False) -> AiSkillPublic:
    return AiSkillPublic(
        id=skill.id,
        name=skill.name,
        description=skill.description,
        enabled=skill.enabled,
        is_builtin=is_builtin,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
    )


def to_builtin_skill_public(name: str) -> AiSkillPublic:
    _, description = parse_builtin_skill_meta(name)
    return AiSkillPublic(
        id=builtin_skill_id(name),
        name=name,
        description=description,
        enabled=True,
        is_builtin=True,
        created_at=None,
        updated_at=None,
    )


async def list_skills(session: AsyncSession) -> list[AiSkillPublic]:
    result = await session.exec(select(AiSkill).order_by(AiSkill.name.asc()))
    db_skills = result.all()
    db_names = {row.name for row in db_skills}
    items = [to_builtin_skill_public(name) for name in list_builtin_skill_names() if name not in db_names]
    items.extend(to_skill_public(row) for row in db_skills)
    return items


async def get_skill(session: AsyncSession, skill_id: UUID) -> AiSkill:
    builtin_name = resolve_builtin_name(skill_id)
    if builtin_name is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="内置 Skill 不可通过数据库 ID 访问")
    skill = await session.get(AiSkill, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


def _reject_builtin_mutation(skill_id: UUID) -> None:
    if is_builtin_skill_id(skill_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="内置 Skill 不可编辑或删除")


async def create_skill(session: AsyncSession, payload: AiSkillCreate) -> AiSkillPublic:
    name = payload.name.strip()
    if is_builtin_skill_name(name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该 name 为内置 Skill，请换一个名称")
    existing = await session.exec(select(AiSkill).where(AiSkill.name == name))
    if existing.first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Skill name 已存在")
    try:
        storage_path = write_skill_md(payload.name.strip(), payload.description.strip())
    except SkillValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc

    skill = AiSkill(
        name=payload.name.strip(),
        description=payload.description.strip(),
        storage_path=storage_path,
        enabled=payload.enabled,
    )
    session.add(skill)
    await session.flush()
    await session.refresh(skill)
    return to_skill_public(skill)


async def upload_skill_zip(session: AsyncSession, zip_bytes: bytes) -> AiSkillPublic:
    try:
        name, description, storage_path = extract_zip_to_skill(zip_bytes)
    except SkillValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc

    if is_builtin_skill_name(name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该 name 为内置 Skill，请换一个名称")

    existing = await session.exec(select(AiSkill).where(AiSkill.name == name))
    skill = existing.first()
    if skill:
        skill.description = description
        skill.storage_path = storage_path
        skill.enabled = True
        skill.updated_at = now()
    else:
        skill = AiSkill(name=name, description=description, storage_path=storage_path, enabled=True)
        session.add(skill)
    await session.flush()
    await session.refresh(skill)
    return to_skill_public(skill)


async def update_skill(session: AsyncSession, skill_id: UUID, payload: AiSkillUpdate) -> AiSkillPublic:
    _reject_builtin_mutation(skill_id)
    skill = await get_skill(session, skill_id)
    if payload.description is not None:
        skill.description = payload.description.strip()
        body = read_skill_body(skill.name)
        full = f"---\nname: {skill.name}\ndescription: {skill.description}\n---\n\n{body}\n"
        try:
            validate_skill_md_content(full, expected_name=skill.name)
        except SkillValidationError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc
        skill_md_path(skill.name).write_text(full, encoding="utf-8")
    if payload.enabled is not None:
        skill.enabled = payload.enabled
    skill.updated_at = now()
    session.add(skill)
    await session.flush()
    await session.refresh(skill)
    return to_skill_public(skill)


async def delete_skill(session: AsyncSession, skill_id: UUID) -> None:
    _reject_builtin_mutation(skill_id)
    skill = await get_skill(session, skill_id)
    for scene in SCENES:
        row = await session.get(AiSkillDefault, scene)
        if row and row.skill_id == skill.id:
            row.skill_id = None
            session.add(row)
    remove_skill_dir(skill.name)
    await session.delete(skill)


async def get_skill_content(session: AsyncSession, skill_id: UUID) -> str:
    builtin_name = resolve_builtin_name(skill_id)
    if builtin_name is not None:
        return read_builtin_skill_md(builtin_name)
    skill = await get_skill(session, skill_id)
    path = skill_md_path(skill.name)
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKILL.md 不存在")
    return path.read_text(encoding="utf-8")


async def update_skill_content(session: AsyncSession, skill_id: UUID, content: str) -> str:
    _reject_builtin_mutation(skill_id)
    skill = await get_skill(session, skill_id)
    try:
        meta, _body = validate_skill_md_content(content, expected_name=skill.name)
    except SkillValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from exc
    skill.description = str(meta.get("description", skill.description))
    skill.updated_at = now()
    skill_md_path(skill.name).write_text(content, encoding="utf-8")
    session.add(skill)
    await session.flush()
    return content


async def get_skill_defaults(session: AsyncSession) -> AiSkillDefaults:
    rows = {row.scene: row for row in (await session.exec(select(AiSkillDefault))).all()}
    return AiSkillDefaults(
        polish=_default_skill_id(rows.get("polish")),
        chat=_default_skill_id(rows.get("chat")),
        generate=_default_skill_id(rows.get("generate")),
    )


def _default_skill_id(row: AiSkillDefault | None) -> UUID | None:
    if row is None:
        return None
    if row.builtin_skill_name:
        return builtin_skill_id(row.builtin_skill_name)
    return row.skill_id


async def update_skill_defaults(session: AsyncSession, payload: AiSkillDefaultsUpdate) -> AiSkillDefaults:
    data = payload.model_dump(exclude_unset=True)
    for scene in SCENES:
        if scene not in data:
            continue
        skill_id = data[scene]
        row = await session.get(AiSkillDefault, scene)
        if row is None:
            row = AiSkillDefault(scene=scene)

        if skill_id is None:
            row.skill_id = None
            row.builtin_skill_name = None
        elif is_builtin_skill_id(skill_id):
            builtin_name = resolve_builtin_name(skill_id)
            if builtin_name is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid builtin skill")
            row.skill_id = None
            row.builtin_skill_name = builtin_name
        else:
            skill = await get_skill(session, skill_id)
            if not skill.enabled:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Skill {skill.name} 未启用")
            row.skill_id = skill_id
            row.builtin_skill_name = None

        session.add(row)
    await session.flush()
    return await get_skill_defaults(session)


async def count_enabled_skills(session: AsyncSession) -> int:
    all_db = list((await session.exec(select(AiSkill))).all())
    db_names = {row.name for row in all_db}
    enabled_db = sum(1 for row in all_db if row.enabled)
    builtin_count = sum(1 for name in list_builtin_skill_names() if name not in db_names)
    return enabled_db + builtin_count
