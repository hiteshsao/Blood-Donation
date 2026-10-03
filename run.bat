@echo off
title Blood Donation Management System Runner
echo ========================================================
echo   Blood Donation Management System (MERN)
echo ========================================================
echo.

echo [1/3] Ensuring ports 5000 and 5173 are free...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] Starting Backend Server (Port 5000)...
start "Blood Donation Backend (Port 5000)" cmd /k "cd /d %~dp0server && node src/server.js"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend Client (Port 5173)...
start "Blood Donation Frontend (Port 5173)" cmd /k "cd /d %~dp0client && npm.cmd run dev"

echo.
echo ========================================================
echo   Application started successfully in dedicated windows!
echo.
echo   * Frontend Web App:     http://localhost:5173
echo   * Interactive API Docs: http://localhost:5000/api/docs
echo   * Health Probe:         http://localhost:5000/api/health
echo ========================================================
echo.
pause
