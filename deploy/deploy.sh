#!/usr/bin/env bash
set -euo pipefail

# Один и тот же сценарий: Synology DSM, Ubuntu Server, и т.д. Нужен bash (не «sh»).
if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "[deploy] Запустите через bash: bash \"$(basename "$0")\" (из каталога deploy/)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${SCRIPT_DIR}"

# Сначала deploy/, затем корень репозитория (канон: docker-compose.yml в корне, см. комментарий в compose).
COMPOSE_FILE=""
for dir in "${SCRIPT_DIR}" "${REPO_ROOT}"; do
  for candidate in docker-compose.yml compose.yaml compose.yml; do
    if [[ -f "${dir}/${candidate}" ]]; then
      COMPOSE_FILE="${dir}/${candidate}"
      break 2
    fi
  done
done
if [[ -z "${COMPOSE_FILE}" ]]; then
  echo "[deploy] Ошибка: нет docker-compose.yml / compose.yaml / compose.yml в ${SCRIPT_DIR} или ${REPO_ROOT}" >&2
  exit 1
fi

dc() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${SCRIPT_DIR}/.env" "$@"
}

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
require_non_empty CORS_ORIGIN
require_non_empty JWT_SECRET

if [[ "${CORS_ORIGIN}" == "*" ]]; then
  echo "[deploy] Ошибка: CORS_ORIGIN='*' запрещен в production. Укажите точный origin домена."
  exit 1
fi

PREBUILT_DIR="${REPO_ROOT}/deploy/prebuilt-web"
PREBUILT_ZIP="${REPO_ROOT}/deploy/prebuilt-web.zip"

echo "[deploy] Обновляю код (если это серверный сценарий)..."
if git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${REPO_ROOT}" fetch origin || true
  if git -C "${REPO_ROOT}" pull --ff-only; then
    :
  else
    echo "[deploy] pull --ff-only не удался (часто: на сервере правили отслеживаемые файлы в deploy/, например deploy.sh)."
    echo "[deploy] Откладываю изменения в deploy/ в git stash (deploy/.env не в git — не затрагивается) и повторяю pull..."
    git -C "${REPO_ROOT}" stash push -m "crm-deploy auto $(date -Iseconds 2>/dev/null || date)" -- deploy/ 2>/dev/null || true
    if ! git -C "${REPO_ROOT}" pull --ff-only; then
      echo "[deploy] ОШИБКА: всё ещё не удалось обновить репозиторий."
      echo "[deploy] Выполните вручную на сервере:"
      echo "[deploy]   cd ${REPO_ROOT} && git status"
      echo "[deploy] Чтобы принять состояние как на GitHub (не удаляет неотслеживаемый deploy/.env):"
      echo "[deploy]   cd ${REPO_ROOT} && git fetch origin && git reset --hard origin/main"
      exit 1
    fi
    echo "[deploy] Код обновлён. Старые правки в deploy/ лежат в stash: cd ${REPO_ROOT} && git stash list"
  fi
fi

echo "[deploy] Подтягиваю образы (если есть в registry)..."
dc pull || true

# Один архив вместо сотен файлов: положите deploy/prebuilt-web.zip на сервер — распакуем в prebuilt-web/ и удалим zip.
if [[ -f "${PREBUILT_ZIP}" ]]; then
  if ! command -v unzip >/dev/null 2>&1; then
    echo "[deploy] Ошибка: найден ${PREBUILT_ZIP}, но нет команды unzip. Установите: apt install unzip"
    exit 1
  fi
  echo "[deploy] Распаковываю ${PREBUILT_ZIP} → ${PREBUILT_DIR}/"
  mkdir -p "${PREBUILT_DIR}"
  # Info-ZIP: код 1 = предупреждения при успешной распаковке (часто zip с Windows/Compress-Archive).
  set +e
  unzip -o -q "${PREBUILT_ZIP}" -d "${PREBUILT_DIR}"
  unzip_rc=$?
  set -e
  if [[ "${unzip_rc}" -gt 1 ]]; then
    echo "[deploy] Ошибка: unzip завершился с кодом ${unzip_rc}"
    exit 1
  fi
fi

if [[ ! -f "${PREBUILT_DIR}/index.html" ]]; then
  echo "[deploy] Ошибка: нет ${PREBUILT_DIR}/index.html"
  echo "[deploy] Соберите фронт локально: cd crm-web && node scripts/sync-canonical-roles.cjs && npx nx run crm-web:build:production"
  echo "[deploy] Затем либо: deploy/scripts/pack-prebuilt-web.ps1 (Windows) / pack-prebuilt-web.sh — и загрузите deploy/prebuilt-web.zip на сервер в deploy/"
  echo "[deploy] Либо залейте содержимое crm-web/dist/crm-web/browser/ в ${PREBUILT_DIR}/ (rsync/scp/sftp)."
  exit 1
fi

rm -f "${PREBUILT_ZIP}"

echo "[deploy] Сборка образов..."
unset WEB_BUILD_ID 2>/dev/null || true
WEB_BUILD_ID="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"
export WEB_BUILD_ID
echo "[deploy] WEB_BUILD_ID=${WEB_BUILD_ID}"

# Мета-тег в index.html на диске сервера (том read-only в контейнере снимается с хоста).
# sed -i: GNU (Ubuntu, большинство NAS) vs BSD (macOS при сборке на Mac) — оба варианта.
if [[ -f "${PREBUILT_DIR}/index.html" ]]; then
  if sed --version >/dev/null 2>&1; then
    sed -i '/name="crm-build"/d' "${PREBUILT_DIR}/index.html" 2>/dev/null || true
    sed -i "s#</head>#<meta name=\"crm-build\" content=\"${WEB_BUILD_ID}\"></head>#" "${PREBUILT_DIR}/index.html" || true
  else
    sed -i '' '/name="crm-build"/d' "${PREBUILT_DIR}/index.html" 2>/dev/null || true
    sed -i '' "s#</head>#<meta name=\"crm-build\" content=\"${WEB_BUILD_ID}\"></head>#" "${PREBUILT_DIR}/index.html" || true
  fi
fi

dc build web
dc build backend

echo "[deploy] Запуск контейнеров..."
dc up -d --remove-orphans

echo "[deploy] Проверяю health backend..."
BACKEND_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT:-3000}/health"
curl_health() {
  curl -fsS --connect-timeout 3 --max-time 10 "${BACKEND_HEALTH_URL}" >/dev/null 2>&1
}
for i in {1..45}; do
  if curl_health; then
    break
  fi
  sleep 2
done

if ! curl_health; then
  echo "[deploy] Ошибка: backend не отвечает, последние логи:"
  dc logs backend --tail 60
  exit 1
fi

echo "[deploy] Проверяю ответ nginx (web)..."
WEB_ROOT_URL="http://127.0.0.1:${WEB_PORT:-8080}/"
curl_web_ok() {
  curl -fsS --connect-timeout 3 --max-time 10 "${WEB_ROOT_URL}" >/dev/null 2>&1
}
web_ok=0
for i in {1..45}; do
  if curl_web_ok; then
    web_ok=1
    break
  fi
  sleep 2
done

if [[ "${web_ok}" -eq 1 ]]; then
  echo "[deploy] Web (nginx) отвечает на GET / (порт ${WEB_PORT:-8080})."
else
  echo "[deploy] Предупреждение: web не ответил за ~90 с на ${WEB_ROOT_URL}"
  echo "[deploy] Состояние контейнеров:"
  dc ps -a
  echo "[deploy] Последние логи web:"
  dc logs web --tail 120
fi

echo "[deploy] Готово: deploy выполнен успешно."
echo "[deploy] Итог по БД: выполнялся только prisma migrate deploy + db seed в entrypoint backend (данные Postgres не сбрасывались)."
echo "[deploy] Полный сброс БД на сервере этим скриптом не делается — см. deploy/README.md."

