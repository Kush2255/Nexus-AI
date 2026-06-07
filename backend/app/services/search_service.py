"""
Web Search Tool
Provides real-time web search capability for the Research Agent.
Uses DuckDuckGo (no API key required) with fallback to SerpAPI.
"""

import os
import asyncio
import httpx
from typing import List, Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)


class WebSearchTool:
    """
    Web search integration for the Research Agent.
    Primary: DuckDuckGo Instant Answer API (free, no key)
    Fallback: SerpAPI (requires SERPAPI_KEY env var)
    """

    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_KEY", "")
        self.timeout = 10.0

    async def search(self, query: str, num_results: int = 5) -> List[dict]:
        """
        Perform a web search and return structured results.

        Returns:
            List of dicts with keys: title, url, snippet
        """
        logger.info(f"🌐 Web Search: {query[:80]}")

        # Try DuckDuckGo first
        results = await self._duckduckgo_search(query, num_results)
        if results:
            return results

        # Fallback to SerpAPI if configured
        if self.serpapi_key:
            results = await self._serpapi_search(query, num_results)
            if results:
                return results

        logger.warning("No web search results found")
        return []

    async def _duckduckgo_search(self, query: str, num_results: int) -> List[dict]:
        """Search via DuckDuckGo Instant Answer API."""
        try:
            params = {
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1",
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    "https://api.duckduckgo.com/",
                    params=params,
                )
                data = response.json()

            results = []

            # Abstract (main result)
            if data.get("AbstractText"):
                results.append({
                    "title": data.get("Heading", query),
                    "url": data.get("AbstractURL", ""),
                    "snippet": data["AbstractText"][:500],
                    "source": "duckduckgo_abstract",
                })

            # Related topics
            for topic in data.get("RelatedTopics", [])[:num_results]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text", "")[:100],
                        "url": topic.get("FirstURL", ""),
                        "snippet": topic.get("Text", "")[:500],
                        "source": "duckduckgo_topic",
                    })

            return results[:num_results]

        except Exception as e:
            logger.debug(f"DuckDuckGo search failed: {e}")
            return []

    async def _serpapi_search(self, query: str, num_results: int) -> List[dict]:
        """Search via SerpAPI (requires API key)."""
        try:
            params = {
                "q": query,
                "api_key": self.serpapi_key,
                "num": num_results,
                "engine": "google",
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    "https://serpapi.com/search",
                    params=params,
                )
                data = response.json()

            results = []
            for item in data.get("organic_results", [])[:num_results]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": "serpapi",
                })

            return results

        except Exception as e:
            logger.debug(f"SerpAPI search failed: {e}")
            return []

    def format_results_for_llm(self, results: List[dict]) -> str:
        """Format search results as LLM-readable context."""
        if not results:
            return "No web search results available."

        lines = ["## Web Search Results\n"]
        for i, r in enumerate(results, 1):
            lines.append(f"**[{i}] {r.get('title', 'Unknown')}**")
            if r.get("url"):
                lines.append(f"URL: {r['url']}")
            lines.append(f"{r.get('snippet', 'No description')}\n")

        return "\n".join(lines)


# Singleton
_search_tool: Optional[WebSearchTool] = None


def get_search_tool() -> WebSearchTool:
    global _search_tool
    if _search_tool is None:
        _search_tool = WebSearchTool()
    return _search_tool
