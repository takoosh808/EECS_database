#!/bin/sh

set -e

echo "Waiting for database..."

echo "Running migrations."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "Starting the application."
exec node server.js