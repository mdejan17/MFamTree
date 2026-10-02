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

echo "== Restarting service =="
sudo systemctl restart family-tree-api
sudo systemctl status family-tree-api --no-pager -l | head -15

echo
echo "Deploy complete. Frontend build output is in dist/ — nginx should"
echo "already be pointed at it (see deploy/nginx.conf.example)."
