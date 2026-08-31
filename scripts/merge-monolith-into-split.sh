#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${1:?Usage: merge-monolith-into-split.sh /path/to/monolith}"
BACKEND="$ROOT/payrent-backend"
FRONTEND="$ROOT/payrent-frontend"

copy_tree() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  rm -rf "$dest"
  cp -a "$src" "$dest"
}

echo "==> Merging monolith from ${SOURCE}"

for path in app/api lib prisma scripts __tests__ types constants docs; do
  if [ -e "${SOURCE}/${path}" ]; then
    echo "  backend: ${path}"
    copy_tree "${SOURCE}/${path}" "${BACKEND}/${path}"
  fi
done

[ -f "${SOURCE}/docker-compose.yml" ] && cp "${SOURCE}/docker-compose.yml" "${BACKEND}/docker-compose.yml"
for f in proxy.ts vitest.config.ts Dockerfile; do
  [ -f "${SOURCE}/${f}" ] && cp "${SOURCE}/${f}" "${BACKEND}/${f}"
done

cat > "${BACKEND}/app/layout.tsx" <<'EOF'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

copy_tree "${SOURCE}/app" "${FRONTEND}/app"
rm -rf "${FRONTEND}/app/api"
mkdir -p "${FRONTEND}/app/api/auth"
if [ -d "${SOURCE}/app/api/auth/[...nextauth]" ]; then
  copy_tree "${SOURCE}/app/api/auth/[...nextauth]" "${FRONTEND}/app/api/auth/[...nextauth]"
fi

for path in components hooks stores public constants types; do
  if [ -d "${SOURCE}/${path}" ]; then
    echo "  frontend: ${path}"
    copy_tree "${SOURCE}/${path}" "${FRONTEND}/${path}"
  fi
done

mkdir -p "${FRONTEND}/lib"
for dir in admin api auth business-rules constants messaging nav subscription utils validations; do
  if [ -d "${SOURCE}/lib/${dir}" ]; then
    copy_tree "${SOURCE}/lib/${dir}" "${FRONTEND}/lib/${dir}"
  fi
done
for f in errors.ts subscription-limits.ts logger.ts utils.ts; do
  [ -f "${SOURCE}/lib/${f}" ] && cp "${SOURCE}/lib/${f}" "${FRONTEND}/lib/${f}"
done
rm -f "${FRONTEND}/lib/api/handler.ts" 2>/dev/null || true

if [ -f "${SOURCE}/prisma/schema.prisma" ]; then
  mkdir -p "${FRONTEND}/prisma"
  cp "${SOURCE}/prisma/schema.prisma" "${FRONTEND}/prisma/schema.prisma"
fi

for f in proxy.ts components.json postcss.config.mjs tsconfig.json eslint.config.mjs vercel.json; do
  [ -f "${SOURCE}/${f}" ] && cp "${SOURCE}/${f}" "${FRONTEND}/${f}"
done

echo "==> Merge complete"
