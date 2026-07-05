"""管理端 AI 写作 complete（SSE）。"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.ai import AiCompleteRequest
from app.services.ai.gateway import _sse, stream_complete
from app.services.ai.rate_limit import check_rate_limit

router = APIRouter()


async def _event_stream(session: AsyncSession, payload: AiCompleteRequest) -> AsyncIterator[str]:
    try:
        async for chunk in stream_complete(session, payload):
            yield chunk
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        yield _sse("error", {"message": detail})


@router.post("/complete")
async def ai_complete(
    payload: AiCompleteRequest,
    session: SessionDep,
    user: CurrentUserDep,
) -> StreamingResponse:
    check_rate_limit(str(user.id))
    return StreamingResponse(
        _event_stream(session, payload),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
