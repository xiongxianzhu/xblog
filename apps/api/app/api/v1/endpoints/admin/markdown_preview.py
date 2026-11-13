"""Authenticated syntax preview using the same highlighter as public Markdown."""

from html import escape

from fastapi import APIRouter
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name
from pygments.util import ClassNotFound
from sqlmodel import Field, SQLModel

from app.api.deps import CurrentUserDep

router = APIRouter()


class HighlightRequest(SQLModel):
    language: str = Field(min_length=1, max_length=64)
    code: str = Field(max_length=100_000)


class HighlightResponse(SQLModel):
    html: str


@router.post("/markdown/highlight", response_model=HighlightResponse)
def highlight_code(payload: HighlightRequest, _: CurrentUserDep) -> HighlightResponse:
    try:
        lexer = get_lexer_by_name(payload.language, stripnl=False, ensurenl=False)
    except ClassNotFound:
        return HighlightResponse(html=escape(payload.code))
    return HighlightResponse(html=highlight(payload.code, lexer, HtmlFormatter(nowrap=True)))
