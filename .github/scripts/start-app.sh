#!/usr/bin/env bash
# Start the API (port 3000) and the Vite client (port 4173) from a checkout,
# wait until both answer, and record their PIDs so stop-app.sh can stop them.
#
# Usage: .github/scripts/start-app.sh [checkout-dir]   (default: current dir)
# Uses MONGODB_URI / MONGODB_DB / JWT_SECRET from the environment.
set -euo pipefail

dir="$(cd "${1:-.}" && pwd)"
here="$(cd "$(dirname "$0")" && pwd)"
log_dir="${APP_LOG_DIR:-/tmp/app-logs}"
mkdir -p "$log_dir"

"$here/stop-app.sh" >/dev/null 2>&1 || true

# A git worktree has no node_modules; borrow the main checkout's.
if [ ! -d "$dir/node_modules" ] && [ -d "$GITHUB_WORKSPACE/node_modules" ]; then
  ln -s "$GITHUB_WORKSPACE/node_modules" "$dir/node_modules"
fi

cd "$dir"
setsid npx tsx server/index.ts >"$log_dir/server.log" 2>&1 &
echo $! >/tmp/app-server.pid
setsid npx vite --port 4173 --strictPort --host 127.0.0.1 >"$log_dir/client.log" 2>&1 &
echo $! >/tmp/app-client.pid

for i in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 &&
     curl -fsS http://127.0.0.1:4173/ >/dev/null 2>&1; then
    echo "App is up (API :3000, client :4173) from $dir"
    curl -fsS http://127.0.0.1:3000/api/health; echo
    exit 0
  fi
  sleep 2
done

echo "App did not start within 3 minutes. Logs:" >&2
tail -n 50 "$log_dir/server.log" "$log_dir/client.log" >&2
exit 1
