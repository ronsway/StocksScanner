@echo off
setlocal

cd /d "%~dp0\.."

if exist .run\dev.pid (
  for /f %%p in (.run\dev.pid) do set PID=%%p
  if not "%PID%"=="" (
    echo [dev] Stopping PID %PID%...
    taskkill /PID %PID% /F >nul 2>&1
  )
  del /f /q .run\dev.pid >nul 2>&1
)

for %%P in (5173 8787) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
    taskkill /PID %%a /F >nul 2>&1
  )
)

echo [dev] Stop completed
