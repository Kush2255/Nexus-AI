"""
Memory System
Provides persistent conversation memory and agent state across sessions.
Supports Redis (production) with in-memory fallback (development).
"""

import json
import os
import time
from typing import Any, Dict, List, Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)

USE_REDIS = os.getenv("USE_REDIS", "false").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
MEMORY_TTL = 60 * 60 * 24  # 24 hours


class InMemoryStore:
    """Simple in-memory key-value store as Redis fallback."""

    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._ttls: Dict[str, float] = {}

    def set(self, key: str, value: str, ttl: int = MEMORY_TTL):
        self._store[key] = value
        self._ttls[key] = time.time() + ttl

    def get(self, key: str) -> Optional[str]:
        if key not in self._store:
            return None
        if time.time() > self._ttls.get(key, float("inf")):
            del self._store[key]
            return None
        return self._store[key]

    def delete(self, key: str):
        self._store.pop(key, None)
        self._ttls.pop(key, None)

    def keys(self, pattern: str = "*") -> List[str]:
        prefix = pattern.rstrip("*")
        return [k for k in self._store.keys() if k.startswith(prefix)]

    def exists(self, key: str) -> bool:
        return self.get(key) is not None


class MemoryManager:
    """
    Unified memory manager for conversation and agent state.
    Automatically uses Redis if available, falls back to in-memory store.
    """

    def __init__(self):
        self._backend = self._initialize_backend()

    def _initialize_backend(self):
        if USE_REDIS:
            try:
                import redis
                client = redis.from_url(REDIS_URL, decode_responses=True)
                client.ping()
                logger.info("✅ Memory: Using Redis backend")
                return client
            except Exception as e:
                logger.warning(f"⚠️ Redis unavailable ({e}), using in-memory store")

        logger.info("✅ Memory: Using in-memory backend")
        return InMemoryStore()

    # ─── Conversation Memory ─────────────────────────────────────────────────

    def save_conversation_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ):
        """Append a message to conversation history."""
        key = f"conv:{session_id}:messages"
        history = self.get_conversation_history(session_id)
        history.append({
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {},
        })
        # Keep last 50 turns
        history = history[-50:]
        self._backend.set(key, json.dumps(history), ttl=MEMORY_TTL)

    def get_conversation_history(self, session_id: str) -> List[dict]:
        """Retrieve full conversation history for a session."""
        key = f"conv:{session_id}:messages"
        raw = self._backend.get(key)
        if not raw:
            return []
        try:
            return json.loads(raw)
        except Exception:
            return []

    def get_recent_context(self, session_id: str, turns: int = 5) -> str:
        """Get recent conversation as a formatted string for LLM context."""
        history = self.get_conversation_history(session_id)
        recent = history[-turns * 2:] if len(history) > turns * 2 else history
        lines = []
        for msg in recent:
            prefix = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{prefix}: {msg['content'][:300]}")
        return "\n".join(lines)

    def clear_conversation(self, session_id: str):
        """Clear all messages for a session."""
        self._backend.delete(f"conv:{session_id}:messages")

    # ─── Agent State Memory ───────────────────────────────────────────────────

    def save_agent_state(self, session_id: str, agent_name: str, state: dict):
        """Save agent execution state for a session."""
        key = f"agent:{session_id}:{agent_name}"
        self._backend.set(key, json.dumps(state), ttl=MEMORY_TTL)

    def get_agent_state(self, session_id: str, agent_name: str) -> Optional[dict]:
        """Retrieve agent state."""
        key = f"agent:{session_id}:{agent_name}"
        raw = self._backend.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def save_research_context(self, session_id: str, context: dict):
        """Persist research context (plan, findings, critique) for a session."""
        key = f"research:{session_id}"
        self._backend.set(key, json.dumps(context), ttl=MEMORY_TTL)

    def get_research_context(self, session_id: str) -> Optional[dict]:
        """Retrieve research context."""
        key = f"research:{session_id}"
        raw = self._backend.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    # ─── Session Metadata ─────────────────────────────────────────────────────

    def set_session_meta(self, session_id: str, meta: dict):
        key = f"session:{session_id}:meta"
        self._backend.set(key, json.dumps(meta), ttl=MEMORY_TTL)

    def get_session_meta(self, session_id: str) -> dict:
        key = f"session:{session_id}:meta"
        raw = self._backend.get(key)
        return json.loads(raw) if raw else {}

    # ─── Global Knowledge Cache ───────────────────────────────────────────────

    def cache_research(self, query_hash: str, result: str, ttl: int = 3600):
        """Cache research results to avoid redundant LLM calls."""
        key = f"cache:research:{query_hash}"
        self._backend.set(key, result, ttl=ttl)

    def get_cached_research(self, query_hash: str) -> Optional[str]:
        key = f"cache:research:{query_hash}"
        return self._backend.get(key)


# Singleton
_memory_manager: Optional[MemoryManager] = None


def get_memory_manager() -> MemoryManager:
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager
