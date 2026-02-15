#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/deploy/compose.production.yml"
ENV_FILE="${REPO_ROOT}/deploy/.env.production"
OUTPUT_DIR="${REPO_ROOT}/deploy/backups"
DB_SERVICE="db"
RETENTION_DAYS=14

usage() {
  cat <<'EOF'
Usage:
  scripts/backup_postgres.sh [options]

Options:
  --env-file <path>          Runtime env file (default: deploy/.env.production)
  --compose-file <path>      Compose file (default: deploy/compose.production.yml)
  --output-dir <path>        Backup directory (default: deploy/backups)
  --db-service <name>        PostgreSQL service name (default: db)
  --retention-days <days>    Delete backups older than this value (default: 14)
  --help                     Show this help
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
      --output-dir)
        OUTPUT_DIR="$2"
        shift 2
        ;;
      --db-service)
        DB_SERVICE="$2"
        shift 2
        ;;
      --retention-days)
        RETENTION_DAYS="$2"
        shift 2
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

load_env_file() {
  # shellcheck source=/dev/null
  set -a
  source "${ENV_FILE}"
  set +a
}

remove_expired_backups() {
  local backup_path
  while IFS= read -r backup_path; do
    rm -f "${backup_path}" "${backup_path}.sha256"
  done < <(find "${OUTPUT_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -print)
}

main() {
  parse_args "$@"
  detect_compose_cmd
  require_file "${COMPOSE_FILE}" "Compose file"
  require_file "${ENV_FILE}" "Environment file"
  load_env_file

  if [[ -z "${POSTGRES_DB:-}" || -z "${POSTGRES_USER:-}" ]]; then
    echo "Error: POSTGRES_DB and POSTGRES_USER must be defined in ${ENV_FILE}"
    exit 1
  fi

  mkdir -p "${OUTPUT_DIR}"
  local timestamp
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  local backup_file="${OUTPUT_DIR}/postgres-${POSTGRES_DB}-${timestamp}.sql.gz"

  echo "Ensuring database service is running..."
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d "${DB_SERVICE}" > /dev/null

  echo "Creating PostgreSQL backup: ${backup_file}"
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    exec -T "${DB_SERVICE}" \
    pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip -9 > "${backup_file}"

  sha256sum "${backup_file}" > "${backup_file}.sha256"
  remove_expired_backups

  echo "Backup completed successfully."
  echo "File: ${backup_file}"
  echo "Checksum: ${backup_file}.sha256"
}

main "$@"
