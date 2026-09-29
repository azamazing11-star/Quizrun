@echo off
setlocal enabledelayedexpansion

echo =======================================
echo     Starting Quizrun High-Speed App
echo =======================================
echo.

:: Check and install Backend dependencies if missing
if not exist "%~dp0backend\node_modules\" (
    echo [!] backend/node_modules not found. Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
    cd /d "%~dp0"
    echo.
)

:: Check and install Frontend dependencies if missing
if not exist "%~dp0frontend\node_modules\" (
    echo [!] frontend/node_modules not found. Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo.
)

:: Check and build frontend if dist is missing
if not exist "%~dp0frontend\dist\index.html" (
    echo [!] Building high-performance frontend bundle...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
    echo.
)

:: Kill any existing process on port 3001 (Legacy Backend)
echo [i] Clearing port 3001...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill any existing process on port 5173
echo [i] Clearing port 5173...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

ping 127.0.0.1 -n 2 >nul

:: Start Unified Production High-Speed Server (serves both web and sockets on 5173, legacy 3001 attached)
echo Starting Unified High-Speed Server on port 5173...
start "Quizrun High-Speed Server" cmd /k "cd /d "%~dp0backend" && node server.js"

echo.
echo [i] Waiting for server to initialize...
ping 127.0.0.1 -n 3 >nul

:: Open browser
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo ======================================================
echo  Quizrun High-Speed Mode is Ready!
echo  - Unified Web & Sockets: http://localhost:5173
echo  - QR / Public Tunnel: Automatically Active
echo ======================================================
echo.
pause