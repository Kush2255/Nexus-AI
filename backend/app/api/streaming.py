"""
Streaming API - Server-Sent Events + WebSocket support
Enables real-time token streaming and live agent status updates.
"""

import json
import asyncio
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agents.orchestrator import get_orchestrator
from app.memory.manager import get_memory_manager
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class StreamRequest(BaseModel):
    message: str
    session_id: str = ""


# ─── Server-Sent Events streaming ─────────────────────────────────────────────

async def agent_event_generator(
    message: str, session_id: str
) -> AsyncGenerator[str, None]:
    """
    Yields SSE events as the multi-agent pipeline executes.
    Each agent emits progress events in real time.
    """

    async def emit(event_type: str, data: dict) -> str:
        payload = json.dumps({"type": event_type, **data})
        return f"data: {payload}\n\n"

    yield await emit("start", {"session_id": session_id, "message": "Pipeline started"})
    await asyncio.sleep(0.05)

    # Agent sequence with progress events
    agent_sequence = [
        ("planner", "🧠 Planner Agent analyzing goal..."),
        ("rag", "📚 RAG Agent retrieving documents..."),
        ("researcher", "🔬 Research Agent synthesizing findings..."),
        ("critic", "🔍 Critic Agent evaluating quality..."),
        ("reporter", "📄 Report Agent generating output..."),
    ]

    for agent_id, message_text in agent_sequence:
        yield await emit("agent_start", {
            "agent": agent_id,
            "message": message_text,
        })
        await asyncio.sleep(0.1)

    # Run actual orchestrator
    try:
        orchestrator = get_orchestrator()
        final_state = await orchestrator.run(message, session_id)

        # Emit each agent log
        for log in final_state.get("agent_logs", []):
            yield await emit("agent_complete", {
                "agent": log.get("agent", "").lower().replace(" ", "_"),
                "message": log.get("message", ""),
                "data": log.get("data", {}),
            })
            await asyncio.sleep(0.05)

        # Stream the final response word by word
        response = (
            final_state.get("refined_response")
            or final_state.get("research_findings")
            or "Research complete."
        )

        words = response.split(" ")
        chunk_size = 5
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            yield await emit("token", {"token": chunk + " "})
            await asyncio.sleep(0.02)

        # Final complete event
        yield await emit("complete", {
            "session_id": session_id,
            "quality_score": final_state.get("quality_score", 0),
            "reflection_count": final_state.get("reflection_count", 0),
            "retrieved_chunks": len(final_state.get("retrieved_chunks", [])),
            "agent_logs": final_state.get("agent_logs", []),
            "report": final_state.get("report"),
            "hallucination_risk": (
                final_state.get("critique_data", {}).get("hallucination_risk", "unknown")
                if final_state.get("critique_data") else "unknown"
            ),
        })

    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield await emit("error", {"message": str(e)})

    yield "data: [DONE]\n\n"


@router.post("/stream")
async def stream_chat(request: StreamRequest):
    """
    SSE endpoint for real-time agent streaming.
    Frontend connects with EventSource API.
    """
    session_id = request.session_id or str(uuid.uuid4())

    return StreamingResponse(
        agent_event_generator(request.message, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── WebSocket for live agent collaboration ────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected: {session_id}")

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        logger.info(f"WebSocket disconnected: {session_id}")

    async def send(self, session_id: str, data: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_json(data)

    async def broadcast(self, data: dict):
        for ws in self.active_connections.values():
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for bi-directional real-time communication.
    Supports live agent status updates and streaming responses.
    """
    await manager.connect(session_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")

            if not message:
                continue

            # Notify: pipeline starting
            await manager.send(session_id, {
                "type": "status",
                "message": "🚀 Multi-agent pipeline starting...",
            })

            # Run orchestrator with live updates
            orchestrator = get_orchestrator()

            # Emit agent start events
            agents = ["planner", "rag", "researcher", "critic", "reporter"]
            for agent in agents:
                await manager.send(session_id, {
                    "type": "agent_active",
                    "agent": agent,
                })
                await asyncio.sleep(0.1)

            try:
                final_state = await orchestrator.run(message, session_id)

                # Send agent logs
                for log in final_state.get("agent_logs", []):
                    await manager.send(session_id, {
                        "type": "agent_log",
                        "agent": log.get("agent"),
                        "message": log.get("message"),
                        "data": log.get("data", {}),
                    })

                # Send final response
                await manager.send(session_id, {
                    "type": "response",
                    "content": final_state.get("refined_response") or final_state.get("research_findings"),
                    "quality_score": final_state.get("quality_score", 0),
                    "reflection_count": final_state.get("reflection_count", 0),
                    "retrieved_chunks": len(final_state.get("retrieved_chunks", [])),
                    "agent_logs": final_state.get("agent_logs", []),
                    "report": final_state.get("report"),
                })

            except Exception as e:
                await manager.send(session_id, {
                    "type": "error",
                    "message": str(e),
                })

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(session_id)
