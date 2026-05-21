#!/bin/bash
# restore.sh — Retrieves and restores the most recent database backup from Backblaze B2.

set -e

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not set in environment."
    exit 1
fi

# 1. List files in B2 and find the most recent one
echo "Finding the most recent backup on Backblaze B2..."
LATEST_BACKUP=$(rclone lsf b2:rehabswat-backups/daily/ | sort | tail -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "[ERROR] No backup found in b2:rehabswat-backups/daily/"
    exit 1
fi

echo "Latest backup found: $LATEST_BACKUP"

# 2. Download the backup
BACKUP_DIR="/tmp/rehabswat_restores"
mkdir -p "$BACKUP_DIR"
LOCAL_FILE="${BACKUP_DIR}/${LATEST_BACKUP}"

echo "Downloading $LATEST_BACKUP from B2..."
rclone copy "b2:rehabswat-backups/daily/${LATEST_BACKUP}" "$BACKUP_DIR"

# 3. Restore the backup
echo "Restoring backup into the database..."
if gunzip -c "$LOCAL_FILE" | psql "$DATABASE_URL"; then
    echo "Restore completed successfully!"
    # Delete local file after successful restore
    rm -f "$LOCAL_FILE"
else
    echo "[ERROR] Restore failed!"
    exit 1
fi
