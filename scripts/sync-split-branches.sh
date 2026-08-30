#!/usr/bin/env bash
set -euo pipefail

# Sync payrent-backend/ and payrent-frontend/ to standalone branches on the PayRent repo.
# These branches mirror the separate PayRent-Backend and PayRent-Frontend repos.
#
# Usage:
#   ./scripts/sync-split-branches.sh
#   ./scripts/sync-split-branches.sh --backend-only
#   ./scripts/sync-split-branches.sh --frontend-only

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_BRANCH="${BACKEND_BRANCH:-sync/payrent-backend-5e51}"
FRONTEND_BRANCH="${FRONTEND_BRANCH:-sync/payrent-frontend-5e51}"

sync_branch() {
  local name="$1"
  local source_dir="$2"
  local branch="$3"
  local tmp_dir
  tmp_dir="$(mktemp -d)"

  echo ""
  echo "==> Syncing ${name} to branch ${branch}"

  mkdir -p "${tmp_dir}"
  tar -C "${source_dir}" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.next-dev \
    --exclude=.env \
    --exclude=.git \
    -cf - . | tar -C "${tmp_dir}" -xf -

  cd "${tmp_dir}"
  git init -b "${branch}"
  git add .
  git commit -m "Sync ${name} from monorepo ($(date -u +%Y-%m-%d))"

  cd "${ROOT}"
  git push origin "HEAD:${branch}" --force

  echo "Synced: ${branch}"
  rm -rf "${tmp_dir}"
}

BACKEND_ONLY=false
FRONTEND_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --backend-only) BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
  esac
done

if [[ "$BACKEND_ONLY" == false && "$FRONTEND_ONLY" == false ]] || [[ "$BACKEND_ONLY" == true ]]; then
  sync_branch "PayRent Backend" "${ROOT}/payrent-backend" "${BACKEND_BRANCH}"
fi

if [[ "$BACKEND_ONLY" == false && "$FRONTEND_ONLY" == false ]] || [[ "$FRONTEND_ONLY" == true ]]; then
  sync_branch "PayRent Frontend" "${ROOT}/payrent-frontend" "${FRONTEND_BRANCH}"
fi

echo ""
echo "Done. Restore separate folders locally:"
echo "  Frontend: git clone -b ${FRONTEND_BRANCH} https://github.com/Lonewolf-gut/PayRent.git PayRent-Frontend"
echo "  Backend:  git clone -b ${BACKEND_BRANCH} https://github.com/Lonewolf-gut/PayRent.git PayRent-Backend"
