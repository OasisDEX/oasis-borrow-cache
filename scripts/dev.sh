#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Starting dependencies..."
echo "container clean up..."
docker rm -f postgres-vulcan2x || true
echo "docker-compose clean up..."
docker-compose down 
echo "migration..."
(sleep 5 && yarn migrate) &
echo "docker-compose ip..."
docker-compose up