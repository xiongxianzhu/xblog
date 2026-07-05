"""Skill 推荐逻辑。"""



from __future__ import annotations



import re

from uuid import UUID



from sqlmodel import select

from sqlmodel.ext.asyncio.session import AsyncSession



from app.models.ai_skill import AiSkill, AiSkillDefault

from app.schemas.ai import AiCompleteAction

from app.services.ai.builtin_skills import (

    builtin_skill_id,

    list_builtin_skill_names,

    parse_builtin_skill_meta,

    resolve_builtin_name,

)

from app.services.ai.skills import SkillRef, read_skill_body_unified



SCENE_BY_ACTION: dict[AiCompleteAction, str] = {

    AiCompleteAction.POLISH: "polish",

    AiCompleteAction.EXPAND: "polish",

    AiCompleteAction.SHORTEN: "polish",

    AiCompleteAction.TITLE: "polish",

    AiCompleteAction.CHAT: "chat",

    AiCompleteAction.GENERATE: "generate",

}



ACTION_KEYWORDS: dict[AiCompleteAction, tuple[str, ...]] = {

    AiCompleteAction.POLISH: ("润色", "改写", "polish"),

    AiCompleteAction.EXPAND: ("扩写", "扩展", "expand"),

    AiCompleteAction.SHORTEN: ("缩写", "精简", "shorten"),

    AiCompleteAction.TITLE: ("标题", "title"),

    AiCompleteAction.CHAT: ("对话", "chat"),

    AiCompleteAction.GENERATE: ("生成", "大纲", "generate"),

}





async def resolve_skill(

    session: AsyncSession,

    *,

    action: AiCompleteAction,

    skill_id: UUID | None,

    user_text: str,

) -> tuple[SkillRef | None, str]:

    if skill_id is not None:

        builtin_name = resolve_builtin_name(skill_id)

        if builtin_name is not None:

            return SkillRef(id=skill_id, name=builtin_name), read_skill_body_unified(builtin_name)

        skill = await session.get(AiSkill, skill_id)

        if skill is None or not skill.enabled:

            return None, ""

        return SkillRef(id=skill.id, name=skill.name), read_skill_body_unified(skill.name)



    scene = SCENE_BY_ACTION.get(action, "polish")

    default_row = await session.get(AiSkillDefault, scene)

    if default_row:
        if default_row.builtin_skill_name:
            name = default_row.builtin_skill_name
            skill_uuid = builtin_skill_id(name)
            return SkillRef(id=skill_uuid, name=name), read_skill_body_unified(name)
        if default_row.skill_id:
            skill = await session.get(AiSkill, default_row.skill_id)
            if skill and skill.enabled:
                return SkillRef(id=skill.id, name=skill.name), read_skill_body_unified(skill.name)



    candidates = await _list_recommend_candidates(session)

    if not candidates:

        return None, ""



    tokens = _tokenize(user_text)

    tokens.update(ACTION_KEYWORDS.get(action, ()))

    best: SkillRef | None = None

    best_description = ""

    best_score = 0

    for ref, description in candidates:

        score = _score_description(description, tokens)

        if score > best_score:

            best_score = score

            best = ref

            best_description = description



    if best and best_score > 0:

        return best, read_skill_body_unified(best.name)

    return None, ""





async def _list_recommend_candidates(session: AsyncSession) -> list[tuple[SkillRef, str]]:

    db_skills = list((await session.exec(select(AiSkill).where(AiSkill.enabled.is_(True)))).all())

    db_names = {skill.name for skill in db_skills}

    items: list[tuple[SkillRef, str]] = []

    for name in list_builtin_skill_names():

        if name in db_names:

            continue

        _, description = parse_builtin_skill_meta(name)

        items.append((SkillRef(id=builtin_skill_id(name), name=name), description))

    for skill in db_skills:

        items.append((SkillRef(id=skill.id, name=skill.name), skill.description))

    return items





def _tokenize(text: str) -> set[str]:

    parts = re.findall(r"[\w\u4e00-\u9fff]+", text.lower())

    return {p for p in parts if len(p) >= 2}





def _score_description(description: str, tokens: set[str]) -> int:

    desc = description.lower()

    return sum(1 for token in tokens if token in desc)

