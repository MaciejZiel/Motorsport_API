#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILE="${REPO_ROOT}/deploy/compose.production.yml"
ENV_FILE="${REPO_ROOT}/deploy/.env.production"
DB_SERVICE="db"
BACKUP_FILE=""
AUTO_CONFIRM=false
SKIP_API_STOP=false

usage() {
  cat <<'EOF'
Usage:
  scripts/restore_postgres.sh --backup-file <path> --yes [options]

Required:
  --backup-file <path>       Backup file (.sql or .sql.gz)
  --yes                      Confirm destructive restore operation

Options:
  --env-file <path>          Runtime env file (default: deploy/.env.production)
  --compose-file <path>      Compose file (default: deploy/compose.production.yml)
  --db-service <name>        PostgreSQL service name (default: db)
  --skip-api-stop            Do not stop/restart API service during restore
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
      --backup-file)
        BACKUP_FILE="$2"
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
      --db-service)
        DB_SERVICE="$2"
        shift 2
        ;;
      --skip-api-stop)
        SKIP_API_STOP=true
        shift
        ;;
      --yes)
        AUTO_CONFIRM=true
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

load_env_file() {
  # shellcheck source=/dev/null
  set -a
  source "${ENV_FILE}"
  set +a
}

verify_backup_checksum() {
  local checksum_file="${BACKUP_FILE}.sha256"
  if [[ -f "${checksum_file}" ]]; then
    echo "Verifying backup checksum..."
    sha256sum -c "${checksum_file}"
  fi
}

main() {
  parse_args "$@"
  detect_compose_cmd

  if [[ -z "${BACKUP_FILE}" ]]; then
    echo "Error: --backup-file is required."
    usage
    exit 1
  fi
  if [[ "${AUTO_CONFIRM}" != "true" ]]; then
    echo "Error: restore is destructive. Re-run with --yes to continue."
    exit 1
  fi

  require_file "${COMPOSE_FILE}" "Compose file"
  require_file "${ENV_FILE}" "Environment file"
  require_file "${BACKUP_FILE}" "Backup file"
  load_env_file

  if [[ -z "${POSTGRES_DB:-}" || -z "${POSTGRES_USER:-}" ]]; then
    echo "Error: POSTGRES_DB and POSTGRES_USER must be defined in ${ENV_FILE}"
    exit 1
  fi

  verify_backup_checksum

  echo "Ensuring database service is running..."
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d "${DB_SERVICE}" > /dev/null

  if [[ "${SKIP_API_STOP}" == "false" ]]; then
    echo "Stopping API service to avoid writes during restore..."
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" stop api > /dev/null
  fi

  echo "Dropping and recreating database ${POSTGRES_DB}..."
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    exec -T "${DB_SERVICE}" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 --set=dbname="${POSTGRES_DB}" <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'dbname' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS :"dbname";
CREATE DATABASE :"dbname";
SQL

  echo "Restoring backup from ${BACKUP_FILE}..."
  if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gzip -dc "${BACKUP_FILE}" | "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
      exec -T "${DB_SERVICE}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1
  else
    cat "${BACKUP_FILE}" | "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
      exec -T "${DB_SERVICE}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1
  fi

  if [[ "${SKIP_API_STOP}" == "false" ]]; then
    echo "Starting API service..."
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d api > /dev/null
  fi

  echo "Restore completed successfully."
}

main "$@"
