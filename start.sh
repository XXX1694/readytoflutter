#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"

# Resolve the script's own directory (works regardless of where you call it from)
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting ReadyToFlutter..."

# Kill any stale processes on our ports
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Small pause to let ports free up
perl -e 'sleep(1)'

# Start backend
node "$ROOT/backend/server.js" &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) → http://localhost:3001"

# Start frontend
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) → http://localhost:3000"

echo ""
echo "📖 Open: http://localhost:3000"
echo "   Press Ctrl+C to stop both servers"

# Cleanup on exit
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
