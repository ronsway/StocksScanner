#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$RUN_DIR/dev.pid"

cd "$PROJECT_ROOT"

echo "[dev] Project root: $PROJECT_ROOT"

if [[ ! -d node_modules ]]; then
  echo "[dev] Installing dependencies..."
  npm install
fi

mkdir -p "$RUN_DIR" "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[dev] Already running with PID $OLD_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

echo "[dev] Starting frontend + backend in background..."
nohup npm run dev >"$LOG_DIR/dev.log" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

echo "[dev] Started with PID $NEW_PID"
echo "[dev] Log: $LOG_DIR/dev.log"

