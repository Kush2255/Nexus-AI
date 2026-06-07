@echo off
:: ============================================================
:: NEXUS AI — Quick Start (Windows)
:: ============================================================

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   NEXUS AI — Multi-Agent Research Assistant      ║
echo  ║   Quick Start (Windows)                          ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.11+ from python.org
    pause & exit /b 1
)

:: Check Node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from nodejs.org
    pause & exit /b 1
)

echo [OK] Prerequisites found

:: ── Backend ────────────────────────────────────────────────
echo.
echo [*] Setting up backend...
cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -q -r requirements.txt

if not exist .env (
    copy .env.example .env
    echo [!] Created .env — please add your OPENAI_API_KEY
)

if not exist data mkdir data
if not exist data\uploads mkdir data\uploads
if not exist data\chroma mkdir data\chroma
if not exist data\reports mkdir data\reports

echo [OK] Starting backend server...
start "NEXUS AI Backend" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

cd ..

:: ── Frontend ───────────────────────────────────────────────
echo.
echo [*] Setting up frontend...
cd frontend

if not exist node_modules (
    echo Installing npm packages...
    call npm install --silent
)

if not exist .env.local (
    copy .env.example .env.local
)

echo [OK] Starting frontend...
start "NEXUS AI Frontend" cmd /k "npm run dev"

cd ..

:: ── Done ───────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   NEXUS AI is starting!                          ║
echo  ║                                                  ║
echo  ║   Frontend:  http://localhost:3000               ║
echo  ║   Backend:   http://localhost:8000               ║
echo  ║   API Docs:  http://localhost:8000/docs          ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  Two terminal windows have been opened.
echo  Close them to stop the servers.
echo.
pause
