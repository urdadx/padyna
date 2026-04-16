#!/bin/sh
set -eu

echo "Running database setup..."

attempt=1
max_attempts=20

# Run setup to create extensions
until bun run src/setup.ts; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database setup failed after $max_attempts attempts."
    exit 1
  fi

  echo "Setup attempt $attempt failed. Waiting for database..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "Pushing database schema..."
# We run drizzle-kit push where the schema rules and configuration reside
cd node_modules/@padyna/db
bunx --bun drizzle-kit push --force
cd -

echo "Starting server..."
exec bun run src/index.ts
