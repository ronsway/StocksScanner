@echo off
setlocal

cd /d "%~dp0\.."
echo [dev] Project root: %CD%

if not exist .run mkdir .run
if not exist logs mkdir logs

if not exist node_modules (
  echo [dev] Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

if exist .run\dev.pid (
  for /f %%p in (.run\dev.pid) do set OLD_PID=%%p
  if not "%OLD_PID%"=="" (
    tasklist /FI "PID eq %OLD_PID%" | find "%OLD_PID%" >nul
    if not errorlevel 1 (
      echo [dev] Already running with PID %OLD_PID%
      goto :eof
    )
  )
  del /f /q .run\dev.pid >nul 2>&1
)

echo [dev] Starting frontend + backend in background...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev >> logs\\dev.log 2>&1' -WorkingDirectory '%CD%' -PassThru; $p.Id | Out-File '.run\\dev.pid' -Encoding ascii"
if errorlevel 1 goto :error

for /f %%p in (.run\dev.pid) do set NEW_PID=%%p
echo [dev] Started with PID %NEW_PID%
echo [dev] Log: logs\dev.log

goto :eof

:error
echo [dev] Script failed.
exit /b 1
