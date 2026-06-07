"""
Security & Rate Limiting Utilities
Provides API protection, input validation, and rate limiting.
"""

import time
import hashlib
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Simple in-process rate limiter (use Redis-backed in production)
_request_counts: dict = defaultdict(list)

RATE_LIMITS = {
    "chat": (20, 60),        # 20 requests per 60 seconds
    "upload": (10, 60),      # 10 uploads per 60 seconds
    "default": (60, 60),     # 60 requests per 60 seconds
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/octet-stream",
}

MAX_QUERY_LENGTH = 2000
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def check_rate_limit(client_ip: str, endpoint_type: str = "default") -> bool:
    """
    Check if a client IP has exceeded the rate limit.
    Returns True if allowed, raises HTTPException if blocked.
    """
    limit, window = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
    now = time.time()
    key = f"{client_ip}:{endpoint_type}"

    # Clean old entries
    _request_counts[key] = [t for t in _request_counts[key] if now - t < window]

    if len(_request_counts[key]) >= limit:
        logger.warning(f"Rate limit exceeded: {client_ip} on {endpoint_type}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {limit} requests per {window}s.",
        )

    _request_counts[key].append(now)
    return True


def get_client_ip(request: Request) -> str:
    """Extract real client IP, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def sanitize_query(query: str) -> str:
    """Sanitize user input for LLM consumption."""
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query = query.strip()

    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Query too long. Maximum {MAX_QUERY_LENGTH} characters.",
        )

    # Basic injection prevention - strip excessive special chars
    dangerous_patterns = ["<script", "javascript:", "data:text/html"]
    for pattern in dangerous_patterns:
        if pattern.lower() in query.lower():
            raise HTTPException(status_code=400, detail="Invalid query content")

    return query


def validate_file(filename: str, content_type: str, file_size: int) -> bool:
    """Validate uploaded file metadata."""
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB",
        )

    allowed_extensions = {".pdf", ".txt", ".md", ".doc", ".docx"}
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(allowed_extensions)}",
        )

    return True


def hash_query(query: str) -> str:
    """Create a cache key hash for a query."""
    return hashlib.md5(query.lower().strip().encode()).hexdigest()
