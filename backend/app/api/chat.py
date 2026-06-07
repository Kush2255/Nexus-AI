"""
Chat API Routes — Full production version
Handles chat sessions, AI research queries, and memory integration.
"""

import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.agents.orchestrator import get_orchestrator
from app.memory.manager import get_memory_manager
from app.models.database import get_db, ChatSession, ChatMessage
from app.utils.security import sanitize_query, check_rate_limit, get_client_ip
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    use_memory: bool = True


class NewSessionRequest(BaseModel):
    title: str = "New Research Session"


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(http_request)
    check_rate_limit(client_ip, "chat")
    clean_message = sanitize_query(request.message)
    logger.info(f"📨 Chat [{client_ip}]: {clean_message[:80]}...")

    session_id = request.session_id or str(uuid.uuid4())
    memory = get_memory_manager()

    if not request.session_id:
        session = ChatSession(id=session_id, title=clean_message[:100])
        db.add(session)
    else:
        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=datetime.utcnow())
        )

    if request.use_memory:
        memory.save_conversation_turn(session_id, "user", clean_message)

    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=clean_message,
    )
    db.add(user_msg)

    try:
        orchestrator = get_orchestrator()
        final_state = await orchestrator.run(clean_message, session_id)

        response_content = (
            final_state.get("refined_response")
            or final_state.get("research_findings")
            or "Unable to complete research. Please try again."
        )

        agent_data = {
            "plan": final_state.get("plan"),
            "quality_score": final_state.get("quality_score", 0),
            "reflection_count": final_state.get("reflection_count", 0),
            "agent_logs": final_state.get("agent_logs", []),
            "retrieved_chunks": len(final_state.get("retrieved_chunks", [])),
            "hallucination_risk": (
                final_state.get("critique_data", {}).get("hallucination_risk", "unknown")
                if final_state.get("critique_data") else "unknown"
            ),
            "report": final_state.get("report"),
            "research_iterations": final_state.get("research_iterations", 1),
        }

        if request.use_memory:
            memory.save_conversation_turn(session_id, "assistant", response_content)
            memory.save_research_context(session_id, {
                "last_query": clean_message,
                "quality_score": agent_data["quality_score"],
            })

        assistant_msg_id = str(uuid.uuid4())
        assistant_msg = ChatMessage(
            id=assistant_msg_id,
            session_id=session_id,
            role="assistant",
            content=response_content,
            agent_data=json.dumps(agent_data),
        )
        db.add(assistant_msg)
        await db.commit()

        return {
            "session_id": session_id,
            "message_id": assistant_msg_id,
            "response": response_content,
            "agent_data": agent_data,
            "created_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions")
async def create_session(request: NewSessionRequest, db: AsyncSession = Depends(get_db)):
    session = ChatSession(id=str(uuid.uuid4()), title=request.title)
    db.add(session)
    await db.commit()
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}


@router.get("/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.is_active == True)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": (s.updated_at or s.created_at).isoformat(),
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "agent_data": json.loads(m.agent_data) if m.agent_data and m.agent_data != "{}" else {},
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(ChatSession).where(ChatSession.id == session_id).values(is_active=False)
    )
    await db.commit()
    try:
        get_memory_manager().clear_conversation(session_id)
    except Exception:
        pass
    return {"status": "deleted", "id": session_id}
