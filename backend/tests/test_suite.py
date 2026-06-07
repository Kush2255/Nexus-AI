"""
NEXUS AI — Backend Test Suite
Tests for agents, RAG pipeline, memory, and API endpoints.

Run with:
    cd backend
    pip install pytest pytest-asyncio httpx
    pytest tests/ -v
"""

import os
import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

# Set test environment before imports
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key")
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/test_research.db")
os.environ.setdefault("VECTOR_DB", "faiss")
os.environ.setdefault("CHROMA_PERSIST_DIR", "./data/test_chroma")
os.environ.setdefault("UPLOAD_DIR", "./data/test_uploads")
os.environ.setdefault("REPORTS_DIR", "./data/test_reports")


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def app_client():
    """Create an async test client for the FastAPI app."""
    from main import app
    from app.models.database import init_db
    import os
    for d in ["./data/test_uploads", "./data/test_chroma", "./data/test_reports"]:
        os.makedirs(d, exist_ok=True)
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


# ─── System / Health Tests ────────────────────────────────────────────────────

class TestSystem:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, app_client):
        res = await app_client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root_endpoint(self, app_client):
        res = await app_client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["service"] == "NEXUS AI - Multi-Agent Research Assistant"
        assert "agents" in data

    @pytest.mark.asyncio
    async def test_api_status(self, app_client):
        res = await app_client.get("/api/status")
        assert res.status_code == 200
        data = res.json()
        assert "llm_provider" in data
        assert "vector_db" in data


# ─── Agents API Tests ─────────────────────────────────────────────────────────

class TestAgentsAPI:
    @pytest.mark.asyncio
    async def test_get_agents_status(self, app_client):
        res = await app_client.get("/api/agents/status")
        assert res.status_code == 200
        data = res.json()
        assert "agents" in data
        assert len(data["agents"]) == 5

    @pytest.mark.asyncio
    async def test_get_workflow(self, app_client):
        res = await app_client.get("/api/agents/workflow")
        assert res.status_code == 200
        data = res.json()
        assert "nodes" in data
        assert "edges" in data
        # Must have all 5 agent nodes
        node_ids = {n["id"] for n in data["nodes"]}
        assert "planner" in node_ids
        assert "researcher" in node_ids
        assert "critic" in node_ids


# ─── Documents API Tests ──────────────────────────────────────────────────────

class TestDocumentsAPI:
    @pytest.mark.asyncio
    async def test_list_documents_empty(self, app_client):
        res = await app_client.get("/api/documents/")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_upload_invalid_type(self, app_client):
        """Uploading an unsupported file type should return 400."""
        res = await app_client.post(
            "/api/documents/upload",
            files={"file": ("malware.exe", b"bad content", "application/octet-stream")},
        )
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_upload_text_document(self, app_client):
        """Uploading a valid .txt file should succeed."""
        content = b"This is a test document about artificial intelligence and machine learning."
        res = await app_client.post(
            "/api/documents/upload",
            files={"file": ("test_doc.txt", content, "text/plain")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert data["status"] == "ready"
        assert data["chunk_count"] >= 1
        return data["id"]

    @pytest.mark.asyncio
    async def test_get_document_not_found(self, app_client):
        res = await app_client.get("/api/documents/nonexistent-id-xyz")
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_document_not_found(self, app_client):
        res = await app_client.delete("/api/documents/nonexistent-id-xyz")
        assert res.status_code == 404


# ─── Chat API Tests ───────────────────────────────────────────────────────────

class TestChatAPI:
    @pytest.mark.asyncio
    async def test_get_sessions_empty(self, app_client):
        res = await app_client.get("/api/chat/sessions")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_create_session(self, app_client):
        res = await app_client.post("/api/chat/sessions", json={"title": "Test Session"})
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert data["title"] == "Test Session"

    @pytest.mark.asyncio
    async def test_get_session_messages_empty(self, app_client):
        # Create session first
        sess = await app_client.post("/api/chat/sessions", json={"title": "Msg Test"})
        sess_id = sess.json()["id"]
        res = await app_client.get(f"/api/chat/sessions/{sess_id}/messages")
        assert res.status_code == 200
        assert res.json() == []

    @pytest.mark.asyncio
    async def test_delete_session(self, app_client):
        sess = await app_client.post("/api/chat/sessions", json={"title": "To Delete"})
        sess_id = sess.json()["id"]
        del_res = await app_client.delete(f"/api/chat/sessions/{sess_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

    @pytest.mark.asyncio
    async def test_chat_message_empty_fails(self, app_client):
        """Empty message should be rejected by sanitizer."""
        res = await app_client.post(
            "/api/chat/message",
            json={"message": "   ", "session_id": ""},
        )
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_chat_message_too_long_fails(self, app_client):
        """Oversized query should be rejected."""
        res = await app_client.post(
            "/api/chat/message",
            json={"message": "x" * 2100, "session_id": ""},
        )
        assert res.status_code == 400


# ─── Analytics API Tests ──────────────────────────────────────────────────────

class TestAnalyticsAPI:
    @pytest.mark.asyncio
    async def test_get_overview(self, app_client):
        res = await app_client.get("/api/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        required = ["total_sessions", "total_documents", "total_reports"]
        for key in required:
            assert key in data

    @pytest.mark.asyncio
    async def test_get_activity(self, app_client):
        res = await app_client.get("/api/analytics/activity")
        assert res.status_code == 200
        data = res.json()
        assert "recent_sessions" in data
        assert "recent_documents" in data


# ─── Memory Manager Unit Tests ────────────────────────────────────────────────

class TestMemoryManager:
    def test_save_and_get_conversation(self):
        from app.memory.manager import MemoryManager
        mem = MemoryManager()
        mem.save_conversation_turn("test-sess", "user", "Hello AI")
        mem.save_conversation_turn("test-sess", "assistant", "Hello, how can I help?")
        history = mem.get_conversation_history("test-sess")
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"

    def test_get_recent_context(self):
        from app.memory.manager import MemoryManager
        mem = MemoryManager()
        mem.save_conversation_turn("ctx-sess", "user", "Question about AI")
        mem.save_conversation_turn("ctx-sess", "assistant", "AI is fascinating")
        ctx = mem.get_recent_context("ctx-sess", turns=3)
        assert "User:" in ctx
        assert "Assistant:" in ctx

    def test_clear_conversation(self):
        from app.memory.manager import MemoryManager
        mem = MemoryManager()
        mem.save_conversation_turn("clear-sess", "user", "test message")
        mem.clear_conversation("clear-sess")
        history = mem.get_conversation_history("clear-sess")
        assert history == []

    def test_cache_research(self):
        from app.memory.manager import MemoryManager
        mem = MemoryManager()
        mem.cache_research("hash123", "Cached research result", ttl=3600)
        result = mem.get_cached_research("hash123")
        assert result == "Cached research result"

    def test_save_agent_state(self):
        from app.memory.manager import MemoryManager
        mem = MemoryManager()
        state = {"quality_score": 8, "iteration": 2}
        mem.save_agent_state("sess-x", "critic", state)
        retrieved = mem.get_agent_state("sess-x", "critic")
        assert retrieved == state


# ─── Security Utils Unit Tests ────────────────────────────────────────────────

class TestSecurity:
    def test_sanitize_valid_query(self):
        from app.utils.security import sanitize_query
        result = sanitize_query("  What is machine learning?  ")
        assert result == "What is machine learning?"

    def test_sanitize_empty_raises(self):
        from app.utils.security import sanitize_query
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            sanitize_query("   ")
        assert exc.value.status_code == 400

    def test_sanitize_too_long_raises(self):
        from app.utils.security import sanitize_query
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            sanitize_query("x" * 2500)
        assert exc.value.status_code == 400

    def test_sanitize_script_injection(self):
        from app.utils.security import sanitize_query
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            sanitize_query("<script>alert('xss')</script>")

    def test_hash_query(self):
        from app.utils.security import hash_query
        h1 = hash_query("  What is AI?  ")
        h2 = hash_query("what is ai?")
        assert h1 == h2  # normalized
        assert len(h1) == 32  # MD5 hex


# ─── Planner Agent Unit Tests ─────────────────────────────────────────────────

class TestPlannerAgent:
    @pytest.mark.asyncio
    async def test_fallback_plan(self):
        from app.agents.planner_agent import PlannerAgent
        agent = PlannerAgent()
        plan = agent._fallback_plan("test research topic")
        assert "goal_analysis" in plan
        assert "tasks" in plan
        assert len(plan["tasks"]) > 0
        assert "search_queries" in plan
        assert "requires_rag" in plan

    @pytest.mark.asyncio
    async def test_plan_returns_structure(self):
        """Plan should always return required keys even if LLM fails."""
        from app.agents.planner_agent import PlannerAgent
        with patch.object(PlannerAgent, '_fallback_plan') as mock_fb:
            mock_fb.return_value = {
                "goal_analysis": "test",
                "research_questions": ["q1"],
                "tasks": [{"id": 1, "name": "t", "description": "d", "agent": "researcher"}],
                "requires_rag": True,
                "search_queries": ["test"],
                "complexity": "simple",
                "estimated_steps": 1,
            }
            agent = PlannerAgent()
            plan = await agent.plan("test goal")
            # Must have all required keys
            assert "tasks" in plan


# ─── RAG Pipeline Unit Tests ──────────────────────────────────────────────────

class TestRAGPipeline:
    def test_pipeline_initializes(self):
        from app.rag.pipeline import RAGPipeline
        pipeline = RAGPipeline()
        assert pipeline.text_splitter is not None
        assert pipeline.embeddings is not None

    def test_retrieve_empty_returns_list(self):
        from app.rag.pipeline import RAGPipeline
        pipeline = RAGPipeline()
        results = pipeline.retrieve("test query", k=3)
        assert isinstance(results, list)

    def test_text_splitting(self):
        from app.rag.pipeline import RAGPipeline
        pipeline = RAGPipeline()
        text = "This is a test. " * 200  # ~3200 chars
        chunks = pipeline.text_splitter.split_text(text)
        assert len(chunks) >= 2
        for chunk in chunks:
            assert len(chunk) <= 1200  # within chunk size tolerance


# ─── Critic Agent Unit Tests ──────────────────────────────────────────────────

class TestCriticAgent:
    def test_fallback_critique_structure(self):
        from app.agents.critic_agent import CriticAgent
        agent = CriticAgent()
        critique = agent._fallback_critique("some response text")
        required_keys = [
            "quality_score", "is_satisfactory", "hallucination_risk",
            "strengths", "weaknesses", "critique", "should_continue"
        ]
        for key in required_keys:
            assert key in critique

    def test_fallback_critique_ranges(self):
        from app.agents.critic_agent import CriticAgent
        agent = CriticAgent()
        critique = agent._fallback_critique("")
        assert 0 <= critique["quality_score"] <= 10
        assert critique["hallucination_risk"] in ["low", "medium", "high"]
        assert isinstance(critique["strengths"], list)
        assert isinstance(critique["weaknesses"], list)
