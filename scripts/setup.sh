#!/usr/bin/env bash
# One-time local setup: env files + dependencies for all four parts.
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1 ($2)"; exit 1; }; }
need node "install Node.js 20 or newer"
need npm  "comes with Node.js"
need python3 "install Python 3.10 or newer (it runs the learners' code and validates content)"

node -e 'if (+process.versions.node.split(".")[0] < 20) { console.error("Node 20+ required, found " + process.version); process.exit(1) }'
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' || { echo "Python 3.10+ required"; exit 1; }

for d in server runner; do
  [ -f "$d/.env" ] || { cp "$d/.env.example" "$d/.env"; echo "created $d/.env (development defaults; change the secrets before deploying)"; }
done

echo "Installing dependencies..."
npm install --no-audit --no-fund
for d in runner server client; do npm --prefix "$d" install --no-audit --no-fund; done

cat <<'MSG'

Setup done. Next:
  1. Start MongoDB:      docker compose -f docker-compose.dev.yml up -d      (or use a local mongod)
  2. Load the content:   npm run seed
  3. Run everything:     npm run dev
  4. Open http://localhost:5173 and log in as the admin from server/.env
     (default admin@example.com / ChangeMe-Admin-123)
MSG
