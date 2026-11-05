@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)
if exist dist\index.html (
  echo Open http://127.0.0.1:3002 after the server starts.
  echo Keep this window open. Press Ctrl+C to stop.
  node server/index.mjs
  goto end
)
if not exist node_modules\vite\bin\vite.js (
  call npm ci
  if errorlevel 1 goto failed
)
echo.
echo Open http://127.0.0.1:5174 after the servers start.
echo Keep this window open. Press Ctrl+C to stop.
call npm run dev
goto end
:failed
echo Setup failed. See the error above and README.md.
pause
:end
