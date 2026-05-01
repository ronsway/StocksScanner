#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$RUN_DIR/deploy.pid"

cd "$PROJECT_ROOT"

echo "[deploy] Project root: $PROJECT_ROOT"

echo "[deploy] Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "[deploy] Building frontend..."
npm run build

mkdir -p "$RUN_DIR" "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[deploy] Already running with PID $OLD_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

echo "[deploy] Starting production server on port ${PORT:-8787} in background..."
nohup env NODE_ENV=production node server/index.js >"$LOG_DIR/deploy.log" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

echo "[deploy] Started with PID $NEW_PID"
echo "[deploy] Log: $LOG_DIR/deploy.log"
