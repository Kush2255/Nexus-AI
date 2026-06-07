# NEXUS AI — Deployment Guide

## Vercel (Frontend) + Railway (Backend)

### 1. Backend → Railway

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select `backend/` as the root directory
4. Railway uses the `Procfile`:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Set these **Environment Variables** in Railway dashboard:
   ```
   OPENAI_API_KEY=sk-proj-...
   HUGGINGFACE_API_KEY=hf_...
   LLM_PROVIDER=openai
   OPENAI_MODEL=gpt-4o-mini
   VECTOR_DB=faiss
   DATABASE_URL=sqlite+aiosqlite:///./data/research_assistant.db
   MAX_REFLECTION_LOOPS=2
   API_CORS_ORIGINS=https://your-frontend.vercel.app
   SECRET_KEY=your-random-secret-key
   ```
6. Note your Railway URL: `https://nexus-ai-backend.up.railway.app`

### 2. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework: **Vite** (auto-detected)
4. Set this **Environment Variable** in Vercel:
   ```
   VITE_API_URL=https://nexus-ai-backend.up.railway.app/api
   ```
5. Deploy — Vercel auto-detects `vercel.json` for SPA routing

### 3. Update CORS

After frontend deploys, update Railway's `API_CORS_ORIGINS`:
```
API_CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## Local Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit with your API keys
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev   # → http://localhost:3000
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `LLM_PROVIDER` | ✅ | `openai` | `openai` / `huggingface` / `mock` |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | OpenAI model |
| `VECTOR_DB` | — | `faiss` | `faiss` or `chroma` |
| `DATABASE_URL` | — | SQLite | Async DB URL |
| `API_CORS_ORIGINS` | ✅ | localhost | Your frontend URL(s) |
| `MAX_REFLECTION_LOOPS` | — | `2` | Critic agent iterations |
| `SECRET_KEY` | ✅ | — | Random secret for production |

---

## Security Checklist

- [ ] `.env` is in `.gitignore` — API keys never in git
- [ ] `API_CORS_ORIGINS` set to exact frontend domain
- [ ] `SECRET_KEY` is a long random string
- [ ] `MAX_FILE_SIZE_MB` set appropriately
- [ ] HTTPS enforced on both frontend and backend
