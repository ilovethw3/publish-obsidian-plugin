#!/bin/bash

echo "=== Container Status ==="
docker ps -a

echo ""
echo "=== App Container Logs ==="
docker logs obsidian-publisher-app --tail=50

echo ""
echo "=== Nginx Container Logs ==="
docker logs obsidian-publisher-nginx --tail=50

echo ""
echo "=== Docker Compose Services Status ==="
docker compose ps