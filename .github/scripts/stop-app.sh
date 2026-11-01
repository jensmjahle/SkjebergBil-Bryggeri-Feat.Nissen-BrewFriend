#!/usr/bin/env bash
# Stop the processes started by start-app.sh.
for f in /tmp/app-server.pid /tmp/app-client.pid; do
  if [ -f "$f" ]; then
    pid=$(cat "$f")
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$f"
  fi
done
# Wait for the ports to free up.
for i in $(seq 1 20); do
  if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 &&
     ! curl -fsS http://127.0.0.1:4173/ >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
