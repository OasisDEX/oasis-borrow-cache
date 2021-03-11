#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Starting dependencies..."
docker rm -f postgres-vulcan2x || true
docker-compose down 
(sleep 5 && yarn migrate) &
docker-compose up