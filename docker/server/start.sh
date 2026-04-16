#!/bin/sh
set -eu

echo "Running database migrations..."
bun run src/migrate.ts

echo "Starting server..."
exec bun run src/index.ts
