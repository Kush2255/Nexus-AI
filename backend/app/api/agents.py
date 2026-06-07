"""
Agents API — status, workflow topology, and run history
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db, AgentRun
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

AGENTS = [
    {
        "id":     "planner",
        "name":   "Planner Agent",
        "role":   "Analyzes goals, decomposes into tasks, creates execution plans",
        "status": "ready",
        "icon":   "🧠",
        "color":  "cyan",
        "model":  "LLM + structured output",
    },
    {
        "id":     "researcher",
        "name":   "Research Agent",
        "role":   "Deep LLM-powered synthesis, insight extraction, web search",
        "status": "ready",
        "icon":   "🔬",
        "color":  "emerald",
        "model":  "LLM + DuckDuckGo",
    },
    {
        "id":     "rag",
        "name":   "RAG Retrieval Agent",
        "role":   "Semantic document search via embeddings + vector similarity",
        "status": "ready",
        "icon":   "📚",
        "color":  "violet",
        "model":  "all-MiniLM-L6-v2 + ChromaDB",
    },
    {
        "id":     "critic",
        "name":   "Critic Agent",
        "role":   "Quality scoring, hallucination detection, reflection loops",
        "status": "ready",
        "icon":   "🔍",
        "color":  "amber",
        "model":  "LLM + structured JSON critique",
    },
    {
        "id":     "reporter",
        "name":   "Report Generator",
        "role":   "Structured Markdown + PDF research report generation",
        "status": "ready",
        "icon":   "📄",
        "color":  "rose",
        "model":  "LLM + ReportLab",
    },
]

WORKFLOW = {
    "nodes": [
        {"id": "planner",    "label": "Planner",     "type": "input",     "color": "#00d4ff"},
        {"id": "rag",        "label": "RAG",          "type": "retrieval", "color": "#7c3aed"},
        {"id": "researcher", "label": "Researcher",   "type": "research",  "color": "#10b981"},
        {"id": "critic",     "label": "Critic",       "type": "critique",  "color": "#f59e0b"},
        {"id": "reporter",   "label": "Reporter",     "type": "output",    "color": "#f43f5e"},
    ],
    "edges": [
        {"from": "planner",    "to": "rag",        "label": "queries"},
        {"from": "planner",    "to": "researcher", "label": "plan"},
        {"from": "rag",        "to": "researcher", "label": "context"},
        {"from": "researcher", "to": "critic",     "label": "findings"},
        {"from": "critic",     "to": "researcher", "label": "refine",   "dashed": True},
        {"from": "critic",     "to": "reporter",   "label": "approve"},
    ],
    "description": (
        "LangGraph StateGraph with conditional routing: "
        "critic → researcher (quality < 8) or reporter (quality ≥ 8)"
    ),
}


@router.get("/status")
async def get_agents_status():
    """Get all agent statuses and system info."""
    return {
        "agents":   AGENTS,
        "workflow": "planner → rag + researcher → critic ⟲ → reporter",
        "framework": "LangGraph StateGraph",
        "total_agents": len(AGENTS),
    }


@router.get("/workflow")
async def get_workflow():
    """Return the agent graph topology for visualization."""
    return WORKFLOW


@router.get("/runs")
async def get_agent_runs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Return recent agent run records."""
    try:
        result = await db.execute(
            select(AgentRun)
            .order_by(AgentRun.created_at.desc())
            .limit(limit)
        )
        runs = result.scalars().all()
        return [
            {
                "id":               r.id,
                "session_id":       r.session_id,
                "agent_name":       r.agent_name,
                "status":           r.status,
                "execution_time":   r.execution_time,
                "reflection_count": r.reflection_count,
                "created_at":       r.created_at.isoformat(),
            }
            for r in runs
        ]
    except Exception as e:
        logger.error(f"Agent runs fetch error: {e}")
        return []
