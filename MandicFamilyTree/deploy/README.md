# Deploying to an AWS EC2 instance

This assumes a single EC2 instance (e.g. an Ubuntu 22.04/24.04 `t3.small` or
similar) running both the Node API and serving the built React frontend
through nginx, with the SQLite database living on that instance's disk.

## 1. One-time server setup

SSH into the instance, clone the repo, then run the setup script as root
(it installs Node 22, nginx, and certbot):

```bash
git clone <your-repo-url> /opt/family-tree
cd /opt/family-tree
sudo bash deploy/setup-ec2.sh
```

What it does:
- Installs Node.js 22.x (needed for the built-in `node:sqlite` module the
  backend uses — see `server/README` / build plan for why there's no
  `better-sqlite3` native dependency to compile).
- Installs nginx and certbot.
- Creates a dedicated `familytree` system user that owns `/opt/family-tree`.
- Installs the systemd service (`deploy/family-tree-api.service`) so the API
  restarts automatically on crash or reboot.

## 2. Configure environment

```bash
cd /opt/family-tree/server
cp .env.example .env
```

Edit `.env` and set, at minimum:
- `JWT_SECRET` — a long random string (`openssl rand -hex 32`). The server
  refuses to start in production without this.
- `CORS_ORIGIN` — your real domain, e.g. `https://familytree.example.com`.
- `DB_PATH` / `UPLOAD_DIR` — the defaults (`./data/...`) are fine; they land
  under `/opt/family-tree/server/data`.

## 3. Build and start

```bash
cd /opt/family-tree
bash deploy/deploy.sh
```

This installs dependencies, builds the frontend (`dist/`) and backend
(`server/dist/`), runs database migrations, seeds the database **only if
it doesn't already have data** (safe to re-run), and restarts the systemd
service. Run this same script again for every future deploy (after a
`git pull`).

## 4. nginx + HTTPS

Copy the nginx config, point it at your domain, and get a certificate:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/family-tree
sudo ln -s /etc/nginx/sites-available/family-tree /etc/nginx/sites-enabled/
# Edit /etc/nginx/sites-available/family-tree and replace
# familytree.example.com with your real domain first.
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d familytree.example.com
```

Certbot rewrites the nginx config to add HTTPS and sets up auto-renewal.

## 5. Database backups

SQLite is a single file, so backups are just a copy. `deploy/backup-db.sh`
does a consistent online backup (via SQLite's own backup mechanism, so it's
safe even while the server is running) into `/opt/family-tree/backups/`.
`setup-ec2.sh` already schedules this in root's crontab for 03:00 daily
(re-running setup-ec2.sh won't create a duplicate entry) — nothing to do
here unless you want a different time, in which case `sudo crontab -e` and
edit the `backup-db.sh` line.

Copy the `backups/` directory off the instance periodically (e.g. to S3)
since a single EC2 instance is a single point of failure for that disk.

## 6. Subsequent deploys

```bash
cd /opt/family-tree
git pull
bash deploy/deploy.sh
```

## What this does NOT cover

- Multi-instance / load-balanced deployment (SQLite is single-writer by
  design — fine for a family-scale app, not for horizontal scaling).
- A managed database or object storage (S3) for uploaded photos — see the
  "Open decisions" section of the build plan if you want to move to S3
  later; swapping `UPLOAD_DIR` for S3 only touches `server/src/routes/media.ts`.
