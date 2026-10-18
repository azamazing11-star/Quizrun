@echo off
chcp 65001 > nul
title Quizrun - GitHub 및 Render 원클릭 코드 최신화

echo =======================================================
echo     Quizrun - GitHub 및 Render 원클릭 동기화
echo =======================================================
echo.
echo [1/3] GitHub에서 최신 코드 내려받는 중 (git pull)...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [경고] git pull 도중 충돌 또는 네트워크 오류가 발생했습니다.
)

echo.
echo [2/3] 로컬 코드 변경사항 GitHub으로 올리는 중 (git push)...
git add .
git commit -m "원클릭 동기화: %date% %time%"
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [알림] 변경된 코드가 없거나 정상 반영되었습니다.
)

echo.
echo [3/3] 프론트엔드 최신 번들 빌드 중 (npm run build)...
cd /d "%~dp0frontend"
call npm run build
cd /d "%~dp0"

echo.
echo =======================================================
echo    ★ GitHub 및 웹사이트 동기화가 완료되었습니다!
echo    배포 웹사이트는 1~2분 뒤 자동으로 최신 버전이 됩니다.
echo =======================================================
echo.
timeout /t 5
