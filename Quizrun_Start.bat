@echo off
setlocal enabledelayedexpansion

echo =======================================
echo     Starting Quizrun Application...
echo =======================================
echo.

set "BACKEND_RUNNING=0"
set "FRONTEND_RUNNING=0"

:: Check for Backend (Port 3001)
netstat -ano | findstr :3001 > nul
if %errorlevel% equ 0 (
    set "BACKEND_RUNNING=1"
    echo [i] Backend is already running on port 3001.
) else (
    echo Starting Backend Server on port 3001...
    start "Quizrun Backend" cmd /c "cd backend && node server.js"
)

:: Check for Frontend (Port 5173)
netstat -ano | findstr :5173 > nul
if %errorlevel% equ 0 (
    set "FRONTEND_RUNNING=1"
    echo [i] Frontend is already running on port 5173.
) else (
    echo Starting Frontend on localhost:5173...
    start "Quizrun Frontend" cmd /c "cd frontend && npm run dev -- --host"
)

echo.
echo [i] Waiting for servers to initialize...
timeout /t 3 /nobreak > nul

:: Open browser manually
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo =======================================
echo Quizrun is ready!
echo - Backend: Port 3001
echo - Frontend: http://localhost:5173
echo =======================================
echo.
pause
