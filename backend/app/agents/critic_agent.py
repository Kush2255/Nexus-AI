"""
Critic Agent - THE KEY RESEARCH-LEVEL FEATURE
Implements reflection and self-critique loops for iterative improvement.
Evaluates factual correctness, detects hallucinations, and refines outputs.
"""

from typing import Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import get_llm
from app.utils.logger import get_logger
import os

logger = get_logger(__name__)

MAX_REFLECTION_LOOPS = int(os.getenv("MAX_REFLECTION_LOOPS", 3))

CRITIC_SYSTEM_PROMPT = """You are an expert AI Critic with advanced reasoning and fact-checking capabilities.
Your role is to:
1. Critically evaluate research findings for accuracy, completeness, and clarity
2. Detect potential hallucinations or unsupported claims
3. Identify logical inconsistencies or gaps
4. Suggest specific improvements
5. Rate the quality of the response

You MUST respond in JSON format:
{
  "quality_score": 0-10,
  "is_satisfactory": true/false,
  "hallucination_risk": "low|medium|high",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missing_elements": ["missing1", "missing2"],
  "suggested_improvements": ["improvement1", "improvement2"],
  "critique": "Detailed critique paragraph",
  "should_continue": true/false
}

Be rigorous but fair. Quality score >= 8 means satisfactory. If score < 7, recommend revision."""

REFLECTION_SYSTEM_PROMPT = """You are an expert AI Research Refiner.
Given the original research, critic's feedback, and context, IMPROVE the research response.

Apply all suggested improvements:
1. Fix any identified weaknesses
2. Add missing elements
3. Correct potential inaccuracies
4. Improve clarity and structure
5. Strengthen logical arguments

Produce a significantly improved version of the research findings."""


class CriticAgent:
    """
    Critic Agent: Implements reflection loops for iterative quality improvement.
    
    Key Features:
    - Multi-turn reflection (up to MAX_REFLECTION_LOOPS iterations)
    - Hallucination detection
    - Quality scoring (0-10)
    - Self-improvement cycles
    - Convergence detection (stops when quality is sufficient)
    """

    def __init__(self):
        self.llm = get_llm()
        self.name = "Critic"

    async def critique_and_refine(
        self,
        original_query: str,
        research_findings: str,
        retrieved_context: Optional[str] = None,
        max_loops: int = MAX_REFLECTION_LOOPS,
    ) -> dict:
        """
        Main reflection loop: critique and iteratively improve research.
        
        Args:
            original_query: The original user question
            research_findings: Initial research output to evaluate
            retrieved_context: Source context for fact-checking
            max_loops: Maximum reflection iterations
            
        Returns:
            Dict with refined response and reflection history
        """
        logger.info(f"🔍 Critic Agent: Starting reflection loop (max {max_loops} iterations)...")

        current_response = research_findings
        reflection_history = []
        final_critique = None

        for iteration in range(max_loops):
            logger.info(f"  Reflection iteration {iteration + 1}/{max_loops}")

            # Step 1: Critique current response
            critique = await self._critique(
                original_query, current_response, retrieved_context
            )
            reflection_history.append({
                "iteration": iteration + 1,
                "critique": critique,
                "response_snapshot": current_response[:500] + "..." if len(current_response) > 500 else current_response,
            })
            final_critique = critique

            quality_score = critique.get("quality_score", 5)
            should_continue = critique.get("should_continue", True)
            is_satisfactory = critique.get("is_satisfactory", False)

            logger.info(f"  Quality score: {quality_score}/10, Satisfactory: {is_satisfactory}")

            # Step 2: Check if quality is acceptable
            if is_satisfactory or quality_score >= 8 or not should_continue:
                logger.info(f"✅ Critic: Response accepted at iteration {iteration + 1}")
                break

            # Step 3: Refine the response based on critique
            if iteration < max_loops - 1:  # Don't refine on last iteration
                current_response = await self._refine(
                    original_query,
                    current_response,
                    critique,
                    retrieved_context,
                )

        return {
            "refined_response": current_response,
            "reflection_history": reflection_history,
            "final_quality_score": final_critique.get("quality_score", 0) if final_critique else 0,
            "total_iterations": len(reflection_history),
            "final_critique": final_critique,
            "hallucination_risk": final_critique.get("hallucination_risk", "unknown") if final_critique else "unknown",
        }

    async def _critique(
        self,
        query: str,
        response: str,
        context: Optional[str] = None,
    ) -> dict:
        """Perform a single critique pass."""
        context_section = f"\n\nAvailable Context/Sources:\n{context}" if context else "\n\nNo source documents available."

        messages = [
            SystemMessage(content=CRITIC_SYSTEM_PROMPT),
            HumanMessage(
                content=f"""Original Query: {query}

Research Response to Evaluate:
{response}
{context_section}

Critically evaluate this research response. Respond ONLY in JSON format."""
            ),
        ]

        try:
            response_obj = await self.llm.ainvoke(messages)
            content = response_obj.content if hasattr(response_obj, "content") else str(response_obj)

            import json
            import re

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                return self._fallback_critique(content)

        except Exception as e:
            logger.error(f"Critique error: {e}")
            return self._fallback_critique("")

    async def _refine(
        self,
        query: str,
        current_response: str,
        critique: dict,
        context: Optional[str] = None,
    ) -> str:
        """Refine the response based on critique feedback."""
        weaknesses = "\n".join(f"- {w}" for w in critique.get("weaknesses", []))
        improvements = "\n".join(f"- {i}" for i in critique.get("suggested_improvements", []))
        missing = "\n".join(f"- {m}" for m in critique.get("missing_elements", []))

        context_section = f"\n\nSource Context:\n{context}" if context else ""

        messages = [
            SystemMessage(content=REFLECTION_SYSTEM_PROMPT),
            HumanMessage(
                content=f"""Original Query: {query}

Current Research Response:
{current_response}

Critic's Feedback:
Quality Score: {critique.get('quality_score', 5)}/10
Critique: {critique.get('critique', 'Needs improvement')}

Weaknesses to Fix:
{weaknesses or 'None specified'}

Missing Elements to Add:
{missing or 'None specified'}

Suggested Improvements:
{improvements or 'None specified'}
{context_section}

Please provide a significantly IMPROVED version of the research response, addressing all the critique points."""
            ),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else str(response)
            logger.info("  ✏️ Response refined based on critique")
            return content
        except Exception as e:
            logger.error(f"Refinement error: {e}")
            return current_response

    def _fallback_critique(self, content: str) -> dict:
        """Return a fallback critique structure."""
        return {
            "quality_score": 6,
            "is_satisfactory": False,
            "hallucination_risk": "medium",
            "strengths": ["Response provided"],
            "weaknesses": ["Could not complete full evaluation"],
            "missing_elements": [],
            "suggested_improvements": ["Verify with additional sources"],
            "critique": content or "Evaluation could not be completed.",
            "should_continue": False,
        }
