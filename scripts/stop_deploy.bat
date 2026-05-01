@echo off
setlocal

cd /d "%~dp0\.."

if "%PORT%"=="" set PORT=8787

if exist .run\deploy.pid (
  for /f %%p in (.run\deploy.pid) do set PID=%%p
  if not "%PID%"=="" (
    echo [deploy] Stopping PID %PID%...
    taskkill /PID %PID% /F >nul 2>&1
  )
  del /f /q .run\deploy.pid >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo [deploy] Stop completed
