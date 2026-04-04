#!/usr/bin/env bash
# Полный сброс локальной dev-БД: Docker Postgres + prisma migrate reset + seed.
# НЕ использовать на production — выходим, если DATABASE_URL не localhost/127.0.0.1.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/backend/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[crm] Ошибка: нет backend/.env (скопируйте из .env.example)." >&2
  exit 1
fi

# shellcheck disable=SC2002
DB_URL="$(grep -E '^[[:space:]]*DATABASE_URL[[:space:]]*=' "${ENV_FILE}" | head -1 | sed -E 's/^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*//; s/^["'\'']//; s/["'\'']$//' || true)"
if [[ -z "${DB_URL}" ]]; then
  echo "[crm] Ошибка: в backend/.env не найден DATABASE_URL." >&2
  exit 1
fi

if ! echo "${DB_URL}" | grep -Eq '127\.0\.0\.1|localhost'; then
  echo "[crm] Ошибка: DATABASE_URL не локальный — сброс отменён." >&2
  exit 1
fi

echo "[crm] Поднимаю postgres..."
cd "${REPO_ROOT}"
if [[ -f deploy/.env ]]; then
  docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres
else
  docker compose -f deploy/docker-compose.yml up -d postgres
fi

sleep 6
cd "${REPO_ROOT}/backend"
echo "[crm] npm run db:reset..."
npm run db:reset
echo "[crm] Готово: локальная БД сброшена и засеяна."
