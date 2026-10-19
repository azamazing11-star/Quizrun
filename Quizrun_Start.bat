@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Quizrun High-Speed App

echo =======================================
echo     Starting Quizrun High-Speed App
echo =======================================
echo.

:: Check latest updates from GitHub and smart-merge with local changes
echo [0/4] Syncing latest updates with GitHub...
for /f %%i in ('git rev-parse HEAD 2^>nul') do set BEFORE_HEAD=%%i
git add -A >nul 2>&1
git diff --cached --quiet || git commit -m "Auto-save local changes on startup" >nul 2>&1
git fetch origin main
git merge origin/main --no-edit -X theirs
git push origin main >nul 2>&1
for /f %%i in ('git rev-parse HEAD 2^>nul') do set AFTER_HEAD=%%i
echo.

:: Check and install Backend dependencies if missing
if not exist "%~dp0backend\node_modules\" (
    echo [1/4] Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
    cd /d "%~dp0"
    echo.
)

:: Check and install Frontend dependencies if missing
if not exist "%~dp0frontend\node_modules\" (
    echo [2/4] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo.
)

:: Build frontend if dist is missing OR if GitHub updates were merged
set NEED_BUILD=0
if not exist "%~dp0frontend\dist\index.html" set NEED_BUILD=1
if not "!BEFORE_HEAD!"=="!AFTER_HEAD!" set NEED_BUILD=1
if "!NEED_BUILD!"=="1" (
    echo [3/4] Building latest frontend bundle...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
    echo.
)

:: Kill any existing process on port 3001 (Legacy Backend)
echo [4/4] Clearing ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill any existing process on port 5173
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

ping 127.0.0.1 -n 2 >nul

:: Start Unified Production Server on port 5173
echo Starting Unified High-Speed Server on port 5173...
start "Quizrun High-Speed Server" cmd /k "cd /d "%~dp0backend" && node server.js"

echo.
echo Waiting for server to initialize...
ping 127.0.0.1 -n 3 >nul

:: Open browser
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo ======================================================
echo  Quizrun High-Speed Mode is Ready!
echo  - Unified Web and Sockets: http://localhost:5173
echo  - QR / Public Tunnel: Active
echo ======================================================
echo.
pause