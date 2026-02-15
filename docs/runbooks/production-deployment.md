# Production Deployment Runbook

This runbook defines the standard rollout and rollback procedure for Motorsport API production.

## Scope

- Stack definition (IaC): `deploy/compose.production.yml`
- Runtime env template: `deploy/.env.production.example`
- Rollout script: `scripts/deploy_release.sh`
- Rollback script: `scripts/rollback_release.sh`
- Backup script: `scripts/backup_postgres.sh`
- Restore script: `scripts/restore_postgres.sh`
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
6. For monitoring profile:
   - `deploy/monitoring/prometheus.yml`
   - `deploy/monitoring/alert.rules.yml`

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

## Monitoring baseline

Prometheus-ready metrics endpoint:

- `GET /api/metrics/`

Start monitoring profile:

```bash
docker compose -f deploy/compose.production.yml \
  --env-file deploy/.env.production \
  --profile monitoring up -d prometheus
```

Default dashboard endpoint:

- `http://127.0.0.1:9090`

Configured alerts (in `deploy/monitoring/alert.rules.yml`):

1. API unavailable (`up == 0`)
2. 5xx error rate above 5%
3. Average latency above 500 ms

Alert routing can be integrated by extending Prometheus with Alertmanager in your infrastructure.

## Backup and restore

Create backup:

```bash
bash scripts/backup_postgres.sh --env-file deploy/.env.production
```

Restore backup (destructive):

```bash
bash scripts/restore_postgres.sh \
  --backup-file deploy/backups/<backup-file>.sql.gz \
  --env-file deploy/.env.production \
  --yes
```

Recommended baseline:

1. Run `backup_postgres.sh` on a schedule (for example, daily via cron/systemd timer).
2. Replicate `deploy/backups/` to off-host storage.
3. Execute a restore drill at least once per quarter.

## Post-deploy verification checklist

1. Health endpoint:
   - `curl -fsS http://127.0.0.1:8080/api/health/`
2. API docs:
   - `curl -fsS http://127.0.0.1:8080/api/docs/ > /dev/null`
3. Metrics endpoint:
   - `curl -fsS http://127.0.0.1:8080/api/metrics/ | head`
4. Auth sanity:
   - open frontend and perform login + logout flow.
5. Logs:
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
