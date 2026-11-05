"""Markdown 渲染。"""

from __future__ import annotations

import html
import re

import markdown
from markdown.extensions.codehilite import CodeHiliteExtension
from markdown.extensions.fenced_code import FencedBlockPreprocessor
from markdown.extensions.md_in_html import HTMLExtractorExtra, HtmlBlockPreprocessor
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


class _AlignedHtmlExtractor(HTMLExtractorExtra):
    def get_state(self, tag, attrs):
        if tag == "div" and attrs.get("align", "").lower() == "center" and "markdown" not in attrs:
            attrs = {**attrs, "markdown": "block"}
        return super().get_state(tag, attrs)


class _AlignedHtmlPreprocessor(HtmlBlockPreprocessor):
    def run(self, lines: list[str]) -> list[str]:
        parser = _AlignedHtmlExtractor(self.md)
        parser.feed("\n".join(lines))
        parser.close()
        return "".join(parser.cleandoc).split("\n")


def render_markdown(content_md: str) -> str:
    renderer = markdown.Markdown(
        extensions=[
            "extra",
            "fenced_code",
            CodeHiliteExtension(css_class="highlight", guess_lang=False),
            TableExtension(),
        ],
    )
    renderer.preprocessors.register(_AlignedHtmlPreprocessor(renderer), "html_block", 20)
    return _inject_fence_languages(content_md, renderer.convert(content_md))
