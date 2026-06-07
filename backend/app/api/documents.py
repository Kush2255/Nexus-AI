"""
Documents API Routes
Handles file upload, management, and RAG ingestion.
"""

import os
import uuid
import json
import aiofiles
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db, Document
from app.rag.pipeline import get_rag_pipeline
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024
ALLOWED_TYPES = {".pdf", ".txt", ".md", ".doc", ".docx"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and process a document into the RAG pipeline.
    Chunks the document and stores embeddings in vector DB.
    """
    # Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not supported. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        # Create DB record
        doc = Document(
            id=doc_id,
            filename=safe_filename,
            original_name=file.filename,
            file_size=len(content),
            file_type=ext.lstrip("."),
            status="processing",
        )
        db.add(doc)
        await db.commit()

        # Process through RAG pipeline
        logger.info(f"Processing document: {file.filename}")
        rag = get_rag_pipeline()
        chunk_count, chunk_metadata = await rag.ingest_document(
            file_path, doc_id, file.filename
        )

        # Update document status
        doc.chunk_count = chunk_count
        doc.status = "ready"
        doc.metadata_json = json.dumps({"chunks": chunk_metadata[:3]})  # Store preview of first 3 chunks
        await db.commit()

        return {
            "id": doc_id,
            "filename": file.filename,
            "file_size": len(content),
            "chunk_count": chunk_count,
            "status": "ready",
            "message": f"Document processed successfully into {chunk_count} chunks",
        }

    except Exception as e:
        logger.error(f"Upload error: {e}")
        # Update status to error
        try:
            doc.status = "error"
            await db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all uploaded documents."""
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.original_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "chunk_count": d.chunk_count,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.get("/{document_id}")
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get document details including chunk metadata."""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = json.loads(doc.metadata_json) if doc.metadata_json else {}

    return {
        "id": doc.id,
        "filename": doc.original_name,
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "chunk_count": doc.chunk_count,
        "status": doc.status,
        "metadata": metadata,
        "created_at": doc.created_at.isoformat(),
    }


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document and its vector embeddings."""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from vector store
    try:
        rag = get_rag_pipeline()
        rag.delete_document(document_id)
    except Exception as e:
        logger.warning(f"Could not remove from vector store: {e}")

    # Remove physical file
    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove DB record
    await db.delete(doc)
    await db.commit()

    return {"status": "deleted", "id": document_id}
