#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

# Resolve the script's own directory (works regardless of where you call it from)
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting ReadyToFlutter..."

# Verify dependencies are installed before trying to run anything. A missing
# node_modules is the #1 silent-failure reason on a fresh clone.
if [ ! -d "$ROOT/backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  (cd "$ROOT/backend" && npm install)
fi
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install)
fi

# Track the children we spawn — only kill *those*, never any other Node
# processes the user might have running. (The previous version did
# `pkill -f "node server.js"` which would clobber unrelated repos.)
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Stopping..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

# Backend. --env-file-if-exists so a missing .env doesn't crash the script
# (Render-style deploys put env vars in process.env directly).
if [ -f "$ROOT/backend/.env" ]; then
  node --env-file="$ROOT/backend/.env" "$ROOT/backend/server.js" &
else
  node "$ROOT/backend/server.js" &
fi
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) → http://localhost:3001"

# Frontend
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) → http://localhost:3000"

echo ""
echo "📖 Open: http://localhost:3000"
echo "   Press Ctrl+C to stop both servers"

wait
