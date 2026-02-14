#!/usr/bin/env bash
set -euo pipefail

if docker compose version > /dev/null 2>&1; then
  compose_cmd=(docker compose)
elif command -v docker-compose > /dev/null 2>&1; then
  compose_cmd=(docker-compose)
else
  echo "Neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi
cookie_jar="$(mktemp)"
log_dir="$(mktemp -d)"

cleanup() {
  set +e
  "${compose_cmd[@]}" logs --no-color > "${log_dir}/compose.log" 2>&1 || true
  "${compose_cmd[@]}" down -v || true
  rm -f "${cookie_jar}"
}
trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"
  local delay_seconds="${3:-2}"

  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" > /dev/null; then
      return 0
    fi
    sleep "${delay_seconds}"
  done

  echo "Timed out waiting for ${url}"
  return 1
}

read_csrf_cookie() {
  awk '$6 == "csrftoken" { token = $7 } END { print token }' "${cookie_jar}"
}

echo "Building and starting compose stack..."
"${compose_cmd[@]}" up -d --build db redis api frontend

wait_for_url "http://127.0.0.1:4200/" 80 2
wait_for_url "http://127.0.0.1:4200/api/health/" 80 2

echo "Fetching CSRF token..."
curl -fsS -c "${cookie_jar}" "http://127.0.0.1:4200/api/v1/auth/csrf/" > /dev/null
csrf_token="$(read_csrf_cookie)"
if [[ -z "${csrf_token}" ]]; then
  echo "Missing csrftoken cookie after csrf bootstrap request."
  exit 1
fi

username="e2e_user_$(date +%s)"
password="StrongPass123!"

echo "Registering e2e user via frontend proxy..."
curl -fsS -b "${cookie_jar}" -c "${cookie_jar}" \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: ${csrf_token}" \
  -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"password_confirm\":\"${password}\"}" \
  "http://127.0.0.1:4200/api/v1/auth/register/" > /dev/null

echo "Verifying authenticated profile..."
auth_me_payload="$(curl -fsS -b "${cookie_jar}" "http://127.0.0.1:4200/api/v1/auth/me/")"
if ! grep -q "\"username\":\"${username}\"" <<< "${auth_me_payload}"; then
  echo "Expected auth/me payload to contain registered user."
  exit 1
fi

echo "Verifying proxy access to protected frontend API routes..."
drivers_payload="$(curl -fsS -b "${cookie_jar}" "http://127.0.0.1:4200/api/v1/drivers/")"
if ! grep -q "\"results\"" <<< "${drivers_payload}"; then
  echo "Expected drivers payload to contain paginated results."
  exit 1
fi

echo "Refreshing CSRF token and logging out..."
curl -fsS -b "${cookie_jar}" -c "${cookie_jar}" "http://127.0.0.1:4200/api/v1/auth/csrf/" > /dev/null
csrf_token="$(read_csrf_cookie)"
logout_status="$(
  curl -sS -o /dev/null -w "%{http_code}" -b "${cookie_jar}" -c "${cookie_jar}" \
    -H "Content-Type: application/json" \
    -H "X-CSRFToken: ${csrf_token}" \
    -d "{}" \
    "http://127.0.0.1:4200/api/v1/auth/logout/"
)"

if [[ "${logout_status}" != "204" ]]; then
  echo "Expected logout status 204, got ${logout_status}."
  exit 1
fi

echo "Ensuring auth/me is unauthorized after logout..."
post_logout_status="$(
  curl -sS -o /dev/null -w "%{http_code}" -b "${cookie_jar}" \
    "http://127.0.0.1:4200/api/v1/auth/me/"
)"
if [[ "${post_logout_status}" != "401" ]]; then
  echo "Expected auth/me status 401 after logout, got ${post_logout_status}."
  exit 1
fi

echo "Compose smoke e2e passed."
