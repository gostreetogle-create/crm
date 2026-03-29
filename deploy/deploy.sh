#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

[[ -f .env ]] || cp .env.example .env
source .env

require_non_empty() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "${value}" ]]; then
    echo "[deploy] Ошибка: поле ${key} пустое в deploy/.env"
    exit 1
  fi
}

echo "[deploy] Проверяю обязательные поля deploy/.env..."
require_non_empty WEB_PORT
require_non_empty BACKEND_PORT

echo "[deploy] Обновляю код (если это серверный сценарий)..."
if git -C .. rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C .. fetch origin || true
  if git -C .. pull --ff-only; then
    :
  else
    echo "[deploy] Внимание: fast-forward невозможен. Оставляю как есть (ручное вмешательство при необходимости)."
  fi
fi

echo "[deploy] Подтягиваю образы (если есть в registry)..."
docker compose --env-file .env pull || true

echo "[deploy] Сборка образов..."
unset WEB_BUILD_ID 2>/dev/null || true
WEB_BUILD_ID="$(git -C .. rev-parse HEAD 2>/dev/null || echo unknown)"
export WEB_BUILD_ID
echo "[deploy] WEB_BUILD_ID=${WEB_BUILD_ID}"

docker compose --env-file .env build --build-arg "WEB_BUILD_ID=${WEB_BUILD_ID}" web
docker compose --env-file .env build backend

echo "[deploy] Запуск контейнеров..."
docker compose --env-file .env up -d --remove-orphans

echo "[deploy] Проверяю health backend..."
for i in {1..30}; do
  if curl -fsS "http://localhost:${BACKEND_PORT:-3000}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "http://localhost:${BACKEND_PORT:-3000}/health" >/dev/null 2>&1; then
  echo "[deploy] Ошибка: backend не отвечает, последние логи:"
  docker compose --env-file .env logs backend --tail 60
  exit 1
fi

echo "[deploy] Проверяю ответ nginx (web)..."
web_ok=0
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT:-8080}/" >/dev/null 2>&1; then
    web_ok=1
    break
  fi
  sleep 2
done

if [[ "${web_ok}" -eq 1 ]]; then
  echo "[deploy] Web (nginx) отвечает на GET / (порт ${WEB_PORT:-8080})."
else
  echo "[deploy] Предупреждение: web не ответил за ~60 с на http://127.0.0.1:${WEB_PORT:-8080}/"
  echo "[deploy] Состояние контейнеров:"
  docker compose --env-file .env ps -a
  echo "[deploy] Последние логи web:"
  docker compose --env-file .env logs web --tail 120
fi

echo "[deploy] Готово: deploy выполнен успешно."

