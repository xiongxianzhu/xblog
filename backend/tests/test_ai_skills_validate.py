"""Skill 校验测试。"""

from __future__ import annotations

import pytest

from app.services.ai.skills_io import SkillValidationError, extract_zip_to_skill, validate_skill_md_content, validate_skill_name


def test_validate_skill_name_ok() -> None:
    assert validate_skill_name("blog-polish-zh") == []


def test_validate_skill_name_invalid() -> None:
    assert validate_skill_name("-bad") != []
    assert validate_skill_name("Bad") != []


def test_validate_skill_md_ok() -> None:
    content = """---
name: blog-polish-zh
description: 润色中文博客 Markdown。
---

# 说明
"""
    meta, body = validate_skill_md_content(content, expected_name="blog-polish-zh")
    assert meta["name"] == "blog-polish-zh"
    assert "说明" in body


def test_validate_skill_md_missing_frontmatter() -> None:
    with pytest.raises(SkillValidationError) as exc:
        validate_skill_md_content("# no frontmatter\n")
    assert any("frontmatter" in err for err in exc.value.errors)


def test_extract_zip_uses_frontmatter_name() -> None:
    import io
    import zipfile

    content = """---
name: my-skill-name
description: ok
---

# body
"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("different-folder/SKILL.md", content)
    name, description, _ = extract_zip_to_skill(buf.getvalue())
    assert name == "my-skill-name"
    assert description == "ok"
