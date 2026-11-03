"""内置 Agent Skill（只读，随仓库分发）。"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid5

from app.services.ai.skills_io import parse_skill_md

BUILTIN_NAMESPACE = UUID("a3b2c1d0-4e5f-6789-abcd-ef0123456789")


def builtin_skills_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "data" / "builtin_skills"


def list_builtin_skill_names() -> list[str]:
    root = builtin_skills_root()
    if not root.is_dir():
        return []
    return sorted(
        path.name for path in root.iterdir() if path.is_dir() and (path / "SKILL.md").is_file()
    )


def is_builtin_skill_name(name: str) -> bool:
    return name in list_builtin_skill_names()


def builtin_skill_id(name: str) -> UUID:
    return uuid5(BUILTIN_NAMESPACE, f"xblog-builtin-skill:{name}")


def is_builtin_skill_id(skill_id: UUID) -> bool:
    return any(builtin_skill_id(name) == skill_id for name in list_builtin_skill_names())


def resolve_builtin_name(skill_id: UUID) -> str | None:
    for name in list_builtin_skill_names():
        if builtin_skill_id(name) == skill_id:
            return name
    return None


def read_builtin_skill_md(name: str) -> str:
    if not is_builtin_skill_name(name):
        raise FileNotFoundError(name)
    return (builtin_skills_root() / name / "SKILL.md").read_text(encoding="utf-8")


def read_builtin_skill_body(name: str) -> str:
    meta, body, errors = parse_skill_md(read_builtin_skill_md(name))
    if errors:
        return ""
    _ = meta
    return body.strip()


def parse_builtin_skill_meta(name: str) -> tuple[str, str]:
    meta, _, errors = parse_skill_md(read_builtin_skill_md(name))
    if errors:
        raise ValueError("; ".join(errors))
    description = meta.get("description")
    if not isinstance(description, str) or not description.strip():
        raise ValueError("内置 Skill 缺少 description")
    return name, description.strip()
