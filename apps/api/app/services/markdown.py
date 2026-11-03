"""Markdown 渲染。"""

from __future__ import annotations

import html
import re

import markdown
from markdown.extensions.codehilite import CodeHiliteExtension
from markdown.extensions.fenced_code import FencedBlockPreprocessor
from markdown.extensions.tables import TableExtension


def _collect_fence_languages(content_md: str) -> list[str]:
    langs: list[str] = []
    for match in FencedBlockPreprocessor.FENCED_BLOCK_RE.finditer(content_md):
        lang = match.group("lang") or ""
        langs.append(lang.strip())
    return langs


def _inject_fence_languages(content_md: str, rendered_html: str) -> str:
    langs = _collect_fence_languages(content_md)
    if not langs:
        return rendered_html

    index = 0

    def replacer(match: re.Match[str]) -> str:
        nonlocal index
        css_class = match.group(1)
        if index < len(langs) and langs[index]:
            lang = html.escape(langs[index], quote=True)
            index += 1
            return f'<div class="{css_class}" data-code-language="{lang}">'
        index += 1
        return match.group(0)

    return re.sub(r'<div class="(highlight)">', replacer, rendered_html)


def render_markdown(content_md: str) -> str:
    rendered = markdown.markdown(
        content_md,
        extensions=[
            "extra",
            "fenced_code",
            CodeHiliteExtension(css_class="highlight", guess_lang=False),
            TableExtension(),
        ],
    )
    return _inject_fence_languages(content_md, rendered)
