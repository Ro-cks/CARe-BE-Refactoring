from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.face import router as face_router
from app.api.routes.health import router as health_router
from app.api.routes.document import router as document_router
from app.api.routes.scratch_compare import router as scratch_compare_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="CARe Verify API",
        version="1.0.0",
        description="Face verification, OCR, scratch comparison service.",
        root_path="/ai",
    )
    cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5174")
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(face_router, prefix="/api/v1")
    app.include_router(document_router, prefix="/api/v1")
    app.include_router(scratch_compare_router, prefix="/api/v1")

    return app


app = create_app()
