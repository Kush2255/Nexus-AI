"""
Analytics API
Provides usage statistics and research insights for the dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta

from app.models.database import get_db, ChatSession, ChatMessage, Document, AgentRun, Report
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Return high-level usage statistics for the dashboard."""
    try:
        # Total sessions
        sessions_result = await db.execute(select(func.count(ChatSession.id)))
        total_sessions = sessions_result.scalar() or 0

        # Total messages
        messages_result = await db.execute(select(func.count(ChatMessage.id)))
        total_messages = messages_result.scalar() or 0

        # Total documents
        docs_result = await db.execute(select(func.count(Document.id)))
        total_docs = docs_result.scalar() or 0

        # Total chunks indexed
        chunks_result = await db.execute(select(func.sum(Document.chunk_count)))
        total_chunks = chunks_result.scalar() or 0

        # Total reports
        reports_result = await db.execute(select(func.count(Report.id)))
        total_reports = reports_result.scalar() or 0

        # Sessions last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_sessions_result = await db.execute(
            select(func.count(ChatSession.id)).where(ChatSession.created_at >= week_ago)
        )
        recent_sessions = recent_sessions_result.scalar() or 0

        # Assistant messages (to count actual AI responses)
        ai_responses_result = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.role == "assistant")
        )
        ai_responses = ai_responses_result.scalar() or 0

        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_documents": total_docs,
            "total_chunks_indexed": int(total_chunks),
            "total_reports": total_reports,
            "ai_responses_generated": ai_responses,
            "sessions_last_7_days": recent_sessions,
        }

    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return {
            "total_sessions": 0,
            "total_messages": 0,
            "total_documents": 0,
            "total_chunks_indexed": 0,
            "total_reports": 0,
            "ai_responses_generated": 0,
            "sessions_last_7_days": 0,
        }


@router.get("/activity")
async def get_recent_activity(db: AsyncSession = Depends(get_db)):
    """Return the most recent activity across the system."""
    try:
        # Recent sessions
        sessions_result = await db.execute(
            select(ChatSession)
            .where(ChatSession.is_active == True)
            .order_by(ChatSession.updated_at.desc())
            .limit(5)
        )
        recent_sessions = sessions_result.scalars().all()

        # Recent documents
        docs_result = await db.execute(
            select(Document)
            .order_by(Document.created_at.desc())
            .limit(5)
        )
        recent_docs = docs_result.scalars().all()

        # Recent reports
        reports_result = await db.execute(
            select(Report)
            .order_by(Report.created_at.desc())
            .limit(5)
        )
        recent_reports = reports_result.scalars().all()

        return {
            "recent_sessions": [
                {
                    "id": s.id,
                    "title": s.title,
                    "type": "session",
                    "timestamp": (s.updated_at or s.created_at).isoformat(),
                }
                for s in recent_sessions
            ],
            "recent_documents": [
                {
                    "id": d.id,
                    "title": d.original_name,
                    "type": "document",
                    "status": d.status,
                    "chunks": d.chunk_count,
                    "timestamp": d.created_at.isoformat(),
                }
                for d in recent_docs
            ],
            "recent_reports": [
                {
                    "id": str(r.id),
                    "title": r.title[:80],
                    "type": "report",
                    "timestamp": r.created_at.isoformat(),
                }
                for r in recent_reports
            ],
        }
    except Exception as e:
        logger.error(f"Activity error: {e}")
        return {"recent_sessions": [], "recent_documents": [], "recent_reports": []}
