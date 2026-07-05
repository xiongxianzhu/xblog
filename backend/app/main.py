"""FastAPI 应用入口。"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.openapi import setup_openapi
from app.core.response import envelope_middleware
from app.db.session import engine
from app.services.uploads import get_upload_root


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.middleware("http")(envelope_middleware)
    setup_openapi(app)
    app.include_router(api_router, prefix="/api/v1")
    upload_root = get_upload_root()
    upload_root.mkdir(parents=True, exist_ok=True)
    app.mount("/api/v1/uploads", StaticFiles(directory=str(upload_root)), name="uploads")
    return app


app = create_app()
