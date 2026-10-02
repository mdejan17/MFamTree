# Deploying to an AWS EC2 instance

This assumes a single EC2 instance (e.g. a `t3.small` or similar) running
both the Node API and serving the built React frontend through nginx, with
the SQLite database living on that instance's disk. `deploy/setup-ec2.sh`
supports either **Ubuntu/Debian** or **Amazon Linux 2023** — it detects
which one it's running on and uses the right package manager (`apt` vs
`dnf`) automatically. The nginx step below (step 4) is the one place the
two differ enough that you need to pick the right block for your instance.

## 1. One-time server setup

SSH into the instance. A stock Amazon Linux 2023 AMI doesn't have `git`
preinstalled (Ubuntu's does); install it first if `git --version` fails:

```bash
sudo dnf install -y git   # Amazon Linux 2023
sudo apt-get install -y git   # Ubuntu/Debian
```

Then clone the repo and run the setup script as root (it installs Node 22,
nginx, and certbot):

```bash
git clone <your-repo-url> /opt/family-tree
cd /opt/family-tree
sudo bash deploy/setup-ec2.sh
```

What it does:
- Installs Node.js 22.x (needed for the built-in `node:sqlite` module the
  backend uses — see `server/README` / build plan for why there's no
  `better-sqlite3` native dependency to compile).
- Installs nginx and certbot (on Amazon Linux, certbot has no native package
  — it's installed into an isolated venv under `/opt/certbot`, per the EFF's
  own instructions for that distro, with a symlink onto `/usr/bin/certbot`
  so the rest of the steps below are identical either way).
- Creates a dedicated `familytree` system user that owns `/opt/family-tree`.
- Installs the systemd service (`deploy/family-tree-api.service`) so the API
  restarts automatically on crash or reboot.

Also make sure your instance's **Security Group** allows inbound traffic on
ports 80 and 443 (and 22 for SSH) — that's an AWS-level firewall separate
from anything on the instance itself, and the most common reason nginx
"works" locally but the site isn't reachable from outside.

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

Copy the nginx config, point it at your domain, and get a certificate. The
install path differs by distro — nginx on Debian/Ubuntu splits sites into
`sites-available` + a `sites-enabled` symlink; nginx on Amazon Linux/RHEL
just includes every file under `conf.d/` directly, no symlink step.

**Debian/Ubuntu:**

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/family-tree
sudo ln -s /etc/nginx/sites-available/family-tree /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # avoid it catching requests first
```

**Amazon Linux 2023 / RHEL-family:**

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/family-tree.conf
sudo rm -f /etc/nginx/conf.d/default.conf     # avoid it catching requests first
```

**Both:** edit the file you just copied and replace `familytree.example.com`
with your real domain, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d familytree.example.com
```

Certbot rewrites the nginx config to add HTTPS and sets up auto-renewal (on
Amazon Linux, `certbot` is the venv-installed one `setup-ec2.sh` symlinked
onto `/usr/bin/certbot` — same command either way).

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
