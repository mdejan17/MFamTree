#!/usr/bin/env bash
# Consistent online backup of the SQLite database — safe to run while the
# API is live, since it uses SQLite's own backup API (not a plain file copy,
# which could grab a half-written page). Intended to run from cron:
#   0 3 * * * /opt/family-tree/deploy/backup-db.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$REPO_DIR/backups"
mkdir -p "$BACKUP_DIR"

cd "$REPO_DIR/server"
set -a; source .env 2>/dev/null || true; set +a
DB_PATH="${DB_PATH:-./data/family-tree.sqlite3}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEST="$BACKUP_DIR/family-tree-$TIMESTAMP.sqlite3"

node -e "
const { DatabaseSync, backup } = require('node:sqlite');
const path = require('node:path');
const src = new DatabaseSync(path.resolve('$DB_PATH'));
backup(src, '$DEST').then(() => {
  console.log('Backed up to $DEST');
  process.exit(0);
}).catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
"

# Keep the last 30 days of backups, delete anything older.
find "$BACKUP_DIR" -name 'family-tree-*.sqlite3' -mtime +30 -delete
