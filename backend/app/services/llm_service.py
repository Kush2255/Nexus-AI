"""
LLM Service — Modular multi-provider LLM manager
Supports: OpenAI, HuggingFace, and Mock (for dev/test)
Switch via LLM_PROVIDER env variable.
"""

import os
from typing import Optional
from langchain_core.language_models import BaseLanguageModel
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MockLLM:
    """
    Deterministic mock LLM for development and testing.
    Returns structured, useful responses without an API key.
    """

    RESPONSES = {
        "default": (
            "## Research Findings\n\n"
            "**Note:** This is a **demo response** — no API key is configured.\n\n"
            "To enable real AI responses, set `OPENAI_API_KEY` (or `HUGGINGFACE_API_KEY`) "
            "in your `backend/.env` file.\n\n"
            "**Key Concepts:**\n"
            "- Multi-agent systems enable specialized task delegation\n"
            "- RAG grounds LLM responses in retrieved documents\n"
            "- Reflection loops iteratively improve output quality\n\n"
            "**Demo System Status:** All 5 agents initialized and connected ✓"
        ),
        "plan": '{"goal_analysis":"Demo plan","research_questions":["What is this?"],"tasks":[{"id":1,"name":"Research","description":"Research topic","agent":"researcher"}],"requires_rag":true,"search_queries":["demo query"],"complexity":"simple","estimated_steps":3}',
        "critique": '{"quality_score":8,"is_satisfactory":true,"hallucination_risk":"low","strengths":["Clear structure","Relevant content"],"weaknesses":[],"missing_elements":[],"suggested_improvements":[],"critique":"Response meets quality standards.","should_continue":false}',
    }

    async def ainvoke(self, messages):
        """Async invoke — returns a mock response object."""
        content = messages[-1].content if messages else ""
        # Route to appropriate mock response
        if "JSON" in content or "json" in content:
            if "plan" in content.lower():
                text = self.RESPONSES["plan"]
            else:
                text = self.RESPONSES["critique"]
        else:
            text = self.RESPONSES["default"]

        class MockResponse:
            def __init__(self, t): self.content = t
        return MockResponse(text)

    def invoke(self, messages):
        import asyncio
        return asyncio.get_event_loop().run_until_complete(self.ainvoke(messages))


class LLMService:
    """
    Modular LLM provider.
    Reads LLM_PROVIDER from env: 'openai' | 'huggingface' | 'mock'
    """

    _instance: Optional["LLMService"] = None
    _llm = None

    @classmethod
    def get_instance(cls) -> "LLMService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        self._llm = self._init()

    def _init(self):
        if self.provider == "mock":
            logger.info("LLM: Mock mode (no API key needed)")
            return MockLLM()

        if self.provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY", "")
            if not api_key or api_key.startswith("sk-your") or api_key == "sk-test-fake-key-for-ci":
                logger.warning("OpenAI API key not set — falling back to Mock LLM")
                self.provider = "mock"
                return MockLLM()
            try:
                from langchain_openai import ChatOpenAI
                model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
                llm = ChatOpenAI(model=model, temperature=0.7, streaming=True, api_key=api_key)
                logger.info(f"LLM: OpenAI {model}")
                return llm
            except Exception as e:
                logger.error(f"OpenAI init failed: {e} — using Mock")
                return MockLLM()

        if self.provider == "huggingface":
            hf_key = os.getenv("HUGGINGFACE_API_KEY", "")
            if not hf_key:
                logger.warning("HuggingFace key not set — using Mock LLM")
                self.provider = "mock"
                return MockLLM()
            try:
                from langchain_community.llms import HuggingFaceHub
                llm = HuggingFaceHub(
                    repo_id="mistralai/Mistral-7B-Instruct-v0.2",
                    huggingfacehub_api_token=hf_key,
                    model_kwargs={"temperature": 0.7, "max_new_tokens": 2048},
                )
                logger.info("LLM: HuggingFace Mistral-7B")
                return llm
            except Exception as e:
                logger.error(f"HuggingFace init failed: {e} — using Mock")
                return MockLLM()

        logger.warning(f"Unknown provider '{self.provider}' — using Mock")
        return MockLLM()

    @property
    def llm(self):
        return self._llm


def get_llm():
    return LLMService.get_instance().llm
