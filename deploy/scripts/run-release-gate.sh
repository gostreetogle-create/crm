#!/usr/bin/env bash
set -euo pipefail

SKIP_MIGRATE=0
SKIP_SMOKE=0
DRY_RUN=0
CRITICAL_ONLY=0
REPORT_PATH=""
STEP_BACKEND_MIGRATE="pending"
STEP_BACKEND_CRITICAL="pending"
STEP_FRONTEND_CRITICAL="pending"
STEP_FRONTEND_SMOKE="pending"

print_help() {
  cat <<'EOF'
Usage:
  bash deploy/scripts/run-release-gate.sh [options]

Options:
  --skip-migrate         Skip backend db:migrate:deploy
  --skip-smoke           Skip frontend e2e:smoke
  --critical-only        Shortcut for --skip-migrate + --skip-smoke
  --dry-run              Print steps without running commands
  --report-path <file>   Write JSON report to file
  -h, --help             Show this help

Examples:
  bash deploy/scripts/run-release-gate.sh --critical-only --report-path "./release-gate-report.json"
  bash deploy/scripts/run-release-gate.sh --skip-migrate
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -h|--help)
      print_help
      exit 0
      ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --skip-smoke) SKIP_SMOKE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --critical-only) CRITICAL_ONLY=1 ;;
    --report-path)
      if [[ -z "${2:-}" ]]; then
        echo "[gate] Missing value for --report-path" >&2
        exit 1
      fi
      REPORT_PATH="$2"
      shift
      ;;
    *)
      echo "[gate] Unknown argument: $1" >&2
      echo "[gate] Supported: --skip-migrate --skip-smoke --dry-run --critical-only --report-path <file>" >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "${CRITICAL_ONLY}" -eq 1 ]]; then
  SKIP_MIGRATE=1
  SKIP_SMOKE=1
fi

write_report() {
  local gate_status="$1"
  if [[ -z "${REPORT_PATH}" ]]; then
    return
  fi
  local report_dir
  report_dir="$(dirname "${REPORT_PATH}")"
  if [[ -n "${report_dir}" && "${report_dir}" != "." ]]; then
    mkdir -p "${report_dir}"
  fi
  cat > "${REPORT_PATH}" <<EOF
{
  "ts": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gateStatus": "${gate_status}",
  "dryRun": $( [[ "${DRY_RUN}" -eq 1 ]] && echo "true" || echo "false" ),
  "criticalOnly": $( [[ "${CRITICAL_ONLY}" -eq 1 ]] && echo "true" || echo "false" ),
  "skipMigrate": $( [[ "${SKIP_MIGRATE}" -eq 1 ]] && echo "true" || echo "false" ),
  "skipSmoke": $( [[ "${SKIP_SMOKE}" -eq 1 ]] && echo "true" || echo "false" ),
  "steps": [
    {"title":"backend: migrate deploy","status":"${STEP_BACKEND_MIGRATE}"},
    {"title":"backend: test:critical","status":"${STEP_BACKEND_CRITICAL}"},
    {"title":"crm-web: test:critical","status":"${STEP_FRONTEND_CRITICAL}"},
    {"title":"crm-web: e2e:smoke","status":"${STEP_FRONTEND_SMOKE}"}
  ]
}
EOF
  echo "[gate] Report written: ${REPORT_PATH}"
}

on_exit() {
  local code="$?"
  if [[ "${code}" -eq 0 ]]; then
    write_report "passed"
  else
    write_report "failed"
  fi
}
trap on_exit EXIT

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/crm-web"

if ! command -v npm >/dev/null 2>&1; then
  echo "[gate] npm not found in PATH. Install Node.js/npm before running release gate." >&2
  exit 1
fi

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "[gate] backend dir not found: ${BACKEND_DIR}" >&2
  exit 1
fi
if [[ ! -d "${FRONTEND_DIR}" ]]; then
  echo "[gate] crm-web dir not found: ${FRONTEND_DIR}" >&2
  exit 1
fi
if [[ ! -d "${BACKEND_DIR}/node_modules" ]]; then
  echo "[gate] backend/node_modules not found. Run: cd backend && npm install" >&2
  exit 1
fi
if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
  echo "[gate] crm-web/node_modules not found. Run: cd crm-web && npm install" >&2
  exit 1
fi

echo "[gate] Release gate started. Repo root: ${REPO_ROOT}"
if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "[gate] Dry-run mode enabled: commands will not execute."
fi

if [[ "${SKIP_MIGRATE}" -eq 0 ]]; then
  echo "[gate] backend: migrate deploy"
  if [[ "${DRY_RUN}" -eq 0 ]]; then
    (cd "${BACKEND_DIR}" && npm run db:migrate:deploy)
    STEP_BACKEND_MIGRATE="ok"
  else
    STEP_BACKEND_MIGRATE="dry-run"
  fi
else
  echo "[gate] backend: migrate deploy (SKIPPED)"
  STEP_BACKEND_MIGRATE="skipped"
fi

echo "[gate] backend: test:critical"
if [[ "${DRY_RUN}" -eq 0 ]]; then
  (cd "${BACKEND_DIR}" && npm run test:critical)
  STEP_BACKEND_CRITICAL="ok"
else
  STEP_BACKEND_CRITICAL="dry-run"
fi

echo "[gate] crm-web: test:critical"
if [[ "${DRY_RUN}" -eq 0 ]]; then
  (cd "${FRONTEND_DIR}" && npm run test:critical)
  STEP_FRONTEND_CRITICAL="ok"
else
  STEP_FRONTEND_CRITICAL="dry-run"
fi

if [[ "${SKIP_SMOKE}" -eq 0 ]]; then
  echo "[gate] crm-web: e2e:smoke"
  if [[ "${DRY_RUN}" -eq 0 ]]; then
    if ! (cd "${FRONTEND_DIR}" && npm run e2e:smoke); then
      echo "[gate] Smoke failed. Hint: ensure Playwright browser is installed:" >&2
      echo "[gate]   cd crm-web && npx playwright install chromium" >&2
      exit 1
    fi
    STEP_FRONTEND_SMOKE="ok"
  else
    STEP_FRONTEND_SMOKE="dry-run"
  fi
else
  echo "[gate] crm-web: e2e:smoke (SKIPPED)"
  STEP_FRONTEND_SMOKE="skipped"
fi

echo "[gate] Release gate passed."
