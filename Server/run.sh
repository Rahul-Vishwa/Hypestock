#!/bin/bash

# Build TypeScript (blocking)
echo "[build] Compiling TypeScript..."
npx tsc -b
if [ $? -ne 0 ]; then
  echo "TypeScript build failed. Exiting."
  exit 1
fi

# Start Node server in the background
echo "[start] Starting Node.js server..."
node dist/index.js &
APP_PID=$!

# Start Caddy reverse proxy in the background
echo "[proxy] Starting Caddy reverse proxy..."
sudo caddy reverse-proxy --from https://api.hypestock.local --to http://localhost:3000 > /dev/null 2>&1 &
CADDY_PID=$!

# Handle Ctrl+C (SIGINT)
trap "echo 'Stopping...'; kill $APP_PID $CADDY_PID; exit" INT TERM

# Wait for Node app to exit (keeps script alive)
wait $APP_PID

# When Node app stops, kill Caddy too
echo "Node server stopped, killing Caddy..."
kill $CADDY_PID
