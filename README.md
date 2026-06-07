# NEXUS AI — Multi-Agent Autonomous Research Assistant

> Production-grade multi-agent AI system with RAG, LangGraph orchestration, reflection loops, streaming, and a futuristic React UI.

```
User Query ──▶ Planner ──▶ RAG Retrieval ──▶ Researcher
                                                  │
                                        ◀── Critic ──▶ (score >= 8)
                                        (refine)           │
                                                      Reporter
                                                           │
                                                  Final Report + Response
```

## Features

### AI / Research
- 5 specialized agents orchestrated by LangGraph StateGraph
- Reflection & self-critique loops — Critic scores 0-10, loops until quality >= 8
- Full RAG pipeline — PDF → chunking → all-MiniLM-L6-v2 embeddings → ChromaDB/FAISS → semantic retrieval
- Hallucination risk detection
- Web search integration (DuckDuckGo)
- Modular LLM switching — OpenAI GPT-4, HuggingFace, or Mock mode (no API key needed)

### Backend
- FastAPI with async SQLite database
- Server-Sent Events (SSE) streaming + WebSocket support
- Conversation memory (in-memory or Redis)
- Markdown + PDF report export
- Rate limiting, input sanitization, security headers
- Full test suite (pytest + pytest-asyncio)

### Frontend
- React 18 + Tailwind CSS + Framer Motion
- Dark glassmorphism UI
- Real-time streaming chat
- Live agent workflow SVG visualization
- Per-message agent execution trace viewer
- Document management with drag-and-drop upload
- Analytics dashboard with sparkline charts
- Reports page with preview and download
- Settings panel

## Quick Start

**macOS / Linux:**
```bash
chmod +x start.sh && ./start.sh
```

**Windows:**
```cmd
start.bat
```

**Manual:**
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add OPENAI_API_KEY (or set LLM_PROVIDER=mock)
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

Visit: http://localhost:3000 (frontend) · http://localhost:8000/docs (API docs)

## No API Key?
Set `LLM_PROVIDER=mock` in `backend/.env` for full demo mode — all agents run with structured mock responses.

## Project Structure

```
multi-agent-ai-system/
├── backend/
│   ├── app/
│   │   ├── agents/         # planner, researcher, rag, critic, reporter, orchestrator
│   │   ├── rag/            # chunking, embeddings, vector store, retrieval
│   │   ├── api/            # chat, documents, agents, reports, streaming, analytics, export
│   │   ├── memory/         # Redis / in-memory conversation + agent state
│   │   ├── models/         # SQLAlchemy async DB models
│   │   └── services/       # LLM provider (OpenAI/HF/Mock), web search
│   ├── tests/              # Unit + integration tests
│   └── main.py             # FastAPI app
├── frontend/
│   └── src/
│       ├── pages/          # Landing, Dashboard, Chat, Documents, Reports, Settings
│       ├── components/     # agents/, chat/, layout/, ui/
│       ├── hooks/          # streaming, documents, agents, analytics
│       ├── context/        # AppContext (settings + backend health)
│       └── services/       # Axios API layer
├── docker-compose.yml
├── start.sh / start.bat
├── DEPLOYMENT.md
└── EXAMPLE_PROMPTS.md
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Full agent pipeline query |
| GET  | `/api/chat/sessions` | List sessions |
| POST | `/api/documents/upload` | Upload + index document |
| GET  | `/api/documents/` | List documents |
| GET  | `/api/agents/status` | Agent health |
| GET  | `/api/agents/workflow` | Graph topology |
| POST | `/api/stream/stream` | SSE streaming |
| WS   | `/api/stream/ws/{id}` | WebSocket |
| GET  | `/api/analytics/overview` | Usage stats |
| POST | `/api/export/session` | Export session |

## Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

## Deployment

See DEPLOYMENT.md for Vercel + Railway, Docker Compose, and Render instructions.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Framer Motion |
| Backend | Python 3.11, FastAPI |
| AI | LangChain, LangGraph |
| LLM | OpenAI GPT-4 / HuggingFace / Mock |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Vector DB | ChromaDB / FAISS |
| Database | SQLite (aiosqlite) |
| Memory | In-memory / Redis |
| CI/CD | GitHub Actions |
| Deploy | Vercel + Railway / Docker |
