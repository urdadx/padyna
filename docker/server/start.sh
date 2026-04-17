#!/bin/sh
set -e

echo "--- 1. Setting up Extensions ---"
# This will now run on a clean DB
bun run /app/apps/server/src/setup.ts

echo "--- 2. Fresh Schema Push ---"
cd /app/packages/db
# This will create 'agent_action' and all other tables instantly
bun run drizzle-kit push --force

echo "--- 3. Starting Server ---"
cd /app/apps/server
exec bun run dist/index.mjs