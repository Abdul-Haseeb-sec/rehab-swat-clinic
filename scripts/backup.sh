#!/bin/bash
# backup.sh — Automates PostgreSQL database dump, compression, and Backblaze B2 replication.

set -e

# Ensure backup log directory exists
LOG_FILE="/var/log/rehabswat_backup.log"
touch "$LOG_FILE" 2>/dev/null || true

echo "=== Backup started at $(date) ===" >> "$LOG_FILE" 2>&1

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not set in environment." >> "$LOG_FILE" 2>&1
    exit 1
fi

# Determine filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="/tmp/rehabswat_backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/rehabswat_backup_${TIMESTAMP}.sql.gz"

# Run pg_dump and gzip it
if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
    echo "[INFO] pg_dump completed successfully: $BACKUP_FILE" >> "$LOG_FILE" 2>&1
else
    echo "[ERROR] pg_dump failed!" >> "$LOG_FILE" 2>&1
    exit 1
fi

# Upload to Backblaze B2 using rclone
if rclone copy "$BACKUP_FILE" b2:rehabswat-backups/daily/; then
    echo "[INFO] Upload to Backblaze B2 (b2:rehabswat-backups/daily/) succeeded." >> "$LOG_FILE" 2>&1
    # Delete local backup file after successful upload
    rm -f "$BACKUP_FILE"
    echo "[INFO] Local backup file deleted." >> "$LOG_FILE" 2>&1
else
    echo "[ERROR] Upload to Backblaze B2 failed!" >> "$LOG_FILE" 2>&1
    exit 1
fi

echo "=== Backup completed successfully at $(date) ===" >> "$LOG_FILE" 2>&1
