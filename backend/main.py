"""
Multi-Agent Autonomous AI Research Assistant
Main FastAPI Application — Complete Production Entry Point
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.api import chat, documents, agents, reports
from app.api.streaming import router as streaming_router
from app.api.analytics import router as analytics_router
from app.api.export import router as export_router
from app.models.database import init_db
from app.utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

DATA_DIRS = ["./data/uploads", "./data/chroma", "./data/reports", "./data/exports"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  NEXUS AI - Multi-Agent Research Assistant")
    logger.info("=" * 60)
    for d in DATA_DIRS:
        os.makedirs(d, exist_ok=True)
    await init_db()
    logger.info("Database initialized")
    logger.info("Skipping RAG initialization during startup")
    logger.info("Skipping LLM service initialization during startup")
    logger.info("Skipping memory manager initialization during startup")
    logger.info(f"Ready at http://localhost:{os.getenv('API_PORT', 8000)}")
    logger.info(f"API Docs: http://localhost:{os.getenv('API_PORT', 8000)}/docs")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="NEXUS AI - Multi-Agent Research Assistant",
    description="Autonomous multi-agent system with RAG, LangGraph, and reflection loops",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("API_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


os.makedirs("./data/reports", exist_ok=True)
app.mount("/reports", StaticFiles(directory="./data/reports"), name="reports")

app.include_router(chat.router,         prefix="/api/chat",      tags=["Chat"])
app.include_router(documents.router,    prefix="/api/documents", tags=["Documents"])
app.include_router(agents.router,       prefix="/api/agents",    tags=["Agents"])
app.include_router(reports.router,      prefix="/api/reports",   tags=["Reports"])
app.include_router(streaming_router,    prefix="/api/stream",    tags=["Streaming"])
app.include_router(analytics_router,    prefix="/api/analytics", tags=["Analytics"])
app.include_router(export_router,       prefix="/api/export",    tags=["Export"])


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "NEXUS AI - Multi-Agent Research Assistant",
        "version": "1.0.0",
        "status": "operational",
        "agents": ["planner", "rag_retrieval", "researcher", "critic", "reporter"],
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "timestamp": asyncio.get_event_loop().time()}


@app.get("/api/status", tags=["System"])
async def api_status():
    from app.services.llm_service import LLMService
    llm = LLMService.get_instance()
    return {
        "llm_provider": llm.provider,
        "vector_db": os.getenv("VECTOR_DB", "chroma"),
        "embeddings_model": os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
        "max_reflection_loops": int(os.getenv("MAX_REFLECTION_LOOPS", 3)),
        "chunk_size": int(os.getenv("CHUNK_SIZE", 1000)),
        "top_k_retrieval": int(os.getenv("TOP_K_RETRIEVAL", 5)),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True,
        log_level="info",
    )
