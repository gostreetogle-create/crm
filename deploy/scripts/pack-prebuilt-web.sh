#!/usr/bin/env bash
# Собирает deploy/prebuilt-web.zip из crm-web/dist/crm-web/browser/
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROWSER="${REPO_ROOT}/crm-web/dist/crm-web/browser"
ZIP="${REPO_ROOT}/deploy/prebuilt-web.zip"

if [[ ! -f "${BROWSER}/index.html" ]]; then
  echo "Нет ${BROWSER}/index.html — сначала: cd crm-web && node scripts/sync-canonical-roles.cjs && npx nx run crm-web:build:production" >&2
  exit 1
fi

command -v zip >/dev/null 2>&1 || { echo "Установите zip (apt install zip / brew install zip)" >&2; exit 1; }

rm -f "${ZIP}"
(cd "${BROWSER}" && zip -qr "${ZIP}" .)
echo "OK: ${ZIP}"
