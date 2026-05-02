@echo off
setlocal

cd /d "%~dp0\.."
echo [deploy] Project root: %CD%

if not exist .run mkdir .run
if not exist logs mkdir logs

if exist .run\deploy.pid (
  for /f %%p in (.run\deploy.pid) do set OLD_PID=%%p
  if not "%OLD_PID%"=="" (
    tasklist /FI "PID eq %OLD_PID%" | find "%OLD_PID%" >nul
    if not errorlevel 1 (
      echo [deploy] Already running with PID %OLD_PID%
      goto :eof
    )
  )
  del /f /q .run\deploy.pid >nul 2>&1
)

echo [deploy] Installing dependencies...
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 goto :error

echo [deploy] Building frontend...
call npm run build
if errorlevel 1 goto :error

if "%PORT%"=="" set PORT=8787
echo [deploy] Starting production server on port %PORT% in background...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:NODE_ENV='production'; $env:PORT='%PORT%'; $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','node server/index.js >> logs\\deploy.log 2>&1' -WorkingDirectory '%CD%' -PassThru; $p.Id | Out-File '.run\\deploy.pid' -Encoding ascii"
if errorlevel 1 goto :error

for /f %%p in (.run\deploy.pid) do set NEW_PID=%%p
echo [deploy] Started with PID %NEW_PID%
echo [deploy] Log: logs\deploy.log

goto :eof

:error
echo [deploy] Script failed.
exit /b 1
