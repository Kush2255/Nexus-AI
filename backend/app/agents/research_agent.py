"""
Research Agent — Full version with web search integration
Performs deep research using LLM + optional live web search.
"""

from typing import List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm_service import get_llm
from app.utils.logger import get_logger

logger = get_logger(__name__)

RESEARCHER_SYSTEM_PROMPT = """You are an expert AI Research Agent with deep analytical capabilities.
Your role is to:
1. Analyze research questions thoroughly and from multiple angles
2. Synthesize information from context and your knowledge base
3. Identify key insights, trends, patterns, and emerging themes
4. Extract factual, verifiable information
5. Provide well-structured, academically rigorous findings

Format your research clearly using:
**Key Findings:**
- Finding 1 with supporting evidence and context
- Finding 2 with analysis

**Detailed Analysis:**
[In-depth, well-reasoned analytical narrative]

**Key Concepts:**
- Concept: explanation with nuance

**Evidence & Examples:**
- Concrete examples with context

**Emerging Trends / Implications:**
- Forward-looking insights

Be thorough. Flag uncertainty explicitly. Connect ideas to broader context."""


class ResearchAgent:
    """
    Research Agent: Deep research via LLM synthesis + web search.
    Integrates retrieved RAG context with knowledge synthesis.
    """

    def __init__(self):
        self.llm = get_llm()
        self.name = "Researcher"

    async def research(
        self,
        query: str,
        retrieved_context: Optional[str] = None,
        research_questions: Optional[List[str]] = None,
        use_web_search: bool = True,
    ) -> dict:
        """
        Conduct comprehensive research on a topic.

        Args:
            query: Main research query
            retrieved_context: Context from RAG retrieval
            research_questions: Specific sub-questions from planner
            use_web_search: Whether to perform live web search

        Returns:
            Research findings dictionary
        """
        logger.info(f"🔬 Research Agent: Researching — {query[:100]}...")

        # Optionally gather live web results
        web_context = ""
        if use_web_search:
            try:
                from app.services.search_service import get_search_tool
                search_tool = get_search_tool()
                results = await search_tool.search(query, num_results=5)
                if results:
                    web_context = "\n\n" + search_tool.format_results_for_llm(results)
                    logger.info(f"  🌐 Web search: {len(results)} results")
            except Exception as e:
                logger.debug(f"Web search skipped: {e}")

        # Build prompt sections
        sections = [f"Research Topic: {query}"]

        if research_questions:
            sections.append(
                "Specific Questions to Answer:\n"
                + "\n".join(f"  • {q}" for q in research_questions)
            )

        if retrieved_context:
            sections.append(
                f"Knowledge Base Context (from uploaded documents):\n{retrieved_context}"
            )

        if web_context:
            sections.append(f"Live Web Research:\n{web_context}")

        sections.append("Provide comprehensive, well-structured research findings.")

        messages = [
            SystemMessage(content=RESEARCHER_SYSTEM_PROMPT),
            HumanMessage(content="\n\n".join(sections)),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else str(response)

            logger.info("✅ Research Agent: Complete")
            return {
                "findings": content,
                "query": query,
                "has_rag_context": bool(retrieved_context),
                "has_web_search": bool(web_context),
                "sources_used": self._count_sources(retrieved_context, web_context),
            }

        except Exception as e:
            logger.error(f"Research Agent error: {e}")
            return {
                "findings": f"Research on '{query}' encountered an error: {str(e)}. Please ensure your API key is configured.",
                "query": query,
                "has_rag_context": False,
                "has_web_search": False,
                "sources_used": 0,
                "error": str(e),
            }

    async def synthesize(
        self,
        query: str,
        findings_list: List[str],
        retrieved_context: Optional[str] = None,
    ) -> str:
        """Synthesize multiple findings into a unified analysis."""
        logger.info("🔗 Research Agent: Synthesizing findings...")

        combined = "\n\n---\n\n".join(findings_list) if findings_list else "No previous findings"
        context_section = f"\n\nSource Context:\n{retrieved_context}" if retrieved_context else ""

        messages = [
            SystemMessage(content=RESEARCHER_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Research Topic: {query}\n\n"
                    f"Previous Findings:\n{combined}"
                    f"{context_section}\n\n"
                    "Synthesize all information into comprehensive, unified findings."
                )
            ),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            return response.content if hasattr(response, "content") else str(response)
        except Exception as e:
            logger.error(f"Synthesis error: {e}")
            return combined

    def _count_sources(self, rag_context: Optional[str], web_context: str) -> int:
        count = 0
        if rag_context:
            count += rag_context.count("[Source ")
        if web_context:
            count += web_context.count("**[")
        return max(count, 1 if (rag_context or web_context) else 0)
