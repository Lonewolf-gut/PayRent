#!/usr/bin/env bash
# Idempotent repository bootstrap for PayRent (backend + frontend monorepo).
# Prepares system services, environment files, npm dependencies, and the
# database (schema push + demo seed). Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# -----------------------------------------------------------------------------
# 1. System dependencies: PostgreSQL + Redis (installed once; captured by snapshot/build)
# -----------------------------------------------------------------------------
if ! command -v pg_ctlcluster >/dev/null 2>&1 || ! command -v redis-server >/dev/null 2>&1; then
  echo "Installing PostgreSQL and Redis ..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql postgresql-contrib redis-server
fi

# -----------------------------------------------------------------------------
# 2. Start services (needed for db push/seed below). start.sh is idempotent.
# -----------------------------------------------------------------------------
bash "${REPO_ROOT}/.cursor/start.sh"

# -----------------------------------------------------------------------------
# 3. Database role + database matching payrent-backend DATABASE_URL
#    (postgresql://rentvest:rentvest@localhost:5432/rentvest)
# -----------------------------------------------------------------------------
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='rentvest') THEN CREATE ROLE rentvest LOGIN PASSWORD 'rentvest' CREATEDB; END IF; END \$\$;"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='rentvest'" | grep -q 1; then
  sudo -u postgres createdb -O rentvest rentvest
fi

# -----------------------------------------------------------------------------
# 4. Environment files with a SHARED AUTH_SECRET across backend + frontend
# -----------------------------------------------------------------------------
gen_secret() { openssl rand -base64 32; }

if [ ! -f payrent-backend/.env ]; then
  echo "Creating payrent-backend/.env ..."
  AUTH_SECRET="$(gen_secret)"
  JWT_ACCESS="$(gen_secret)"
  JWT_REFRESH="$(gen_secret)"
  CRON="$(gen_secret)"
  sed -e "s|AUTH_SECRET=\"replace-with-openssl-rand-base64-32\"|AUTH_SECRET=\"${AUTH_SECRET}\"|" \
      -e "s|JWT_ACCESS_SECRET=\"replace-with-min-32-char-secret\"|JWT_ACCESS_SECRET=\"${JWT_ACCESS}\"|" \
      -e "s|JWT_REFRESH_SECRET=\"replace-with-min-32-char-secret\"|JWT_REFRESH_SECRET=\"${JWT_REFRESH}\"|" \
      -e "s|CRON_SECRET=\"replace-with-openssl-rand-base64-32\"|CRON_SECRET=\"${CRON}\"|" \
      payrent-backend/.env.example > payrent-backend/.env
else
  echo "payrent-backend/.env already exists — keeping it."
  AUTH_SECRET="$(grep '^AUTH_SECRET=' payrent-backend/.env | head -1 | cut -d'"' -f2)"
fi

if [ ! -f payrent-frontend/.env ]; then
  echo "Creating payrent-frontend/.env with matching AUTH_SECRET ..."
  sed -e "s|AUTH_SECRET=\"replace-with-openssl-rand-base64-32\"|AUTH_SECRET=\"${AUTH_SECRET}\"|" \
      payrent-frontend/.env.example > payrent-frontend/.env
else
  echo "payrent-frontend/.env already exists — keeping it."
fi

# -----------------------------------------------------------------------------
# 5. Node dependencies (workspaces). postinstall generates the Prisma client.
# -----------------------------------------------------------------------------
echo "Installing npm dependencies ..."
npm install

# -----------------------------------------------------------------------------
# 6. Database schema + demo seed data
# -----------------------------------------------------------------------------
echo "Pushing Prisma schema ..."
npm run db:push
echo "Seeding demo data ..."
npm run db:seed

echo "PayRent environment install complete."
