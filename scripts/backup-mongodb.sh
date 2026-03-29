#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$HOME/bitz_backups"
CONTAINER="bitz-mongodb"
DATABASE="${MONGO_DATABASE:-bitz}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="bitz-mongo-${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup..."

docker exec "$CONTAINER" mongodump \
  --db="$DATABASE" \
  --archive="/tmp/${BACKUP_NAME}.archive" \
  --gzip

docker cp "${CONTAINER}:/tmp/${BACKUP_NAME}.archive" "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz"
docker exec "$CONTAINER" rm -f "/tmp/${BACKUP_NAME}.archive"

find "$BACKUP_DIR" -name "bitz-mongo-*.archive.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup saved to ${BACKUP_DIR}/${BACKUP_NAME}.archive.gz"
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days."
