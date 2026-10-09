# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-10

First tagged release.

### Added

- Django REST API (`/api/v1/`) for teams, drivers, seasons, races and race
  results, with filtering, pagination and database constraints (one result per
  driver per race, unique positions, one fastest lap per race).
- Driver and constructor standings per season computed with SQL aggregation,
  and a `/api/v1/stats/` dataset summary.
- JWT authentication: `HttpOnly` cookies with CSRF protection for the browser,
  Bearer tokens for API clients, refresh-token rotation and blacklisting on
  logout, registration, throttling. Reads are public, writes require staff.
- OpenAPI docs (Swagger UI and ReDoc) served from bundled assets under a strict
  Content-Security-Policy, health check, Prometheus metrics and `X-Request-ID`
  tracing.
- Angular 21 frontend served by Nginx: dashboard, drivers, teams and races with
  filters, pagination and detail pages, login and registration, dark mode.
- Docker Compose for local development, production Compose stack with
  health-checked rollout, rollback, database backup and restore scripts and
  Prometheus rules, and a CD workflow that publishes images to GHCR on tags.
- Render Blueprint for a free demo deployment, with seeded sample data and a
  read-only demo user.
- 103 backend pytest tests (CI enforces 90% coverage), 61 Vitest frontend
  tests, and a full-stack Docker Compose smoke test.
- CI with ruff, `pip-audit`, `npm audit`, dependency review, missing-migration
  and `check --deploy` gates.
- CodeQL code scanning for Python and TypeScript, and Dependabot updates for
  pip, npm, Docker and GitHub Actions.

### Security

- Backend and frontend dependencies with known vulnerabilities were upgraded,
  and the frontend builds and runs on Node.js 24 LTS.

[1.0.0]: https://github.com/MaciejZiel/Motorsport_API/releases/tag/v1.0.0
