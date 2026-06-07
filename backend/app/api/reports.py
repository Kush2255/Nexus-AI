"""Reports API — fixed to always return DB UUID as report_id"""
import os
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db, Report
from app.agents.report_agent import ReportGeneratorAgent
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ReportRequest(BaseModel):
    session_id: str
    query: str
    findings: str


@router.post("/generate")
async def generate_report(request: ReportRequest, db: AsyncSession = Depends(get_db)):
    """Generate a research report. Returns DB UUID as report_id."""
    agent  = ReportGeneratorAgent()
    result = await agent.generate_report(
        query=request.query,
        research_findings=request.findings,
    )

    report = Report(
        session_id=request.session_id,
        title=request.query[:200],
        content=result["content"],
        file_path=result.get("markdown_path", ""),
        report_type="markdown",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Always return DB UUID so frontend can use /export/report/{id}
    return {
        "report_id":    str(report.id),
        "file_report_id": result.get("report_id"),  # timestamp id (for file path)
        "content":      result["content"],
        "word_count":   result.get("word_count", 0),
        "markdown_path": result.get("markdown_path"),
        "pdf_path":     result.get("pdf_path"),
        "generated_at": result.get("generated_at"),
    }


@router.get("/")
async def list_reports(db: AsyncSession = Depends(get_db)):
    """List all generated reports with full content for frontend preview."""
    result = await db.execute(select(Report).order_by(Report.created_at.desc()).limit(50))
    reports = result.scalars().all()
    return [
        {
            "id":          str(r.id),
            "title":       r.title,
            "content":     r.content,
            "report_type": r.report_type,
            "created_at":  r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/{report_id}/download")
async def download_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """Download report file by DB UUID."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.file_path and os.path.exists(report.file_path):
        return FileResponse(
            report.file_path,
            filename=f"report_{report_id[:8]}.md",
            media_type="text/markdown",
        )
    # Return content directly if file gone
    return PlainTextResponse(content=report.content or "", media_type="text/markdown")
