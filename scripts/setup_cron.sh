#!/bin/bash
# setup_cron.sh — Installs the daily 2:00 AM database backup cron job.

set -e

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backup.sh"

# Ensure backup.sh is executable
chmod +x "$SCRIPT_PATH"

# Write the cron job line (sourcing /etc/environment or loading DATABASE_URL if populated)
CRON_JOB="0 2 * * * [ -f /etc/environment ] && . /etc/environment; DATABASE_URL=\"\$DATABASE_URL\" $SCRIPT_PATH"

# Read existing cron, filter out existing backup.sh jobs, and append the new cron job
(crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" ; echo "$CRON_JOB") | crontab -

echo "Cron job successfully scheduled at 2:00 AM daily for: $SCRIPT_PATH"
