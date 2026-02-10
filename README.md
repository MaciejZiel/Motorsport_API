# Motorsport API

Portfolio-ready backend API built with Django and Django REST Framework.

## What this project demonstrates
- Relational modeling across `Team`, `Driver`, `Season`, `Race`, `RaceResult`
- Versioned API (`/api/v1/`) with standings and analytics endpoints
- JWT auth + admin-only write access
- Filtering, pagination, OpenAPI docs
- PostgreSQL-ready config with SQLite fallback
- Automated API tests

## Tech stack
- Python 3.12+
- Django + DRF
- drf-spectacular
- djangorestframework-simplejwt
- SQLite (default dev)
- PostgreSQL (production-like setup)

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

Docs:
- Swagger: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI schema: `/api/schema/`

## Quick start (SQLite)
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_motorsport
python manage.py runserver
```

## PostgreSQL mode
Set env vars:
```bash
set DJANGO_DB_ENGINE=postgresql
set POSTGRES_DB=motorsport_api
set POSTGRES_USER=postgres
set POSTGRES_PASSWORD=postgres
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432
```

or:
```bash
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/motorsport_api
```

Then:
```bash
python manage.py migrate
python manage.py seed_motorsport
python manage.py runserver
```

## Tests
```bash
python manage.py test
```

## Frontend (Angular)
Frontend app lives in `frontend/`.

```bash
npm --prefix frontend install
npm --prefix frontend run start
```

By default it uses backend API on `http://127.0.0.1:8000/api/v1`.
