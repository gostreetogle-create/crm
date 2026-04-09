#!/usr/bin/env bash
set -euo pipefail

# Один и тот же сценарий: Synology DSM, Ubuntu Server, и т.д. Нужен bash (не «sh»).
if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "[deploy] Запустите через bash: bash \"$(basename "$0")\" (из каталога deploy/)" >&2
  exit 1
fi

run_self_check() {
  local failed=0
  echo "[deploy] Self-check environment:"
  if command -v bash >/dev/null 2>&1; then
    echo "[deploy]   bash: $(bash --version 2>/dev/null | head -n1 || echo unknown)"
  else
    echo "[deploy]   bash: not found"
  fi
  if command -v powershell >/dev/null 2>&1; then
    echo "[deploy]   powershell: available"
  else
    echo "[deploy]   powershell: not found"
  fi
  if command -v npm >/dev/null 2>&1; then
    echo "[deploy]   npm: $(npm --version 2>/dev/null || echo unknown)"
  else
    echo "[deploy]   npm: not found"
  fi

  run_check() {
    local title="$1"
    shift
    echo "[deploy] Self-check: ${title}"
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    echo "[deploy] WARNING: self-check failed for ${title}"
    failed=$((failed + 1))
  }

  run_check "deploy.sh --help" bash "${SCRIPT_DIR}/deploy.sh" --help
  run_check "run-release-gate.sh --help" bash "${REPO_ROOT}/deploy/scripts/run-release-gate.sh" --help
  run_check "run-concurrency-probe.sh --help" bash "${REPO_ROOT}/deploy/scripts/run-concurrency-probe.sh" --help
  run_check "run-release-gate.ps1 -Help" powershell -ExecutionPolicy Bypass -File "${REPO_ROOT}/deploy/scripts/run-release-gate.ps1" -Help
  run_check "run-concurrency-probe.ps1 -Help" powershell -ExecutionPolicy Bypass -File "${REPO_ROOT}/deploy/scripts/run-concurrency-probe.ps1" -Help

  if [[ "${failed}" -gt 0 ]]; then
    echo "[deploy] Self-check completed with warnings (${failed})."
    echo "[deploy] Tip: for *.sh issues check line endings (LF) and bash availability."
    return 0
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage:
  bash deploy/deploy.sh
  bash deploy/deploy.sh --self-check
  (run from repo root or from deploy/ directory)

What it does:
  - checks deploy/.env required fields
  - optionally unpacks deploy/prebuilt-web.zip to deploy/prebuilt-web/
  - builds web/backend images and runs docker compose
  - checks backend health and web availability

Pre-deploy gate (recommended before deploy):
  powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
  bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path "./release-gate-report.json"

Optional env:
  GATE_REPORT_PATH=<path-to-json>   Custom gate report path (default: ./release-gate-report.json)
                                    Relative path is resolved from repository root.

Extra:
  --self-check                      Run help checks for deploy/gate/probe scripts and exit.
                                    Non-blocking: may finish with warnings in mixed shell envs.
                                    "Self-check finished." => OK.
                                    "Self-check completed with warnings (...)" => verify failing scripts via --help.
EOF
  exit 0
fi

if [[ "${1:-}" == "--self-check" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  run_self_check
  echo "[deploy] Self-check finished."
  exit 0
fi

if [[ "$#" -gt 0 ]]; then
  echo "[deploy] Unknown argument(s): $*" >&2
  echo "[deploy] Use: bash deploy/deploy.sh --help" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${SCRIPT_DIR}"

# Обязательный pre-deploy gate: см. docs/release-gates.md
# Локально перед выкладкой:
#   cd backend && npm run test:critical
#   cd ../crm-web && npm run test:critical
echo "[deploy] Pre-deploy gate: проверьте docs/release-gates.md (раздел 'Stop-list (деплой блокируется)')."
print_gate_report_regen_commands() {
  local report_target="${1:-./release-gate-report.json}"
  echo "[deploy]   powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath \"${report_target}\""
  echo "[deploy]   bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path \"${report_target}\""
}

detect_gate_report_age_sec() {
  local path="$1"
  if command -v python >/dev/null 2>&1; then
    python - <<'PY' "$path" 2>/dev/null || true
import os, sys, time
path = sys.argv[1]
print(int(time.time() - os.path.getmtime(path)))
PY
    return 0
  fi

  if command -v stat >/dev/null 2>&1; then
    local mtime now
    # GNU stat (Linux)
    mtime="$(stat -c %Y "$path" 2>/dev/null || true)"
    if [[ -z "${mtime}" ]]; then
      # BSD stat (macOS, some NAS)
      mtime="$(stat -f %m "$path" 2>/dev/null || true)"
    fi
    if [[ -n "${mtime}" ]]; then
      now="$(date +%s)"
      echo $(( now - mtime ))
      return 0
    fi
  fi

  echo ""
}

GATE_REPORT_DEFAULT="${REPO_ROOT}/release-gate-report.json"
if [[ -n "${GATE_REPORT_PATH:-}" ]]; then
  if [[ "${GATE_REPORT_PATH}" =~ ^[A-Za-z]:[\\/].* || "${GATE_REPORT_PATH}" == /* ]]; then
    GATE_REPORT="${GATE_REPORT_PATH}"
  else
    GATE_REPORT="${REPO_ROOT}/${GATE_REPORT_PATH#./}"
  fi
  echo "[deploy] Gate report path source: GATE_REPORT_PATH=${GATE_REPORT_PATH}"
else
  GATE_REPORT="${GATE_REPORT_DEFAULT}"
  echo "[deploy] Gate report path source: default (${GATE_REPORT_DEFAULT})"
fi
if [[ -f "${GATE_REPORT}" ]]; then
  echo "[deploy] Найден gate-отчёт: ${GATE_REPORT}"
  gate_status_line="$(sed -n 's/.*"gateStatus"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${GATE_REPORT}" | head -n1 || true)"
  if [[ "${gate_status_line}" == "passed" ]]; then
    echo "[deploy] Gate status: passed."
  elif [[ -n "${gate_status_line}" ]]; then
    echo "[deploy] ВНИМАНИЕ: gate status в отчёте = ${gate_status_line} (ожидался passed)."
    echo "[deploy] Рекомендуется пересоздать отчёт:"
    print_gate_report_regen_commands "${GATE_REPORT}"
  else
    echo "[deploy] ВНИМАНИЕ: не удалось прочитать gateStatus из отчёта."
    echo "[deploy] Рекомендуется пересоздать отчёт:"
    print_gate_report_regen_commands "${GATE_REPORT}"
  fi

  gate_age_sec="$(detect_gate_report_age_sec "${GATE_REPORT}")"
  if [[ -n "${gate_age_sec}" && "${gate_age_sec}" =~ ^[0-9]+$ ]]; then
    if [[ "${gate_age_sec}" -gt 86400 ]]; then
      age_sec="${gate_age_sec}"
      age_hours=$(( age_sec / 3600 ))
      echo "[deploy] ВНИМАНИЕ: gate-отчёт старше 24ч (примерно ${age_hours} ч). Рекомендуется прогнать gate заново."
      print_gate_report_regen_commands "${GATE_REPORT}"
    fi
  else
    echo "[deploy] Примечание: не удалось определить возраст gate-отчёта (нет python/stat)."
  fi
else
  echo "[deploy] Напоминание: перед деплоем сохраните gate-отчёт:"
  print_gate_report_regen_commands "${GATE_REPORT}"
fi

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

ensure_clean_container_name() {
  local name="$1"
  local id
  id="$(docker ps -aq --filter "name=^${name}$" | head -n1 || true)"
  if [[ -z "${id}" ]]; then
    return 0
  fi
  echo "[deploy] Найден контейнер с именем ${name} (id=${id}), удаляю для избежания name-conflict..."
  docker rm -f "${id}" >/dev/null
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
# На Ubuntu/Synology часто остаются контейнеры с теми же именами от ручных запусков/старого compose.
# Перед up очищаем имена, чтобы не падать с "container name ... is already in use".
ensure_clean_container_name "crm_postgres"
ensure_clean_container_name "crm_backend"
ensure_clean_container_name "crm_web"
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

