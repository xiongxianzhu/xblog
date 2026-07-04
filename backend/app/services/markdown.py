"""Markdown 渲染。"""

from __future__ import annotations

import markdown
from markdown.extensions.codehilite import CodeHiliteExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.tables import TableExtension


def render_markdown(content_md: str) -> str:
    return markdown.markdown(
        content_md,
        extensions=[
            "extra",
            FencedCodeExtension(),
            CodeHiliteExtension(css_class="highlight"),
            TableExtension(),
        ],
    )
