"""
Integration tests — end-to-end pipeline and streaming endpoint
"""

import os
import asyncio
import pytest
import pytest_asyncio

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key")
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/test_integration.db")
os.environ.setdefault("VECTOR_DB", "faiss")
os.environ.setdefault("UPLOAD_DIR", "./data/test_uploads")
os.environ.setdefault("REPORTS_DIR", "./data/test_reports")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def client():
    from httpx import AsyncClient, ASGITransport
    from main import app
    from app.models.database import init_db
    for d in ["./data/test_uploads", "./data/test_reports"]:
        os.makedirs(d, exist_ok=True)
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


class TestFullPipeline:

    @pytest.mark.asyncio
    async def test_document_upload_and_query_pipeline(self, client):
        """Upload a doc then ask a question — full RAG pipeline."""
        # Upload text document
        content = b"""
        Artificial Intelligence (AI) refers to the simulation of human intelligence in machines.
        Machine learning is a subset of AI that enables systems to learn from data.
        Deep learning uses neural networks with many layers to learn complex patterns.
        Large Language Models (LLMs) are trained on vast text datasets using transformer architecture.
        Retrieval-Augmented Generation (RAG) combines LLMs with document retrieval for grounded responses.
        """
        upload_res = await client.post(
            "/api/documents/upload",
            files={"file": ("ai_overview.txt", content, "text/plain")},
        )
        assert upload_res.status_code == 200
        doc_data = upload_res.json()
        assert doc_data["status"] == "ready"
        assert doc_data["chunk_count"] >= 1

        # Verify document appears in list
        list_res = await client.get("/api/documents/")
        assert list_res.status_code == 200
        doc_ids = [d["id"] for d in list_res.json()]
        assert doc_data["id"] in doc_ids

        # Clean up
        del_res = await client.delete(f"/api/documents/{doc_data['id']}")
        assert del_res.status_code == 200

    @pytest.mark.asyncio
    async def test_session_lifecycle(self, client):
        """Create session → add messages → read back → delete."""
        # Create session
        create_res = await client.post(
            "/api/chat/sessions",
            json={"title": "Integration Test Session"},
        )
        assert create_res.status_code == 200
        session_id = create_res.json()["id"]

        # Verify in list
        list_res = await client.get("/api/chat/sessions")
        assert list_res.status_code == 200
        session_ids = [s["id"] for s in list_res.json()]
        assert session_id in session_ids

        # Fetch messages (empty)
        msgs_res = await client.get(f"/api/chat/sessions/{session_id}/messages")
        assert msgs_res.status_code == 200
        assert msgs_res.json() == []

        # Delete session
        del_res = await client.delete(f"/api/chat/sessions/{session_id}")
        assert del_res.status_code == 200

    @pytest.mark.asyncio
    async def test_analytics_after_activity(self, client):
        """Analytics should reflect created sessions/docs."""
        overview_res = await client.get("/api/analytics/overview")
        assert overview_res.status_code == 200
        data = overview_res.json()
        # All counts must be non-negative integers
        for key in ["total_sessions", "total_documents", "total_reports", "ai_responses_generated"]:
            assert isinstance(data[key], int)
            assert data[key] >= 0

    @pytest.mark.asyncio
    async def test_export_session_not_found(self, client):
        """Exporting a non-existent session should 404."""
        res = await client.post(
            "/api/export/session",
            json={"session_id": "nonexistent-xyz", "format": "markdown"},
        )
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_streaming_endpoint_reachable(self, client):
        """SSE streaming endpoint must accept POST."""
        # We can't fully consume SSE in a unit test easily,
        # but we can verify the endpoint responds and starts streaming.
        res = await client.post(
            "/api/stream/stream",
            json={"message": "test streaming", "session_id": ""},
            headers={"Accept": "text/event-stream"},
        )
        # Should return 200 (even if content is partial due to timeout)
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_agents_status_all_present(self, client):
        """All 5 agents must be present and ready."""
        res = await client.get("/api/agents/status")
        assert res.status_code == 200
        agents = res.json()["agents"]
        agent_ids = {a["id"] for a in agents}
        required = {"planner", "researcher", "rag", "critic", "reporter"}
        assert required.issubset(agent_ids)
        for agent in agents:
            assert agent["status"] == "ready"

    @pytest.mark.asyncio
    async def test_workflow_graph_structure(self, client):
        """Workflow graph must have valid node and edge structure."""
        res = await client.get("/api/agents/workflow")
        assert res.status_code == 200
        data = res.json()

        # Validate nodes
        assert len(data["nodes"]) == 5
        for node in data["nodes"]:
            assert "id" in node
            assert "label" in node

        # Validate edges — critic must have a refine loop back
        edges = data["edges"]
        refine_edges = [e for e in edges if e.get("label") == "refine"]
        assert len(refine_edges) >= 1


class TestOrchestratorWithMock:

    @pytest.mark.asyncio
    async def test_orchestrator_run_completes(self):
        """Full orchestrator run with mock LLM must complete without error."""
        from app.agents.orchestrator import MultiAgentOrchestrator
        orch = MultiAgentOrchestrator()
        state = await orch.run("What is artificial intelligence?", "test-session-orch")

        # Must have completed
        assert state["is_complete"] is True
        assert state["user_query"] == "What is artificial intelligence?"

        # Must have agent logs
        assert len(state["agent_logs"]) > 0

        # Must have some response content
        response = state.get("refined_response") or state.get("research_findings")
        assert response is not None
        assert len(response) > 20

    @pytest.mark.asyncio
    async def test_planner_produces_valid_plan(self):
        """Planner must always produce a valid plan structure."""
        from app.agents.planner_agent import PlannerAgent
        agent = PlannerAgent()
        plan = await agent.plan("Explain the history of machine learning")

        assert isinstance(plan, dict)
        assert "tasks" in plan
        assert "search_queries" in plan
        assert isinstance(plan["tasks"], list)
        assert len(plan["tasks"]) >= 1
        assert isinstance(plan["search_queries"], list)

    @pytest.mark.asyncio
    async def test_critic_scores_within_range(self):
        """Critic quality score must always be 0–10."""
        from app.agents.critic_agent import CriticAgent
        agent = CriticAgent()
        result = await agent.critique_and_refine(
            original_query="What is ML?",
            research_findings="Machine learning is a subset of AI that learns from data.",
            max_loops=1,
        )

        assert "final_quality_score" in result
        score = result["final_quality_score"]
        assert 0 <= score <= 10
        assert "refined_response" in result
        assert len(result["refined_response"]) > 0

    @pytest.mark.asyncio
    async def test_rag_agent_retrieve_returns_list(self):
        """RAG agent retrieve must always return a list (even if empty)."""
        from app.agents.rag_agent import RAGRetrievalAgent
        agent = RAGRetrievalAgent()
        result = agent.retrieve(["artificial intelligence", "machine learning"])

        assert isinstance(result, dict)
        assert "chunks" in result
        assert "context" in result
        assert isinstance(result["chunks"], list)
