"""Skill 包校验与文件 IO。"""

from __future__ import annotations

import re
import shutil
import tempfile
import zipfile
from pathlib import Path

import yaml

from app.core.config import get_settings

SKILL_NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
FRONTMATTER_RE = re.compile(r"^---\s*\r?\n(.*?)\r?\n---\s*(?:\r?\n|$)", re.DOTALL)


class SkillValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def skills_root() -> Path:
    settings = get_settings()
    root = Path(settings.upload_dir) / "skills"
    root.mkdir(parents=True, exist_ok=True)
    return root


def validate_skill_name(name: str) -> list[str]:
    errors: list[str] = []
    if not name or len(name) > 64:
        errors.append("name 长度须在 1～64 字符之间")
    elif not SKILL_NAME_RE.match(name):
        errors.append("name 仅允许小写字母、数字与单连字符，且不能以连字符开头或结尾，不能含连续连字符")
    elif "--" in name:
        errors.append("name 不能包含连续连字符 --")
    return errors


def parse_skill_md(content: str) -> tuple[dict[str, object], str, list[str]]:
    errors: list[str] = []
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}, content, ["SKILL.md 缺少合法 YAML frontmatter（--- 包裹）"]

    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:
        return {}, content, [f"frontmatter YAML 解析失败: {exc}"]

    if not isinstance(meta, dict):
        errors.append("frontmatter 必须是 YAML 对象")
        meta = {}

    body = content[match.end() :]
    return meta, body, errors


def validate_skill_frontmatter(meta: dict[str, object], *, expected_name: str | None = None) -> list[str]:
    errors: list[str] = []
    name = meta.get("name")
    description = meta.get("description")

    if not isinstance(name, str):
        errors.append("frontmatter.name 必填且为字符串")
    else:
        errors.extend(validate_skill_name(name))
        if expected_name and name != expected_name:
            errors.append(f"frontmatter.name ({name}) 与目录名 ({expected_name}) 不一致")

    if not isinstance(description, str) or not description.strip():
        errors.append("frontmatter.description 必填且为非空字符串")
    elif len(description) > 1024:
        errors.append("frontmatter.description 不能超过 1024 字符")

    return errors


def validate_skill_md_content(content: str, *, expected_name: str | None = None) -> tuple[dict[str, object], str]:
    meta, body, errors = parse_skill_md(content)
    errors.extend(validate_skill_frontmatter(meta, expected_name=expected_name))
    if errors:
        raise SkillValidationError(errors)
    return meta, body


def skill_dir(name: str) -> Path:
    return skills_root() / name


def skill_md_path(name: str) -> Path:
    return skill_dir(name) / "SKILL.md"


def read_skill_body(name: str) -> str:
    path = skill_md_path(name)
    if not path.is_file():
        return ""
    _, body, errors = parse_skill_md(path.read_text(encoding="utf-8"))
    if errors:
        return ""
    return body.strip()


def write_skill_md(name: str, description: str, body: str = "") -> str:
    name_errors = validate_skill_name(name)
    if name_errors:
        raise SkillValidationError(name_errors)
    if not description.strip() or len(description) > 1024:
        raise SkillValidationError(["description 须为 1～1024 字符"])

    target = skill_dir(name)
    target.mkdir(parents=True, exist_ok=True)
    content = (
        "---\n"
        f"name: {name}\n"
        f"description: {description}\n"
        "---\n\n"
        f"{body.strip()}\n"
    )
    validate_skill_md_content(content, expected_name=name)
    skill_md_path(name).write_text(content, encoding="utf-8")
    return str(target)


def extract_zip_to_skill(zip_bytes: bytes) -> tuple[str, str, str]:
    if not zip_bytes:
        raise SkillValidationError(["上传文件为空"])

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        zip_path = tmp_path / "upload.zip"
        zip_path.write_bytes(zip_bytes)

        if not zipfile.is_zipfile(zip_path):
            raise SkillValidationError(["上传文件不是有效的 zip"])

        with zipfile.ZipFile(zip_path) as zf:
            if len(zf.infolist()) > 200:
                raise SkillValidationError(["zip 内文件过多（上限 200）"])
            total_size = sum(info.file_size for info in zf.infolist())
            if total_size > 5 * 1024 * 1024:
                raise SkillValidationError(["zip 解压后总大小不能超过 5MB"])
            zf.extractall(tmp_path / "extract")

        extract_root = tmp_path / "extract"
        skill_root = _resolve_skill_root(extract_root)
        skill_md = skill_root / "SKILL.md"
        if not skill_md.is_file():
            raise SkillValidationError(["Skill 包根目录须包含 SKILL.md"])

        raw = skill_md.read_text(encoding="utf-8")
        meta, _body = validate_skill_md_content(raw)
        skill_name = str(meta.get("name", "")).strip()
        name_errors = validate_skill_name(skill_name)
        if name_errors:
            raise SkillValidationError(name_errors)
        description = str(meta.get("description", ""))

        dest = skill_dir(skill_name)
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(skill_root, dest)
        return skill_name, description, str(dest)


def _resolve_skill_root(extract_root: Path) -> Path:
    if (extract_root / "SKILL.md").is_file():
        return extract_root

    children = [
        path
        for path in extract_root.iterdir()
        if path.is_dir() and not path.name.startswith("__MACOSX") and not path.name.startswith(".")
    ]
    if len(children) == 1:
        only = children[0]
        if (only / "SKILL.md").is_file():
            return only
        nested = [
            path
            for path in only.iterdir()
            if path.is_dir() and not path.name.startswith("__MACOSX") and not path.name.startswith(".")
        ]
        if len(nested) == 1 and (nested[0] / "SKILL.md").is_file():
            return nested[0]

    candidates: list[Path] = []
    for skill_md in extract_root.rglob("SKILL.md"):
        if any(part.startswith("__MACOSX") or part.startswith(".") for part in skill_md.parts):
            continue
        candidates.append(skill_md.parent)
    unique = list(dict.fromkeys(candidates))
    if len(unique) == 1:
        return unique[0]

    raise SkillValidationError(
        [
            "zip 内须包含 SKILL.md（可在根目录、唯一子目录，或仅一处 skill 目录中）",
            "SKILL.md 须含 YAML frontmatter，其中 name 为小写字母/数字/连字符，description 为说明文字",
        ]
    )


def remove_skill_dir(name: str) -> None:
    path = skill_dir(name)
    if path.exists():
        shutil.rmtree(path)


def minimal_skill_template(name: str, description: str) -> str:
    return (
        "---\n"
        f"name: {name}\n"
        f"description: {description}\n"
        "---\n\n"
        "# Skill 说明\n\n"
        "在此编写 AI 写作指引。\n"
    )
