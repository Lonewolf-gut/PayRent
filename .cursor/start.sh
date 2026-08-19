#!/usr/bin/env bash
# Per-boot service reconciliation for PayRent.
# Starts PostgreSQL and Redis. Idempotent: safe to run repeatedly.
set -euo pipefail

# --- PostgreSQL ---------------------------------------------------------------
# Detect the installed major version (e.g. 16) rather than hard-coding it.
PG_VER="$(ls -1 /usr/lib/postgresql/ 2>/dev/null | sort -n | tail -1 || true)"
if [ -n "${PG_VER}" ]; then
  if ! sudo pg_lsclusters -h 2>/dev/null | awk '{print $4}' | grep -q online; then
    echo "Starting PostgreSQL ${PG_VER}/main ..."
    sudo pg_ctlcluster "${PG_VER}" main start || true
  else
    echo "PostgreSQL already online."
  fi
else
  echo "WARNING: PostgreSQL is not installed; run .cursor/install.sh first." >&2
fi

# --- Redis --------------------------------------------------------------------
if command -v redis-server >/dev/null 2>&1; then
  if ! redis-cli ping >/dev/null 2>&1; then
    echo "Starting Redis ..."
    sudo redis-server /etc/redis/redis.conf --daemonize yes
  else
    echo "Redis already running."
  fi
else
  echo "WARNING: Redis is not installed; run .cursor/install.sh first." >&2
fi

# --- Readiness ----------------------------------------------------------------
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready -h localhost -p 5432 || echo "WARNING: Postgres did not become ready in time." >&2
redis-cli ping >/dev/null 2>&1 && echo "Redis ready." || echo "WARNING: Redis not ready." >&2
