"""
LangGraph Multi-Agent Orchestration Workflow
Implements the full agent graph with nodes, edges, and state management.

Graph Architecture:
User Input → Planner → RAG Retrieval → Research → Critic (loop) → Report → Output
"""

import asyncio
from typing import TypedDict, Optional, List, Annotated
from langgraph.graph import StateGraph, END
from app.agents.planner_agent import PlannerAgent
from app.agents.research_agent import ResearchAgent
from app.agents.rag_agent import RAGRetrievalAgent
from app.agents.critic_agent import CriticAgent
from app.agents.report_agent import ReportGeneratorAgent
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AgentState(TypedDict):
    """
    Shared state across all agents in the LangGraph workflow.
    Each agent reads from and writes to this state.
    """
    # Input
    user_query: str
    session_id: str

    # Planner outputs
    plan: Optional[dict]
    research_questions: List[str]
    search_queries: List[str]
    requires_rag: bool

    # RAG outputs
    retrieved_chunks: List[dict]
    retrieved_context: str

    # Research outputs
    research_findings: str
    research_iterations: int

    # Critic outputs
    critique_data: Optional[dict]
    refined_response: str
    quality_score: float
    reflection_count: int

    # Report outputs
    report: Optional[dict]

    # Metadata
    agent_logs: List[dict]
    current_agent: str
    error: Optional[str]
    is_complete: bool


class MultiAgentOrchestrator:
    """
    LangGraph-based orchestrator for the multi-agent research system.
    
    Graph Flow:
    planner → rag_retrieval → researcher → critic → [refine loop | reporter] → END
    """

    def __init__(self):
        self.planner = PlannerAgent()
        self.researcher = ResearchAgent()
        self.rag_agent = RAGRetrievalAgent()
        self.critic = CriticAgent()
        self.reporter = ReportGeneratorAgent()

        self.graph = self._build_graph()
        logger.info("✅ LangGraph orchestrator initialized")

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state machine."""
        workflow = StateGraph(AgentState)

        # Add agent nodes
        workflow.add_node("planner", self._planner_node)
        workflow.add_node("rag_retrieval", self._rag_node)
        workflow.add_node("researcher", self._researcher_node)
        workflow.add_node("critic", self._critic_node)
        workflow.add_node("reporter", self._reporter_node)

        # Define edges
        workflow.set_entry_point("planner")
        workflow.add_edge("planner", "rag_retrieval")
        workflow.add_edge("rag_retrieval", "researcher")
        workflow.add_edge("researcher", "critic")

        # Conditional edge from critic: continue refining OR generate report
        workflow.add_conditional_edges(
            "critic",
            self._should_continue_reflecting,
            {
                "refine": "researcher",   # Loop back for refinement
                "report": "reporter",     # Proceed to final report
            },
        )

        workflow.add_edge("reporter", END)
        return workflow.compile()

    async def _planner_node(self, state: AgentState) -> dict:
        """Planner Agent node."""
        logger.info("🧩 Node: Planner Agent")
        self._log_agent(state, "planner", "Planning research strategy...")

        try:
            plan = await self.planner.plan(state["user_query"])
            return {
                "plan": plan,
                "research_questions": plan.get("research_questions", []),
                "search_queries": plan.get("search_queries", [state["user_query"]]),
                "requires_rag": plan.get("requires_rag", True),
                "current_agent": "rag_retrieval",
                "agent_logs": state.get("agent_logs", []) + [{
                    "agent": "Planner",
                    "status": "completed",
                    "message": f"Created plan with {len(plan.get('tasks', []))} tasks",
                    "data": plan,
                }],
            }
        except Exception as e:
            logger.error(f"Planner node error: {e}")
            return {
                "plan": None,
                "search_queries": [state["user_query"]],
                "requires_rag": True,
                "error": str(e),
                "agent_logs": state.get("agent_logs", []) + [{"agent": "Planner", "status": "error", "message": str(e)}],
            }

    async def _rag_node(self, state: AgentState) -> dict:
        """RAG Retrieval Agent node."""
        logger.info("🧩 Node: RAG Retrieval Agent")

        queries = state.get("search_queries", [state["user_query"]])
        result = self.rag_agent.retrieve(queries)

        return {
            "retrieved_chunks": result["chunks"],
            "retrieved_context": result["context"],
            "current_agent": "researcher",
            "agent_logs": state.get("agent_logs", []) + [{
                "agent": "RAG Retrieval",
                "status": "completed",
                "message": f"Retrieved {result['total_retrieved']} relevant chunks",
                "data": {"chunks_count": result["total_retrieved"]},
            }],
        }

    async def _researcher_node(self, state: AgentState) -> dict:
        """Research Agent node."""
        logger.info("🧩 Node: Research Agent")

        result = await self.researcher.research(
            query=state["user_query"],
            retrieved_context=state.get("retrieved_context"),
            research_questions=state.get("research_questions", []),
        )

        iterations = state.get("research_iterations", 0) + 1

        return {
            "research_findings": result["findings"],
            "research_iterations": iterations,
            "current_agent": "critic",
            "agent_logs": state.get("agent_logs", []) + [{
                "agent": "Researcher",
                "status": "completed",
                "message": f"Research completed (iteration {iterations})",
                "data": {"sources_used": result.get("sources_used", 0)},
            }],
        }

    async def _critic_node(self, state: AgentState) -> dict:
        """Critic Agent node - reflection loop."""
        logger.info("🧩 Node: Critic Agent")

        reflection_count = state.get("reflection_count", 0)

        critique_result = await self.critic.critique_and_refine(
            original_query=state["user_query"],
            research_findings=state.get("research_findings", ""),
            retrieved_context=state.get("retrieved_context"),
            max_loops=1,  # Single critique pass per LangGraph node
        )

        new_reflection_count = reflection_count + critique_result.get("total_iterations", 1)

        return {
            "critique_data": critique_result,
            "refined_response": critique_result["refined_response"],
            "quality_score": critique_result["final_quality_score"],
            "reflection_count": new_reflection_count,
            "research_findings": critique_result["refined_response"],  # Update findings with refined version
            "agent_logs": state.get("agent_logs", []) + [{
                "agent": "Critic",
                "status": "completed",
                "message": f"Quality score: {critique_result['final_quality_score']}/10, Reflections: {new_reflection_count}",
                "data": {
                    "quality_score": critique_result["final_quality_score"],
                    "hallucination_risk": critique_result.get("hallucination_risk", "unknown"),
                    "reflection_count": new_reflection_count,
                },
            }],
        }

    async def _reporter_node(self, state: AgentState) -> dict:
        """Report Generator Agent node."""
        logger.info("🧩 Node: Report Generator Agent")

        report = await self.reporter.generate_report(
            query=state["user_query"],
            research_findings=state.get("refined_response", state.get("research_findings", "")),
            critique_data=state.get("critique_data"),
            plan=state.get("plan"),
            sources=state.get("retrieved_chunks", []),
        )

        return {
            "report": report,
            "is_complete": True,
            "current_agent": "complete",
            "agent_logs": state.get("agent_logs", []) + [{
                "agent": "Report Generator",
                "status": "completed",
                "message": f"Report generated ({report.get('word_count', 0)} words)",
                "data": {"report_id": report.get("report_id")},
            }],
        }

    def _should_continue_reflecting(self, state: AgentState) -> str:
        """
        Conditional routing: decide whether to refine or generate report.
        
        Conditions to continue reflecting:
        - Quality score below threshold
        - Haven't hit max reflection loops
        """
        quality_score = state.get("quality_score", 5)
        reflection_count = state.get("reflection_count", 0)
        max_reflections = 2  # Max reflection cycles in graph

        if quality_score < 7 and reflection_count < max_reflections:
            logger.info(f"  ↩️ Routing: REFINE (score={quality_score}, reflections={reflection_count})")
            return "refine"
        else:
            logger.info(f"  ✅ Routing: REPORT (score={quality_score}, reflections={reflection_count})")
            return "report"

    def _log_agent(self, state: AgentState, agent: str, message: str):
        """Helper to log agent activity."""
        logger.info(f"  [{agent}] {message}")

    async def run(self, user_query: str, session_id: str) -> AgentState:
        """
        Execute the full multi-agent workflow.
        
        Args:
            user_query: The user's research question
            session_id: Session identifier
            
        Returns:
            Final agent state with all outputs
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 Starting Multi-Agent Workflow")
        logger.info(f"   Query: {user_query[:80]}...")
        logger.info(f"{'='*60}")

        initial_state: AgentState = {
            "user_query": user_query,
            "session_id": session_id,
            "plan": None,
            "research_questions": [],
            "search_queries": [],
            "requires_rag": True,
            "retrieved_chunks": [],
            "retrieved_context": "",
            "research_findings": "",
            "research_iterations": 0,
            "critique_data": None,
            "refined_response": "",
            "quality_score": 0.0,
            "reflection_count": 0,
            "report": None,
            "agent_logs": [],
            "current_agent": "planner",
            "error": None,
            "is_complete": False,
        }

        try:
            final_state = await self.graph.ainvoke(initial_state)
            logger.info(f"✅ Workflow complete! Quality: {final_state.get('quality_score', 0)}/10")
            return final_state
        except Exception as e:
            logger.error(f"Workflow error: {e}")
            initial_state["error"] = str(e)
            initial_state["is_complete"] = True
            return initial_state


# Singleton orchestrator
_orchestrator: Optional[MultiAgentOrchestrator] = None


def get_orchestrator() -> MultiAgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MultiAgentOrchestrator()
    return _orchestrator
