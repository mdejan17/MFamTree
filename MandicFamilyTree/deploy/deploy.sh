#!/usr/bin/env bash
# Build and (re)deploy both the frontend and backend, then restart the
# systemd service. Safe to re-run on every deploy. Run from the repo root:
#   bash deploy/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

if [[ ! -f server/.env ]]; then
  echo "server/.env is missing. Copy server/.env.example to server/.env and" >&2
  echo "fill in real values (JWT_SECRET, CORS_ORIGIN) before deploying." >&2
  exit 1
fi

# The frontend's own .env controls VITE_API_URL, which gets baked into the
# built JS at compile time (Vite env vars aren't runtime-configurable).
# .env is gitignored, so a fresh clone has none — without this, the build
# silently falls back to the http://localhost:4000/api default meant for
# local dev, which from a real visitor's browser means "whatever's running
# on *their own* machine's port 4000", not this server. A relative "/api"
# always resolves against whatever origin served the page, which is exactly
# right here since nginx (see nginx.conf.example) proxies /api/ on the same
# origin as the static frontend — so there's nothing to configure per-deploy,
# this works unchanged whether you're on a bare IP or later move to a domain.
if [[ ! -f .env ]]; then
  echo "== No root .env — writing one with a relative VITE_API_URL =="
  echo "VITE_API_URL=/api" > .env
fi

echo "== Frontend: install + build =="
npm install
npm run build

echo "== Backend: install + build =="
cd server
npm install
npm run build

echo "== Database: migrate =="
npm run migrate

# Only seed on a genuinely empty database — safe to re-run deploy.sh without
# re-importing the mock dataset or clobbering real data entered since.
PERSON_COUNT=$(node -e "
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
require('dotenv/config');
const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || './data/family-tree.sqlite3');
const db = new DatabaseSync(dbPath);
const row = db.prepare('SELECT COUNT(*) as count FROM people').get();
console.log(row.count);
" 2>/dev/null || echo 0)

if [[ "$PERSON_COUNT" == "0" ]]; then
  echo "== Database is empty — seeding from seed-data/people.json =="
  if [[ ! -f seed-data/people.json ]]; then
    echo "No seed-data/people.json found — run 'npm run export-seed-data' first" >&2
    echo "if you want the bundled mock dataset, or skip seeding entirely." >&2
  else
    npm run seed
  fi
else
  echo "== Database already has $PERSON_COUNT people — skipping seed =="
fi

cd "$REPO_DIR"

# Normalizes ownership back to the service's own user regardless of whether
# this script itself was just run as root/sudo (which would otherwise leave
# the database and node_modules root-owned — the service runs as
# unprivileged `familytree` and would then crash-loop on every write with
# "attempt to write a readonly database").
if id familytree >/dev/null 2>&1; then
  sudo chown -R familytree:familytree "$REPO_DIR"
fi

echo "== Restarting service =="
sudo systemctl restart family-tree-api
sudo systemctl status family-tree-api --no-pager -l | head -15

echo
echo "Deploy complete. Frontend build output is in dist/ — nginx should"
echo "already be pointed at it (see deploy/nginx.conf.example)."
