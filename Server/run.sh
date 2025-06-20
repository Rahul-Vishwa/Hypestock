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
node dist/index.js
