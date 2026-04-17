#!/bin/sh
set -e

echo "--- 1. Waiting for Database Connection ---"
# We use a simple ping to the setup script to see if the DB is awake
attempt=1
until bun run /app/apps/server/src/setup.ts; do
  echo "Database not ready yet (Attempt $attempt)... retrying in 2s"
  sleep 2
  attempt=$((attempt + 1))
  if [ $attempt -gt 30 ]; then
    echo "Error: Database timed out."
    exit 1
  fi
done

echo "--- 2. Syncing Schema with Drizzle ---"
# Navigate to the DB package where drizzle-kit is configured
cd /app/packages/db
bun run db:push --force

echo "--- 3. Starting Production Server ---"
cd /app/apps/server
exec bun run dist/index.mjs