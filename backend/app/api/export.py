"""
Export API
Handles exporting research sessions as Markdown or PDF reports.
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db, ChatSession, ChatMessage, Report
from app.agents.report_agent import ReportGeneratorAgent
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

REPORTS_DIR = os.getenv("REPORTS_DIR", "./data/reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


class ExportRequest(BaseModel):
    session_id: str
    format: str = "markdown"   # "markdown" | "pdf"
    include_agent_logs: bool = False


@router.post("/session")
async def export_session(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Export a full chat session as a formatted research document."""
    # Get session
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.id == request.session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get messages
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == request.session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()

    if not messages:
        raise HTTPException(status_code=404, detail="No messages in session")

    # Build markdown export
    lines = [
        f"# Research Session Export",
        f"",
        f"**Session:** {session.title}",
        f"**Exported:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Messages:** {len(messages)}",
        f"",
        "---",
        "",
    ]

    for msg in messages:
        if msg.role == "user":
            lines += [f"## 🧑 User Query", f"", msg.content, ""]
        elif msg.role == "assistant":
            lines += [f"## 🤖 AI Research Response", f"", msg.content, ""]

            # Optionally include agent logs
            if request.include_agent_logs and msg.agent_data and msg.agent_data != "{}":
                try:
                    data = json.loads(msg.agent_data)
                    if data.get("quality_score"):
                        lines += [
                            f"",
                            f"> **Quality Score:** {data['quality_score']}/10 | "
                            f"**Reflections:** {data.get('reflection_count', 0)} | "
                            f"**Risk:** {data.get('hallucination_risk', 'unknown')}",
                        ]
                except Exception:
                    pass

            lines += ["---", ""]

    content = "\n".join(lines)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"session_{request.session_id[:8]}_{timestamp}"

    if request.format == "markdown":
        filepath = os.path.join(REPORTS_DIR, f"{filename}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        return FileResponse(
            filepath,
            media_type="text/markdown",
            filename=f"research-session-{request.session_id[:8]}.md",
        )

    elif request.format == "pdf":
        # Generate PDF via ReportAgent
        agent = ReportGeneratorAgent()
        try:
            pdf_path = await agent._generate_pdf(content, timestamp)
            return FileResponse(
                pdf_path,
                media_type="application/pdf",
                filename=f"research-session-{request.session_id[:8]}.pdf",
            )
        except Exception as e:
            logger.error(f"PDF export failed: {e}")
            # Fall back to markdown
            filepath = os.path.join(REPORTS_DIR, f"{filename}.md")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return FileResponse(filepath, media_type="text/markdown", filename=f"{filename}.md")

    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'markdown' or 'pdf'")


@router.get("/report/{report_id}")
async def export_report(
    report_id: str,
    format: str = "markdown",
    db: AsyncSession = Depends(get_db),
):
    """Export a specific report by ID."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if format == "markdown":
        if report.file_path and os.path.exists(report.file_path):
            return FileResponse(
                report.file_path,
                media_type="text/markdown",
                filename=f"report-{report_id[:8]}.md",
            )
        # Return content directly if file not found
        return PlainTextResponse(content=report.content, media_type="text/markdown")

    elif format == "pdf":
        agent = ReportGeneratorAgent()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        try:
            pdf_path = await agent._generate_pdf(report.content, timestamp)
            return FileResponse(
                pdf_path,
                media_type="application/pdf",
                filename=f"report-{report_id[:8]}.pdf",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    raise HTTPException(status_code=400, detail="Use format=markdown or format=pdf")
