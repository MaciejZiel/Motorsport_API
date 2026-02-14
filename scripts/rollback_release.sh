#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/deploy/compose.production.yml"
ENV_FILE="${REPO_ROOT}/deploy/.env.production"
STATE_DIR="${REPO_ROOT}/deploy/releases"
STATE_FILE="${STATE_DIR}/state.env"
HEALTH_URL="http://127.0.0.1:8080/api/health/"
HEALTH_ATTEMPTS=30
HEALTH_DELAY_SECONDS=5
SKIP_HEALTHCHECK=false

usage() {
  cat <<'EOF'
Usage:
  scripts/rollback_release.sh [options]

Options:
  --env-file <path>            Runtime env file (default: deploy/.env.production)
  --compose-file <path>        Compose file (default: deploy/compose.production.yml)
  --state-dir <path>           Directory containing deployment state (default: deploy/releases)
  --health-url <url>           Post-rollback health endpoint (default: http://127.0.0.1:8080/api/health/)
  --health-attempts <n>        Healthcheck retry count (default: 30)
  --health-delay <seconds>     Delay between retries (default: 5)
  --skip-healthcheck           Skip post-rollback health validation
  --help                       Show this help
EOF
}

detect_compose_cmd() {
  if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return
  fi

  if command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return
  fi

  echo "Error: neither 'docker compose' nor 'docker-compose' is available."
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
      --compose-file)
        COMPOSE_FILE="$2"
        shift 2
        ;;
      --state-dir)
        STATE_DIR="$2"
        shift 2
        ;;
      --health-url)
        HEALTH_URL="$2"
        shift 2
        ;;
      --health-attempts)
        HEALTH_ATTEMPTS="$2"
        shift 2
        ;;
      --health-delay)
        HEALTH_DELAY_SECONDS="$2"
        shift 2
        ;;
      --skip-healthcheck)
        SKIP_HEALTHCHECK=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done
}

require_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "${path}" ]]; then
    echo "Error: ${label} not found at ${path}"
    exit 1
  fi
}

wait_for_health() {
  local url="$1"
  local attempts="$2"
  local delay="$3"

  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" > /dev/null; then
      return 0
    fi
    sleep "${delay}"
  done
  return 1
}

write_state() {
  mkdir -p "${STATE_DIR}"
  cat > "${STATE_FILE}" <<EOF
CURRENT_BACKEND_IMAGE=${CURRENT_BACKEND_IMAGE:-}
CURRENT_FRONTEND_IMAGE=${CURRENT_FRONTEND_IMAGE:-}
CURRENT_RELEASE_ID=${CURRENT_RELEASE_ID:-}
CURRENT_RELEASED_AT=${CURRENT_RELEASED_AT:-}
PREVIOUS_BACKEND_IMAGE=${PREVIOUS_BACKEND_IMAGE:-}
PREVIOUS_FRONTEND_IMAGE=${PREVIOUS_FRONTEND_IMAGE:-}
PREVIOUS_RELEASE_ID=${PREVIOUS_RELEASE_ID:-}
PREVIOUS_RELEASED_AT=${PREVIOUS_RELEASED_AT:-}
EOF
}

main() {
  parse_args "$@"
  detect_compose_cmd
  STATE_FILE="${STATE_DIR}/state.env"

  require_file "${COMPOSE_FILE}" "Compose file"
  require_file "${ENV_FILE}" "Environment file"
  require_file "${STATE_FILE}" "Deployment state file"

  # shellcheck source=/dev/null
  source "${STATE_FILE}"

  if [[ -z "${PREVIOUS_BACKEND_IMAGE:-}" || -z "${PREVIOUS_FRONTEND_IMAGE:-}" ]]; then
    echo "Error: rollback target not found in ${STATE_FILE}"
    exit 1
  fi

  local rollback_backend="${PREVIOUS_BACKEND_IMAGE}"
  local rollback_frontend="${PREVIOUS_FRONTEND_IMAGE}"
  local rollback_release_id="${PREVIOUS_RELEASE_ID:-manual-rollback}"
  local rollback_released_at="${PREVIOUS_RELEASED_AT:-unknown}"

  local prior_current_backend="${CURRENT_BACKEND_IMAGE:-}"
  local prior_current_frontend="${CURRENT_FRONTEND_IMAGE:-}"
  local prior_current_release_id="${CURRENT_RELEASE_ID:-}"
  local prior_current_released_at="${CURRENT_RELEASED_AT:-}"

  echo "Rolling back to release ${rollback_release_id}"
  echo "Target backend image: ${rollback_backend}"
  echo "Target frontend image: ${rollback_frontend}"

  BACKEND_IMAGE="${rollback_backend}" FRONTEND_IMAGE="${rollback_frontend}" \
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull api frontend

  BACKEND_IMAGE="${rollback_backend}" FRONTEND_IMAGE="${rollback_frontend}" \
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --remove-orphans

  if [[ "${SKIP_HEALTHCHECK}" == "false" ]]; then
    if ! wait_for_health "${HEALTH_URL}" "${HEALTH_ATTEMPTS}" "${HEALTH_DELAY_SECONDS}"; then
      echo "Error: rollback healthcheck failed for ${HEALTH_URL}"
      exit 1
    fi
  fi

  CURRENT_BACKEND_IMAGE="${rollback_backend}"
  CURRENT_FRONTEND_IMAGE="${rollback_frontend}"
  CURRENT_RELEASE_ID="${rollback_release_id}"
  CURRENT_RELEASED_AT="${rollback_released_at}"
  PREVIOUS_BACKEND_IMAGE="${prior_current_backend}"
  PREVIOUS_FRONTEND_IMAGE="${prior_current_frontend}"
  PREVIOUS_RELEASE_ID="${prior_current_release_id}"
  PREVIOUS_RELEASED_AT="${prior_current_released_at}"
  write_state

  echo "Rollback completed successfully."
}

main "$@"
