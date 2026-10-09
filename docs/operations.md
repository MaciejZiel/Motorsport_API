# Operations

CD pipeline, self-hosted production rollout, security settings and observability.
For the one-click Render demo see [Deploying](../README.md#deploying) in the main README.

## CD pipeline (GitHub Actions)
- Workflow file: `.github/workflows/cd.yml`
- Triggers:
  - Git tag push matching `v*` (automatic image publish to GHCR)
  - Manual trigger (`workflow_dispatch`) with options:
    - `publish_images` (default `true`)
    - `deploy` (default `false`)
    - `environment` (`staging` or `production`)
- Outputs:
  - Backend image: `ghcr.io/<owner>/motorsport-api-backend`
  - Frontend image: `ghcr.io/<owner>/motorsport-api-frontend`
  - Deployment bundle artifact (IaC + scripts + runbook)
- Built-in verification:
  - Backend image smoke test (`/api/docs/`)
  - Frontend image smoke test (`/`)

Optional deployment integration (manual workflow run):
- Required secret: `DEPLOY_WEBHOOK_URL`
- Optional secret: `DEPLOY_HEALTHCHECK_URL`
- The deploy job posts JSON payload with selected environment and published image tags.
- Use GitHub Environments (`staging` / `production`) for approval gates and protection rules.

## Production rollout and rollback
- Infrastructure as code:
  - `deploy/compose.production.yml`
  - `deploy/.env.production.example`
- Runbook:
  - `docs/runbooks/production-deployment.md`
- Automation scripts:
  - `scripts/deploy_release.sh`
  - `scripts/rollback_release.sh`
  - `scripts/backup_postgres.sh`
  - `scripts/restore_postgres.sh`
- Monitoring baseline:
  - `deploy/monitoring/prometheus.yml`
  - `deploy/monitoring/alert.rules.yml`

Example rollout:
```bash
cp deploy/.env.production.example deploy/.env.production
# edit deploy/.env.production with real secrets

bash scripts/deploy_release.sh \
  --backend-image ghcr.io/<owner>/motorsport-api-backend:<tag-or-digest> \
  --frontend-image ghcr.io/<owner>/motorsport-api-frontend:<tag-or-digest> \
  --release-id <release-id> \
  --env-file deploy/.env.production
```

Example rollback:
```bash
bash scripts/rollback_release.sh --env-file deploy/.env.production
```

Enable monitoring profile (Prometheus):
```bash
docker compose -f deploy/compose.production.yml \
  --env-file deploy/.env.production \
  --profile monitoring up -d prometheus
```

Create PostgreSQL backup:
```bash
bash scripts/backup_postgres.sh --env-file deploy/.env.production
```

Restore PostgreSQL backup (destructive):
```bash
bash scripts/restore_postgres.sh \
  --backup-file deploy/backups/<backup-file>.sql.gz \
  --env-file deploy/.env.production \
  --yes
```

## Production security baseline
Set these in production:

```bash
export DJANGO_ENV=production
export DJANGO_DEBUG=False
export DJANGO_SECRET_KEY='replace-with-a-long-random-secret'
export DJANGO_SECURE_SSL_REDIRECT=True
export DJANGO_SESSION_COOKIE_SECURE=True
export DJANGO_CSRF_COOKIE_SECURE=True
export DJANGO_SECURE_HSTS_SECONDS=31536000
export DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
export DJANGO_SECURE_HSTS_PRELOAD=True
export DJANGO_USE_X_FORWARDED_PROTO=True  # if behind reverse proxy
export DJANGO_USE_X_FORWARDED_HOST=True   # if behind reverse proxy
```

Then validate:
```bash
python manage.py check --deploy
```

## Logging and errors
- Logging level is controlled by `DJANGO_LOG_LEVEL` (default: `INFO`).
- DRF errors are normalized by `racing.exceptions.api_exception_handler`.
- Global handlers return JSON for API routes (`handler404`, `handler500`).

## Auth security hardening
- Refresh token blacklisting is enabled (SimpleJWT blacklist app).
- `GET /api/v1/auth/csrf/` issues CSRF token cookie for SPA cookie-auth flows.
- Browser session endpoints (`login`, `register`, `session/refresh`, `logout`) set or clear JWT in `HttpOnly` cookies (`access` + `refresh`) and require CSRF for unsafe requests.
- Token endpoints (`/auth/token/`, `/auth/token/refresh/`) remain available for API clients that need Bearer tokens in response bodies.
- API accepts JWT from Bearer header and secure auth cookies.
- `POST /api/v1/auth/logout/` invalidates refresh token (from body or cookie) and clears auth cookies.
- CSRF failures on API routes return structured JSON instead of Django's default HTML error page.
- Global API throttling is enabled for anonymous and authenticated clients.
- Auth endpoints (`login`, `refresh`, `register`, `logout`) use dedicated throttle scopes.
- Baseline Content Security Policy header is enabled by default (`DJANGO_CONTENT_SECURITY_POLICY`).

## Observability
- Every response includes `X-Request-ID`.
- Request-completion logs include request ID, path, method, status, and duration.
- Logs are formatted with request ID for cross-service traceability.
- Prometheus scrapes `GET /api/metrics/` from the backend service directly; the public frontend does not proxy this path.
- Production monitoring rules are defined in `deploy/monitoring/alert.rules.yml`.
