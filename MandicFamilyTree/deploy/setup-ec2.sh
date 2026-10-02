#!/usr/bin/env bash
# One-time EC2 instance setup. Run as root (sudo bash deploy/setup-ec2.sh)
# from the repo checkout, e.g. /opt/family-tree.
#
# Supports both Ubuntu/Debian (apt) and Amazon Linux 2023 (dnf) — the two
# package managers' commands differ enough (Node.js install source, how
# certbot is obtained) that this detects the distro once up front and
# branches on it, rather than keeping two separate scripts in sync.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (sudo bash deploy/setup-ec2.sh)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="familytree"

# --- Distro detection -------------------------------------------------------
. /etc/os-release
case "$ID" in
  ubuntu|debian) DISTRO_FAMILY="debian" ;;
  amzn|fedora|rhel|centos) DISTRO_FAMILY="rhel" ;;
  *)
    echo "Unrecognized distro '$ID' (from /etc/os-release) — this script" >&2
    echo "only knows Ubuntu/Debian (apt) and Amazon Linux/RHEL-family (dnf)." >&2
    echo "Install Node 22, nginx, and certbot manually, then re-run from the" >&2
    echo "'Creating dedicated app user' step, or adapt this script." >&2
    exit 1
    ;;
esac
echo "== Detected distro: $PRETTY_NAME (treating as $DISTRO_FAMILY) =="

echo "== Installing Node.js 22.x =="
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi
fi
node -v

echo "== Installing nginx =="
if [[ "$DISTRO_FAMILY" == "debian" ]]; then
  apt-get update
  apt-get install -y nginx
else
  dnf install -y nginx
fi

echo "== Installing certbot =="
if [[ "$DISTRO_FAMILY" == "debian" ]]; then
  apt-get install -y certbot python3-certbot-nginx
else
  # Amazon Linux 2023 has no EPEL/snap, so certbot isn't packaged for it —
  # this is the EFF's own recommended install for that case: an isolated
  # venv with a symlink onto $PATH, rather than pip-installing system-wide.
  if [[ ! -x /opt/certbot/bin/certbot ]]; then
    dnf install -y python3 augeas-libs
    python3 -m venv /opt/certbot
    /opt/certbot/bin/pip install --upgrade pip
    /opt/certbot/bin/pip install certbot certbot-nginx
  fi
  ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
fi

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
# Minimal AL2023 AMIs don't install cron at all; Ubuntu/Debian's cloud
# images do, but installing it unconditionally here is harmless either way.
if ! command -v crontab >/dev/null; then
  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    apt-get install -y cron
    systemctl enable --now cron
  else
    dnf install -y cronie
    systemctl enable --now crond
  fi
fi

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
echo "  3. Configure nginx (see deploy/README.md — the exact steps differ"
echo "     between Debian/Ubuntu's sites-available/sites-enabled layout and"
echo "     Amazon Linux's single conf.d/*.conf file; this instance is $DISTRO_FAMILY)"
