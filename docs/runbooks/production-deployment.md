# Production Deployment Runbook

This runbook defines the standard rollout and rollback procedure for Motorsport API production.

## Scope

- Stack definition (IaC): `deploy/compose.production.yml`
- Runtime env template: `deploy/.env.production.example`
- Rollout script: `scripts/deploy_release.sh`
- Rollback script: `scripts/rollback_release.sh`
- State tracking: `deploy/releases/state.env`

## Prerequisites

1. Docker engine available on target host.
2. `docker compose` (preferred) or `docker-compose` available.
3. Host has:
   - `deploy/.env.production` with production secrets and host-specific values.
   - access to container registry (GHCR login if private images).
4. Network entrypoint (load balancer/reverse proxy) routes traffic to frontend host port configured by `FRONTEND_PORT` (default `8080`).
5. Release images already published:
   - backend image ref
   - frontend image ref

## One-time host bootstrap

```bash
mkdir -p deploy/releases
cp deploy/.env.production.example deploy/.env.production
# edit deploy/.env.production with real values
docker login ghcr.io
```

## Standard rollout

```bash
bash scripts/deploy_release.sh \
  --backend-image ghcr.io/<owner>/motorsport-api-backend:<tag-or-digest> \
  --frontend-image ghcr.io/<owner>/motorsport-api-frontend:<tag-or-digest> \
  --release-id <release-id> \
  --env-file deploy/.env.production \
  --health-url http://127.0.0.1:8080/api/health/
```

What the script does:

1. Pulls new `api` and `frontend` images.
2. Applies compose changes (`up -d --remove-orphans`).
3. Verifies health endpoint.
4. On failure, performs automatic rollback to previous state when available.
5. Persists release metadata in `deploy/releases/state.env`.

## Manual rollback

```bash
bash scripts/rollback_release.sh \
  --env-file deploy/.env.production \
  --health-url http://127.0.0.1:8080/api/health/
```

Rollback uses `PREVIOUS_*` values from `deploy/releases/state.env`, applies them, and swaps current/previous pointers.

## Post-deploy verification checklist

1. Health endpoint:
   - `curl -fsS http://127.0.0.1:8080/api/health/`
2. API docs:
   - `curl -fsS http://127.0.0.1:8080/api/docs/ > /dev/null`
3. Auth sanity:
   - open frontend and perform login + logout flow.
4. Logs:
   - verify request IDs and no spike in 5xx:
   - `docker compose -f deploy/compose.production.yml --env-file deploy/.env.production logs --tail=200 api`

## Incident handling

If deploy fails:

1. Keep output of `scripts/deploy_release.sh` for incident notes.
2. Run rollback command from this runbook.
3. Capture logs:
   - `docker compose -f deploy/compose.production.yml --env-file deploy/.env.production logs --no-color > deploy/releases/incident-<timestamp>.log`
4. Open incident ticket with:
   - release ID
   - backend/frontend image refs
   - failure mode (startup/healthcheck/runtime)
   - rollback status

## Operational notes

- Keep `deploy/.env.production` out of git.
- Prefer image digests for deterministic releases.
- Run deploy through protected environment approvals (GitHub Environments).
