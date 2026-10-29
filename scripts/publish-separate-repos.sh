#!/usr/bin/env bash
set -euo pipefail

# Publishes payrent-backend and payrent-frontend as separate GitHub repositories.
# Usage:
#   ./scripts/publish-separate-repos.sh
#   ./scripts/publish-separate-repos.sh --backend-only
#   ./scripts/publish-separate-repos.sh --frontend-only

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_REPO="${BACKEND_REPO:-Lonewolf-gut/PayRent-Backend}"
FRONTEND_REPO="${FRONTEND_REPO:-Lonewolf-gut/PayRent-Frontend}"

publish_repo() {
  local name="$1"
  local source_dir="$2"
  local github_repo="$3"
  local tmp_dir
  tmp_dir="$(mktemp -d)"

  echo ""
  echo "==> Publishing ${name} to https://github.com/${github_repo}"

  mkdir -p "${tmp_dir}"
  tar -C "${source_dir}" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.next-dev \
    --exclude=.env \
    --exclude=.git \
    -cf - . | tar -C "${tmp_dir}" -xf -

  cd "${tmp_dir}"
  git init -b main
  git add .
  git commit -m "Initial commit: ${name}"

  if ! gh repo view "${github_repo}" >/dev/null 2>&1; then
    echo "Creating GitHub repo ${github_repo}..."
    if ! gh repo create "${github_repo}" --public --description "${name} for PayRent" 2>/dev/null; then
      echo ""
      echo "Could not create ${github_repo} automatically."
      echo "Create it manually on GitHub, then run:"
      echo "  cd ${tmp_dir} && git push -u origin main"
      echo ""
      echo "Or create an empty repo and push from ${source_dir}:"
      echo "  cd ${source_dir}"
      echo "  git init -b main"
      echo "  git add ."
      echo "  git commit -m \"Initial commit\""
      echo "  git remote add origin https://github.com/${github_repo}.git"
      echo "  git push -u origin main"
      return 0
    fi
  fi

  git remote add origin "https://github.com/${github_repo}.git"
  git push -u origin main --force

  echo "Published: https://github.com/${github_repo}"
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
  publish_repo "PayRent Backend" "${ROOT}/payrent-backend" "${BACKEND_REPO}"
fi

if [[ "$BACKEND_ONLY" == false && "$FRONTEND_ONLY" == false ]] || [[ "$FRONTEND_ONLY" == true ]]; then
  publish_repo "PayRent Frontend" "${ROOT}/payrent-frontend" "${FRONTEND_REPO}"
fi

echo ""
echo "Done. Clone them separately:"
echo "  git clone https://github.com/${BACKEND_REPO}.git"
echo "  git clone https://github.com/${FRONTEND_REPO}.git"
