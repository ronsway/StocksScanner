#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
PID_FILE="$RUN_DIR/dev.pid"

stop_pid() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    return 0
  fi
  return 1
}

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if [[ -n "$PID" ]] && stop_pid "$PID"; then
    echo "[dev] Stopped PID $PID"
  else
    echo "[dev] Stored PID not running; attempting port-based cleanup"
  fi
  rm -f "$PID_FILE"
fi

for PORT in 5173 8787; do
  if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -ti tcp:$PORT || true)"
    if [[ -n "$PIDS" ]]; then
      echo "$PIDS" | xargs -r kill 2>/dev/null || true
      sleep 1
      echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
      echo "[dev] Stopped processes on port $PORT"
    fi
  fi
done

echo "[dev] Stop completed"
