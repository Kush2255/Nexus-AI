"""
RAG Retrieval Agent
Handles semantic retrieval from the vector database.
Provides contextual information to other agents.
"""

from typing import List, Optional, Dict
from app.rag.pipeline import get_rag_pipeline
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RAGRetrievalAgent:
    """
    RAG Retrieval Agent: Performs semantic search over uploaded documents.
    Uses embeddings + vector similarity to find relevant chunks.
    """

    def __init__(self):
        self.name = "RAG Retrieval"
        self.pipeline = get_rag_pipeline()

    def retrieve(
        self,
        queries: List[str],
        k: int = 5,
        document_id: Optional[str] = None,
    ) -> Dict:
        """
        Retrieve relevant document chunks for multiple queries.
        
        Args:
            queries: List of search queries (from planner's search_queries)
            k: Number of chunks to retrieve per query
            document_id: Optional filter by specific document
            
        Returns:
            Dictionary with retrieved chunks and formatted context
        """
        logger.info(f"📚 RAG Agent: Retrieving for {len(queries)} queries...")

        all_results = []
        seen_contents = set()

        for query in queries:
            results = self.pipeline.retrieve(query, k=k, document_id=document_id)
            for result in results:
                # Deduplicate chunks
                content_hash = hash(result["content"][:100])
                if content_hash not in seen_contents:
                    seen_contents.add(content_hash)
                    all_results.append(result)

        # Sort by relevance score
        all_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

        # Take top-k overall
        top_results = all_results[:k * 2]

        # Format as context string
        context = self._format_context(top_results)

        logger.info(f"✅ RAG Agent: Retrieved {len(top_results)} unique chunks")

        return {
            "chunks": top_results,
            "context": context,
            "total_retrieved": len(top_results),
            "queries_used": queries,
        }

    def _format_context(self, chunks: List[dict]) -> str:
        """Format retrieved chunks into a context string for LLM."""
        if not chunks:
            return ""

        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            filename = chunk.get("metadata", {}).get("filename", "Unknown")
            chunk_idx = chunk.get("metadata", {}).get("chunk_index", 0)
            score = chunk.get("relevance_score", 0)

            context_parts.append(
                f"[Source {i}: {filename} (chunk {chunk_idx}, relevance: {score:.2f})]\n"
                f"{chunk['content']}"
            )

        return "\n\n" + "─" * 50 + "\n\n".join(context_parts)

    def get_document_chunks(self, document_id: str) -> List[dict]:
        """Get all chunks for a specific document."""
        return self.pipeline.retrieve("", k=100, document_id=document_id)
