# Motorsport API

Portfolio-ready backend API built with Django and Django REST Framework.

## What this project demonstrates
- Relational modeling across `Team`, `Driver`, `Season`, `Race`, `RaceResult`
- Versioned API (`/api/v1/`) with standings and analytics endpoints
- JWT auth + admin-only write access
- CSRF hardening for cookie-based auth flows
- Filtering, pagination, OpenAPI docs (Swagger/ReDoc)
- Structured API error handling and application logging
- Request tracing with `X-Request-ID` propagation in responses and logs
- PostgreSQL-ready config with SQLite fallback
- Redis-ready shared cache for throttling consistency
- Environment-based production security settings (HTTPS, HSTS, secure cookies)
- Unit + integration automated tests
- Dockerized local setup (`docker compose up --build`)

## Tech stack
- Python 3.12+
- Django + DRF
- drf-spectacular
- djangorestframework-simplejwt
- gunicorn
- SQLite (default dev)
- PostgreSQL (production-like setup)
- Redis (shared cache / throttling)
- Docker + Docker Compose

## Main endpoints
- `GET/POST /api/v1/teams/`
- `GET/POST /api/v1/drivers/`
- `GET/POST /api/v1/seasons/`
- `GET/POST /api/v1/races/`
- `GET/POST /api/v1/results/`
- `GET /api/v1/standings/drivers/?season=2026`
- `GET /api/v1/standings/constructors/?season=2026`
- `GET /api/v1/stats/`
- `GET /api/health/`
- `GET /api/v1/auth/me/`
- `GET /api/v1/auth/csrf/`
- `POST /api/v1/auth/logout/`
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`

## API docs
- Root URL `/` redirects to Swagger UI (`/api/docs/`)
- OpenAPI schema: `/api/schema/`
- Swagger UI: `/api/schema/swagger-ui/` (alias: `/api/docs/`)
- ReDoc: `/api/schema/redoc/` (alias: `/api/redoc/`)

## Quick start (SQLite)
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate  # Windows PowerShell/CMD
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_motorsport
python manage.py runserver
```

For reproducible environments (CI/CD and containers), install pinned dependencies from `requirements.lock`:

```bash
pip install -r requirements.lock
```

## PostgreSQL mode (local)
Set env vars:
```bash
export DJANGO_DB_ENGINE=postgresql
export POSTGRES_DB=motorsport_api
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
```

or:
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/motorsport_api
```

Then:
```bash
python manage.py migrate
python manage.py seed_motorsport
python manage.py runserver
```

## Docker
```bash
docker compose up --build
# fallback for older installations:
# docker-compose up --build
```

Compose starts four services: `db` (PostgreSQL), `redis` (shared cache), `api` (Django + gunicorn), and `frontend` (Nginx serving built Angular app).

- Frontend: `http://127.0.0.1:4200`
- Backend API: `http://127.0.0.1:8000`

Frontend requests `/api/*` are proxied by Nginx to the backend service in Docker.
Backend static files (including Django admin assets) are collected with `collectstatic` and served by WhiteNoise.
Frontend image API upstream is configurable via `FRONTEND_API_UPSTREAM` (default: `http://api:8000`).

Default compose values run Django in local development mode (`DJANGO_ENV=development`, `DJANGO_DEBUG=True`) so the stack starts without extra setup.
For production-like runs, provide `DJANGO_ENV=production` and a strong `DJANGO_SECRET_KEY` (see production baseline below).

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
- Built-in verification:
  - Backend image smoke test (`/api/docs/`)
  - Frontend image smoke test (`/`)

Optional deployment integration (manual workflow run):
- Required secret: `DEPLOY_WEBHOOK_URL`
- Optional secret: `DEPLOY_HEALTHCHECK_URL`
- The deploy job posts JSON payload with selected environment and published image tags.
- Use GitHub Environments (`staging` / `production`) for approval gates and protection rules.

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
- Login/register/refresh set JWT in `HttpOnly` cookies (`access` + `refresh`).
- API accepts JWT from Bearer header (backward compatible) and secure auth cookies.
- `POST /api/v1/auth/logout/` invalidates refresh token (from body or cookie) and clears auth cookies.
- Unsafe cookie-authenticated requests require CSRF header (`X-CSRFToken`).
- Global API throttling is enabled for anonymous and authenticated clients.
- Auth endpoints (`login`, `refresh`, `register`, `logout`) use dedicated throttle scopes.
- Baseline Content Security Policy header is enabled by default (`DJANGO_CONTENT_SECURITY_POLICY`).

## Observability
- Every response includes `X-Request-ID`.
- Request-completion logs include request ID, path, method, status, and duration.
- Logs are formatted with request ID for cross-service traceability.

## UI screenshots
![Login page](docs/screenshots/login.png)
*Login view with cookie-based auth flow.*

![Dashboard page](docs/screenshots/dashboard.png)
*Dashboard with API stats and standings widgets.*

![Drivers list page](docs/screenshots/drivers-list.png)
*Drivers list with filters and pagination.*

![Dark mode dashboard](docs/screenshots/dashboard-dark.png)
*Dark theme variant of the dashboard (`?theme=dark`).*

## Tests
```bash
pytest
pytest racing/tests/unit
pytest racing/tests/integration
pytest --cov=Motorsport_API --cov=racing --cov-config=.coveragerc --cov-report=term-missing
npm --prefix frontend run lint
npm --prefix frontend run test:ci
npm --prefix frontend run coverage:check
bash scripts/e2e_compose_smoke.sh
```

## Frontend (Angular)
Frontend app lives in `frontend/`.

```bash
npm --prefix frontend install
npm --prefix frontend run start
```

The frontend uses relative API paths (`/api/v1`) and `ng serve` proxy config.
Default local proxy target is `http://127.0.0.1:8000`.
