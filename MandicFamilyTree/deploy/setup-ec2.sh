#!/usr/bin/env bash
# One-time EC2 instance setup. Run as root (sudo bash deploy/setup-ec2.sh)
# from the repo checkout, e.g. /opt/family-tree.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (sudo bash deploy/setup-ec2.sh)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="familytree"

echo "== Installing Node.js 22.x =="
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "== Installing nginx and certbot =="
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "== Creating dedicated app user =="
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home "$REPO_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi
chown -R "$APP_USER:$APP_USER" "$REPO_DIR"

echo "== Installing systemd service =="
cp "$REPO_DIR/deploy/family-tree-api.service" /etc/systemd/system/family-tree-api.service
sed -i "s#__REPO_DIR__#$REPO_DIR#g; s#__APP_USER__#$APP_USER#g" /etc/systemd/system/family-tree-api.service
systemctl daemon-reload
systemctl enable family-tree-api

echo "== Scheduling daily database backups =="
# Installed into root's crontab (not $APP_USER's) since root can read the
# SQLite file regardless of which user owns it. Idempotent: re-running this
# script won't add a duplicate line for the same backup script.
BACKUP_CRON_LINE="0 3 * * * $REPO_DIR/deploy/backup-db.sh >> /var/log/family-tree-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -vF "$REPO_DIR/deploy/backup-db.sh" ; echo "$BACKUP_CRON_LINE" ) | crontab -
echo "Backups will run daily at 03:00 into $REPO_DIR/backups — copy that"
echo "directory off the instance periodically (e.g. to S3)."

echo
echo "Setup done. Next steps:"
echo "  1. cd $REPO_DIR/server && cp .env.example .env   # then edit it"
echo "  2. bash $REPO_DIR/deploy/deploy.sh"
echo "  3. Configure nginx (see deploy/README.md)"
