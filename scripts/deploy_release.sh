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

BACKEND_IMAGE=""
FRONTEND_IMAGE=""
RELEASE_ID=""

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy_release.sh --backend-image <image> --frontend-image <image> [options]

Required:
  --backend-image <image>      Backend container image tag/digest
  --frontend-image <image>     Frontend container image tag/digest

Options:
  --release-id <id>            Logical release identifier (default: generated UTC timestamp)
  --env-file <path>            Runtime env file (default: deploy/.env.production)
  --compose-file <path>        Compose file (default: deploy/compose.production.yml)
  --state-dir <path>           Directory for deployment state (default: deploy/releases)
  --health-url <url>           Post-deploy health endpoint (default: http://127.0.0.1:8080/api/health/)
  --health-attempts <n>        Healthcheck retry count (default: 30)
  --health-delay <seconds>     Delay between retries (default: 5)
  --skip-healthcheck           Skip post-deploy health validation
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
      --backend-image)
        BACKEND_IMAGE="$2"
        shift 2
        ;;
      --frontend-image)
        FRONTEND_IMAGE="$2"
        shift 2
        ;;
      --release-id)
        RELEASE_ID="$2"
        shift 2
        ;;
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

load_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck source=/dev/null
    source "${STATE_FILE}"
  fi
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

compose_apply_release() {
  local backend_image="$1"
  local frontend_image="$2"

  BACKEND_IMAGE="${backend_image}" FRONTEND_IMAGE="${frontend_image}" \
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull api frontend

  BACKEND_IMAGE="${backend_image}" FRONTEND_IMAGE="${frontend_image}" \
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --remove-orphans
}

rollback_to_previous() {
  if [[ -z "${CURRENT_BACKEND_IMAGE:-}" || -z "${CURRENT_FRONTEND_IMAGE:-}" ]]; then
    echo "Rollback skipped: previous deployment state is incomplete."
    return 1
  fi

  echo "Rolling back to backend=${CURRENT_BACKEND_IMAGE} frontend=${CURRENT_FRONTEND_IMAGE}"
  compose_apply_release "${CURRENT_BACKEND_IMAGE}" "${CURRENT_FRONTEND_IMAGE}"
  if [[ "${SKIP_HEALTHCHECK}" == "false" ]]; then
    wait_for_health "${HEALTH_URL}" "${HEALTH_ATTEMPTS}" "${HEALTH_DELAY_SECONDS}"
  fi
}

main() {
  parse_args "$@"
  detect_compose_cmd

  if [[ -z "${BACKEND_IMAGE}" || -z "${FRONTEND_IMAGE}" ]]; then
    echo "Error: --backend-image and --frontend-image are required."
    usage
    exit 1
  fi

  if [[ -z "${RELEASE_ID}" ]]; then
    RELEASE_ID="release-$(date -u +%Y%m%dT%H%M%SZ)"
  fi

  require_file "${COMPOSE_FILE}" "Compose file"
  require_file "${ENV_FILE}" "Environment file"
  mkdir -p "${STATE_DIR}"
  STATE_FILE="${STATE_DIR}/state.env"
  load_state

  local previous_backend_image="${CURRENT_BACKEND_IMAGE:-}"
  local previous_frontend_image="${CURRENT_FRONTEND_IMAGE:-}"
  local previous_release_id="${CURRENT_RELEASE_ID:-}"
  local previous_released_at="${CURRENT_RELEASED_AT:-}"

  echo "Starting rollout ${RELEASE_ID}"
  echo "Target backend image: ${BACKEND_IMAGE}"
  echo "Target frontend image: ${FRONTEND_IMAGE}"

  set +e
  compose_apply_release "${BACKEND_IMAGE}" "${FRONTEND_IMAGE}"
  apply_exit_code=$?
  set -e

  if [[ "${apply_exit_code}" -ne 0 ]]; then
    echo "Rollout failed while applying compose changes."
    if [[ -n "${previous_backend_image}" && -n "${previous_frontend_image}" ]]; then
      CURRENT_BACKEND_IMAGE="${previous_backend_image}"
      CURRENT_FRONTEND_IMAGE="${previous_frontend_image}"
      if ! rollback_to_previous; then
        echo "Automatic rollback failed."
      fi
    fi
    exit 1
  fi

  if [[ "${SKIP_HEALTHCHECK}" == "false" ]]; then
    if ! wait_for_health "${HEALTH_URL}" "${HEALTH_ATTEMPTS}" "${HEALTH_DELAY_SECONDS}"; then
      echo "Rollout healthcheck failed for ${HEALTH_URL}."
      if [[ -n "${previous_backend_image}" && -n "${previous_frontend_image}" ]]; then
        CURRENT_BACKEND_IMAGE="${previous_backend_image}"
        CURRENT_FRONTEND_IMAGE="${previous_frontend_image}"
        CURRENT_RELEASE_ID="${previous_release_id}"
        CURRENT_RELEASED_AT="${previous_released_at}"
        if ! rollback_to_previous; then
          echo "Automatic rollback failed."
        fi
      fi
      exit 1
    fi
  fi

  PREVIOUS_BACKEND_IMAGE="${previous_backend_image}"
  PREVIOUS_FRONTEND_IMAGE="${previous_frontend_image}"
  PREVIOUS_RELEASE_ID="${previous_release_id}"
  PREVIOUS_RELEASED_AT="${previous_released_at}"
  CURRENT_BACKEND_IMAGE="${BACKEND_IMAGE}"
  CURRENT_FRONTEND_IMAGE="${FRONTEND_IMAGE}"
  CURRENT_RELEASE_ID="${RELEASE_ID}"
  CURRENT_RELEASED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  write_state

  echo "Rollout completed successfully."
}

main "$@"
