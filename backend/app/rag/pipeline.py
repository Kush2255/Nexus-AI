"""
RAG Pipeline — Complete implementation
Text extraction → Chunking → Embeddings → Vector store → Retrieval
"""

import os
import json
from typing import List, Optional, Tuple
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangDoc
from app.utils.logger import get_logger

logger = get_logger(__name__)

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE",    1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))
TOP_K         = int(os.getenv("TOP_K_RETRIEVAL", 5))
EMB_MODEL     = os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
VECTOR_DB     = os.getenv("VECTOR_DB",        "chroma")
CHROMA_DIR    = os.getenv("CHROMA_PERSIST_DIR","./data/chroma")


class RAGPipeline:
    def __init__(self):
        self.embeddings   = self._init_embeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        self.vector_store = None
        self._docs_in_store: int = 0
        self._init_vector_store()

    # ── Embeddings ────────────────────────────────────────────────────────────

    def _init_embeddings(self):
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            emb = HuggingFaceEmbeddings(
                model_name=EMB_MODEL,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            logger.info(f"Embeddings: {EMB_MODEL}")
            return emb
        except Exception as e:
            logger.warning(f"HuggingFace embeddings failed ({e}) — using FakeEmbeddings")
            from langchain_community.embeddings import FakeEmbeddings
            return FakeEmbeddings(size=384)

    # ── Vector store ──────────────────────────────────────────────────────────

    def _init_vector_store(self):
        if VECTOR_DB == "chroma":
            self._init_chroma()
        else:
            self._init_faiss()

    def _init_chroma(self):
        try:
            from langchain_community.vectorstores import Chroma
            os.makedirs(CHROMA_DIR, exist_ok=True)
            self.vector_store = Chroma(
                collection_name="research_documents",
                embedding_function=self.embeddings,
                persist_directory=CHROMA_DIR,
            )
            logger.info("Vector store: ChromaDB")
        except Exception as e:
            logger.warning(f"ChromaDB failed ({e}) — falling back to FAISS")
            self._init_faiss()

    def _init_faiss(self):
        try:
            from langchain_community.vectorstores import FAISS
            placeholder = LangDoc(page_content="init placeholder", metadata={"type": "placeholder"})
            self.vector_store = FAISS.from_documents([placeholder], self.embeddings)
            self._docs_in_store = 0
            logger.info("Vector store: FAISS (in-memory)")
        except Exception as e:
            logger.error(f"FAISS failed: {e}")
            self.vector_store = None

    # ── Ingest ────────────────────────────────────────────────────────────────

    async def ingest_document(
        self, file_path: str, document_id: str, filename: str
    ) -> Tuple[int, List[dict]]:
        text = await self._extract_text(file_path, filename)
        if not text or not text.strip():
            raise ValueError(f"No text extracted from {filename}")

        chunks = self.text_splitter.split_text(text)
        logger.info(f"Ingested {filename}: {len(chunks)} chunks")

        documents = [
            LangDoc(
                page_content=chunk,
                metadata={
                    "document_id": document_id,
                    "filename":    filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            )
            for i, chunk in enumerate(chunks)
        ]

        if self.vector_store is not None:
            self.vector_store.add_documents(documents)
            self._docs_in_store += len(documents)
            if VECTOR_DB == "chroma" and hasattr(self.vector_store, "persist"):
                self.vector_store.persist()

        metadata = [
            {
                "chunk_index":    i,
                "content_preview": c[:200] + ("..." if len(c) > 200 else ""),
                "char_count":     len(c),
            }
            for i, c in enumerate(chunks)
        ]
        return len(chunks), metadata

    async def _extract_text(self, file_path: str, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self._extract_pdf(file_path)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    def _extract_pdf(self, file_path: str) -> str:
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            parts = [p.extract_text() for p in reader.pages if p.extract_text()]
            return "\n\n".join(parts)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(
        self, query: str, k: int = TOP_K, document_id: Optional[str] = None
    ) -> List[dict]:
        if self.vector_store is None or not query.strip():
            return []
        try:
            filter_dict = {"document_id": document_id} if document_id else None
            results = self.vector_store.similarity_search_with_score(
                query, k=k, filter=filter_dict
            )
            out = []
            for doc, score in results:
                if doc.metadata.get("type") == "placeholder":
                    continue
                out.append({
                    "content":         doc.page_content,
                    "metadata":        doc.metadata,
                    "relevance_score": float(max(0.0, 1.0 - score)),
                })
            return out
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            return []

    def delete_document(self, document_id: str):
        try:
            if VECTOR_DB == "chroma" and self.vector_store is not None:
                self.vector_store.delete(where={"document_id": document_id})
        except Exception as e:
            logger.error(f"Delete from vector store failed: {e}")


_rag_pipeline: Optional[RAGPipeline] = None

def get_rag_pipeline() -> RAGPipeline:
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline
