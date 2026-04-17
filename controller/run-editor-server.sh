#!/usr/bin/env bash
set -euox pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pkill -x editor-server 2>/dev/null || true

pids=$(ss -ltnp 'sport = :http' 2>/dev/null \
  | sed -n 's/.*pid=\([0-9]*\).*/\1/p' \
  | sort -u) || true
for p in $pids; do
  [ -n "$p" ] || continue
  kill "$p" 2>/dev/null || true
done

sleep 0.3
cargo build --manifest-path controller/Cargo.toml

LOG=/tmp/resumify-editor-server.log

nohup cargo run --manifest-path controller/Cargo.toml -- "$ROOT" </dev/null >>"$LOG" 2>&1 &
disown "$!" 2>/dev/null || true

for _ in $(seq 1 40); do
  if ss -ltn 'sport = :http' 2>/dev/null | grep -q LISTEN; then
    echo "editor-server is up on port 80 — tail -f $LOG"
    exit 0
  fi
  sleep 0.25
done

echo "warning: port 80 not listening yet; tail -f $LOG"
exit 0
