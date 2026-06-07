#!/usr/bin/env bash
# ============================================================
# NEXUS AI — Quick Start Script
# Starts both backend and frontend in development mode
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   NEXUS AI — Multi-Agent Research Assistant      ║${NC}"
echo -e "${CYAN}║   Quick Start                                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}✗ Python 3 not found. Install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${NC}"

# ─── Backend setup ────────────────────────────────────────────

echo ""
echo -e "${CYAN}Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

echo "Installing Python dependencies (this may take a while on first run)..."
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠  Created .env from example. Please add your OPENAI_API_KEY!${NC}"
fi

mkdir -p data/uploads data/chroma data/reports data/exports

echo -e "${GREEN}✓ Backend ready${NC}"

# Start backend in background
echo "Starting backend server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend running (PID $BACKEND_PID) → http://localhost:8000${NC}"

cd ..

# ─── Frontend setup ───────────────────────────────────────────

echo ""
echo -e "${CYAN}Setting up frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install --silent
fi

if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
fi

echo -e "${GREEN}✓ Frontend ready${NC}"

echo ""
echo -e "${CYAN}Starting frontend dev server...${NC}"
npm run dev &
FRONTEND_PID=$!

cd ..

# ─── Done ─────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🚀 NEXUS AI is running!                        ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║   Frontend:  http://localhost:3000               ║${NC}"
echo -e "${GREEN}║   Backend:   http://localhost:8000               ║${NC}"
echo -e "${GREEN}║   API Docs:  http://localhost:8000/docs          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Trap Ctrl+C
trap 'echo ""; echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Wait
wait
