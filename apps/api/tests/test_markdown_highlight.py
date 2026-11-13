"""Language-specific highlighting remains server-rendered and safely escaped."""

import pytest

from app.services.markdown import render_markdown


@pytest.mark.parametrize(
    ("language", "source", "token"),
    [
        ("python", "def greet():\n    return 'hello'", 'class="k"'),
        ("javascript", "const answer = 42;", 'class="kd"'),
        ("sql", "SELECT * FROM users;", 'class="k"'),
        ("json", '{"name": "hello"}', 'class="nt"'),
    ],
)
def test_language_highlight(language: str, source: str, token: str) -> None:
    rendered = render_markdown(f"```{language}\n{source}\n```")
    assert f'data-code-language="{language}"' in rendered
    assert token in rendered


def test_unknown_language_and_html_stay_literal() -> None:
    rendered = render_markdown('```unknown-language\n<script>alert(1)</script>\n```')
    assert '<script>' not in rendered
    assert '&lt;script&gt;' in rendered
    assert 'data-code-language="unknown-language"' in rendered


def test_mermaid_keeps_language_for_diagram_renderer() -> None:
    rendered = render_markdown('```mermaid\ngraph TD\nA --> B\n```')
    assert 'data-code-language="mermaid"' in rendered
