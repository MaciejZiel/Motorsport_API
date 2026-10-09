#!/bin/sh
# Start command for the Render Blueprint (render.yaml).
# Runs on every deploy/restart: migrations and seeding are idempotent, so the
# free plan (which has no pre-deploy hook) can still bootstrap itself.
set -eu

# Render's generateValue yields a 44-character secret, but the production
# settings (like `manage.py check --deploy`) require at least 50 characters.
# Two generated halves give an 88-character, 512-bit key.
if [ -z "${DJANGO_SECRET_KEY:-}" ]; then
  DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY_PART_1:?}${DJANGO_SECRET_KEY_PART_2:?}"
  export DJANGO_SECRET_KEY
fi

python manage.py migrate --noinput

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  python manage.py seed_motorsport
  python manage.py seed_demo_user
fi

exec gunicorn Motorsport_API.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${GUNICORN_WORKERS:-1}" \
  --timeout "${GUNICORN_TIMEOUT:-60}"
