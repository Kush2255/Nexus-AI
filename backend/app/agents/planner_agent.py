"""
Planner Agent
Analyzes user goals, breaks them into tasks, and generates execution plans.
Coordinates the overall multi-agent workflow.
"""

from typing import TypedDict, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import get_llm
from app.utils.logger import get_logger

logger = get_logger(__name__)

PLANNER_SYSTEM_PROMPT = """You are an expert AI Research Planner. Your role is to:
1. Analyze the user's research goal
2. Break it down into clear, actionable tasks
3. Determine what information needs to be retrieved
4. Plan the research workflow

You must respond in JSON format with this structure:
{
  "goal_analysis": "Brief analysis of what the user wants",
  "research_questions": ["question1", "question2", ...],
  "tasks": [
    {"id": 1, "name": "task name", "description": "what to do", "agent": "researcher|rag|critic"},
    ...
  ],
  "requires_rag": true/false,
  "search_queries": ["query1", "query2"],
  "complexity": "simple|medium|complex",
  "estimated_steps": 3
}

Be precise and strategic. Focus on what will deliver the best research outcome."""


class PlannerOutput(TypedDict):
    goal_analysis: str
    research_questions: List[str]
    tasks: List[dict]
    requires_rag: bool
    search_queries: List[str]
    complexity: str
    estimated_steps: int


class PlannerAgent:
    """
    Planner Agent: Decomposes user goals into structured research plans.
    Acts as the orchestrator of the multi-agent workflow.
    """

    def __init__(self):
        self.llm = get_llm()
        self.name = "Planner"

    async def plan(self, user_goal: str, context: Optional[str] = None) -> PlannerOutput:
        """
        Create a research plan from user goal.
        
        Args:
            user_goal: The user's research question/goal
            context: Optional additional context
            
        Returns:
            Structured execution plan
        """
        logger.info(f"🧠 Planner Agent: Planning for goal: {user_goal[:100]}...")

        context_str = f"\n\nAdditional context: {context}" if context else ""

        messages = [
            SystemMessage(content=PLANNER_SYSTEM_PROMPT),
            HumanMessage(content=f"Research Goal: {user_goal}{context_str}\n\nCreate a detailed research plan."),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else str(response)

            # Parse JSON response
            import json
            import re

            # Extract JSON from response
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                plan = json.loads(json_match.group())
            else:
                # Fallback plan
                plan = self._fallback_plan(user_goal)

            logger.info(f"✅ Planner: Created plan with {len(plan.get('tasks', []))} tasks")
            return plan

        except Exception as e:
            logger.error(f"Planner error: {e}")
            return self._fallback_plan(user_goal)

    def _fallback_plan(self, goal: str) -> PlannerOutput:
        """Generate a fallback plan when LLM fails."""
        return {
            "goal_analysis": f"Research and analyze: {goal}",
            "research_questions": [
                f"What is {goal}?",
                f"What are the latest developments in {goal}?",
                f"What are the key findings about {goal}?",
            ],
            "tasks": [
                {"id": 1, "name": "Research", "description": f"Research {goal}", "agent": "researcher"},
                {"id": 2, "name": "RAG Retrieval", "description": "Retrieve relevant documents", "agent": "rag"},
                {"id": 3, "name": "Critique", "description": "Validate and improve findings", "agent": "critic"},
                {"id": 4, "name": "Report", "description": "Generate final report", "agent": "reporter"},
            ],
            "requires_rag": True,
            "search_queries": [goal, f"{goal} research", f"{goal} analysis"],
            "complexity": "medium",
            "estimated_steps": 4,
        }
