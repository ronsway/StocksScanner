#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
PID_FILE="$RUN_DIR/deploy.pid"

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
    echo "[deploy] Stopped PID $PID"
  else
    echo "[deploy] Stored PID not running; attempting port-based cleanup"
  fi
  rm -f "$PID_FILE"
fi

PORT="${PORT:-8787}"
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti tcp:$PORT || true)"
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs -r kill 2>/dev/null || true
    sleep 1
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
    echo "[deploy] Stopped processes on port $PORT"
  fi
fi

echo "[deploy] Stop completed"
