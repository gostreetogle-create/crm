#!/usr/bin/env bash
set -euo pipefail

OFFER_ID=""
AUTH_TOKEN=""
BASE_API_URL="http://127.0.0.1:3000/api"
TARGET_STATUS="proposal_paid"
REQUESTS=20
CONCURRENCY=5
TIMEOUT_SEC=15
STRICT=0
REPORT_PATH=""

usage() {
  cat <<'EOF'
Usage:
  bash deploy/scripts/run-concurrency-probe.sh \
    --offer-id <offer-id> \
    --auth-token <jwt> \
    [--base-api-url http://127.0.0.1:3000/api] \
    [--target-status proposal_paid] \
    [--requests 50] \
    [--concurrency 10] \
    [--timeout-sec 15] \
    [--report-path ./probe-report.json] \
    [--strict]
EOF
}

require_option_value() {
  local opt="$1"
  local val="${2:-}"
  if [[ -z "${val}" || "${val}" == --* ]]; then
    echo "[probe] Missing value for ${opt}" >&2
    usage
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --offer-id)
      require_option_value "--offer-id" "${2:-}"
      OFFER_ID="$2"
      shift 2
      ;;
    --auth-token)
      require_option_value "--auth-token" "${2:-}"
      AUTH_TOKEN="$2"
      shift 2
      ;;
    --base-api-url)
      require_option_value "--base-api-url" "${2:-}"
      BASE_API_URL="$2"
      shift 2
      ;;
    --target-status)
      require_option_value "--target-status" "${2:-}"
      TARGET_STATUS="$2"
      shift 2
      ;;
    --requests)
      require_option_value "--requests" "${2:-}"
      REQUESTS="$2"
      shift 2
      ;;
    --concurrency)
      require_option_value "--concurrency" "${2:-}"
      CONCURRENCY="$2"
      shift 2
      ;;
    --timeout-sec)
      require_option_value "--timeout-sec" "${2:-}"
      TIMEOUT_SEC="$2"
      shift 2
      ;;
    --report-path)
      require_option_value "--report-path" "${2:-}"
      REPORT_PATH="$2"
      shift 2
      ;;
    --strict) STRICT=1; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "[probe] Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${OFFER_ID}" ]]; then
  echo "[probe] --offer-id is required" >&2
  exit 1
fi
if [[ -z "${AUTH_TOKEN}" ]]; then
  echo "[probe] --auth-token is required" >&2
  exit 1
fi
if ! [[ "${REQUESTS}" =~ ^[0-9]+$ ]] || [[ "${REQUESTS}" -lt 1 ]]; then
  echo "[probe] --requests must be integer >= 1" >&2
  exit 1
fi
if ! [[ "${CONCURRENCY}" =~ ^[0-9]+$ ]] || [[ "${CONCURRENCY}" -lt 1 ]]; then
  echo "[probe] --concurrency must be integer >= 1" >&2
  exit 1
fi
if ! [[ "${TIMEOUT_SEC}" =~ ^[0-9]+$ ]] || [[ "${TIMEOUT_SEC}" -lt 1 ]]; then
  echo "[probe] --timeout-sec must be integer >= 1" >&2
  exit 1
fi
if [[ "${TARGET_STATUS}" != "proposal_draft" && "${TARGET_STATUS}" != "proposal_waiting" && "${TARGET_STATUS}" != "proposal_paid" ]]; then
  echo "[probe] --target-status must be one of: proposal_draft|proposal_waiting|proposal_paid" >&2
  exit 1
fi

ENDPOINT="${BASE_API_URL%/}/commercial-offers/${OFFER_ID}/status"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "[probe] Started"
echo "[probe] Endpoint: ${ENDPOINT}"
echo "[probe] Requests: ${REQUESTS}, Concurrency: ${CONCURRENCY}, TargetStatus: ${TARGET_STATUS}"
echo "[probe] TimeoutSec: ${TIMEOUT_SEC}"

run_one() {
  local idx="$1"
  local out_file="${TMP_DIR}/${idx}.code"
  curl -sS -o /dev/null -w "%{http_code}" \
    --max-time "${TIMEOUT_SEC}" \
    -X POST "${ENDPOINT}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"statusKey\":\"${TARGET_STATUS}\"}" > "${out_file}" || echo "000" > "${out_file}"
}

running=0
for ((i=1; i<=REQUESTS; i++)); do
  run_one "${i}" &
  running=$((running + 1))
  if [[ "${running}" -ge "${CONCURRENCY}" ]]; then
    wait -n || true
    running=$((running - 1))
  fi
done
wait || true

declare -A counts
success=0
failed=0

for f in "${TMP_DIR}"/*.code; do
  code="$(cat "${f}")"
  counts["${code}"]=$(( ${counts["${code}"]:-0} + 1 ))
  if [[ "${code}" =~ ^2 ]]; then
    success=$((success + 1))
  else
    failed=$((failed + 1))
  fi
done

echo ""
echo "[probe] Summary"
echo "[probe] Total: ${REQUESTS}"
echo "[probe] Success (2xx): ${success}"
echo "[probe] Failed: ${failed}"
echo "[probe] By status code:"
for code in "${!counts[@]}"; do
  echo "  ${code}: ${counts[${code}]}"
done | sort

echo "[probe] Done."

if [[ -n "${REPORT_PATH}" ]]; then
  report_dir="$(dirname "${REPORT_PATH}")"
  if [[ -n "${report_dir}" && "${report_dir}" != "." ]]; then
    mkdir -p "${report_dir}"
  fi
  {
    echo "{"
    echo "  \"ts\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"endpoint\": \"${ENDPOINT}\","
    echo "  \"targetStatus\": \"${TARGET_STATUS}\","
    echo "  \"requests\": ${REQUESTS},"
    echo "  \"concurrency\": ${CONCURRENCY},"
    echo "  \"timeoutSec\": ${TIMEOUT_SEC},"
    echo "  \"strict\": $( [[ "${STRICT}" -eq 1 ]] && echo "true" || echo "false" ),"
    echo "  \"total\": ${REQUESTS},"
    echo "  \"success\": ${success},"
    echo "  \"failed\": ${failed},"
    echo "  \"byStatusCode\": ["
    sorted_codes=($(printf "%s\n" "${!counts[@]}" | sort -n))
    for ((idx=0; idx<${#sorted_codes[@]}; idx++)); do
      code="${sorted_codes[$idx]}"
      suffix=","
      if [[ $idx -eq $((${#sorted_codes[@]} - 1)) ]]; then
        suffix=""
      fi
      echo "    {\"statusCode\": ${code}, \"count\": ${counts[${code}]}}${suffix}"
    done
    echo "  ]"
    echo "}"
  } > "${REPORT_PATH}"
  echo "[probe] Report written: ${REPORT_PATH}"
fi

if [[ "${STRICT}" -eq 1 && "${failed}" -gt 0 ]]; then
  echo "[probe] Strict mode failed: non-2xx responses detected." >&2
  exit 1
fi
