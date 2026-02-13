# Motorsport API

Portfolio-ready backend API built with Django and Django REST Framework.

## What this project demonstrates
- Relational modeling across `Team`, `Driver`, `Season`, `Race`, `RaceResult`
- Versioned API (`/api/v1/`) with standings and analytics endpoints
- JWT auth + admin-only write access
- Filtering, pagination, OpenAPI docs (Swagger/ReDoc)
- Structured API error handling and application logging
- PostgreSQL-ready config with SQLite fallback
- Unit + integration automated tests
- Dockerized local setup (`docker compose up --build`)

## Tech stack
- Python 3.12+
- Django + DRF
- drf-spectacular
- djangorestframework-simplejwt
- SQLite (default dev)
- PostgreSQL (production-like setup)
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
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`

## API docs
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

Backend will be available on `http://127.0.0.1:8000` and connected to PostgreSQL in Compose.

## Logging and errors
- Logging level is controlled by `DJANGO_LOG_LEVEL` (default: `INFO`).
- DRF errors are normalized by `racing.exceptions.api_exception_handler`.
- Global handlers return JSON for API routes (`handler404`, `handler500`).

## Tests
```bash
python manage.py test
python manage.py test racing.tests.unit
python manage.py test racing.tests.integration
```

## Frontend (Angular)
Frontend app lives in `frontend/`.

```bash
npm --prefix frontend install
npm --prefix frontend run start
```

By default it uses backend API on `http://127.0.0.1:8000/api/v1`.
