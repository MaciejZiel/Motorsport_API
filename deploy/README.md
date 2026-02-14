# Production IaC

Production deployment artifacts are codified in this directory:

- `compose.production.yml`:
  - production stack definition (PostgreSQL, Redis, API, Frontend)
  - strict env validation for required variables
  - healthchecks and restart policy
- `.env.production.example`:
  - reference runtime environment variables
  - expected release image variables from CI/CD

Use scripts from repository root:

- `scripts/deploy_release.sh`
- `scripts/rollback_release.sh`

Full operational procedure:

- `docs/runbooks/production-deployment.md`
