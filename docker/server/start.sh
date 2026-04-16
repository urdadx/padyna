#!/bin/sh
set -eu

echo "Running database migrations..."

attempt=1
max_attempts=20

until bun run src/migrate.ts; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migrations failed after $max_attempts attempts."
    exit 1
  fi

  echo "Migration attempt $attempt failed. Waiting for database..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "Starting server..."
exec bun run src/index.ts
