#!/bin/sh
set -eu

echo "Running database setup and migrations..."

attempt=1
max_attempts=20

until sh -eu -c 'cd /app/apps/server && bun run src/setup.ts && cd /app/packages/db && bun run db:migrate'; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database setup failed after $max_attempts attempts."
    exit 1
  fi

  echo "Setup attempt $attempt failed. Waiting for database..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "Starting server..."
cd /app/apps/server
exec bun run dist/index.mjs
