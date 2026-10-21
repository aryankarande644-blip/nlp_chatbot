#!/usr/bin/env bash
# Starts Postgres check, backend, and frontend together.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "Postgres not reachable on localhost:5432."
  echo "Start it with: sudo service postgresql start"
  exit 1
fi

echo "==> Ensuring database and tables..."
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname='chatbot'" | grep -q 1 \
  || psql -U postgres -h localhost -c "CREATE DATABASE chatbot;" >/dev/null

echo "==> Running migration..."
cd "$ROOT/backend" && npm run migrate >/dev/null

echo "==> Starting backend on port 5000..."
cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

sleep 3

echo "==> Starting frontend on port 5173..."
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
