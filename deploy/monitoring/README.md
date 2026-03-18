# Monitoring

This folder contains baseline monitoring configuration for production:

- `prometheus.yml`: scrape configuration for API metrics endpoint.
- `alert.rules.yml`: alert rules for availability, 5xx rate, and latency.

The API exposes Prometheus metrics at:

- `GET /api/metrics/`

## Start monitoring profile

From repository root:

```bash
docker compose -f deploy/compose.production.yml \
  --env-file deploy/.env.production \
  --profile monitoring up -d prometheus
```

Prometheus UI is then available on:

- `http://127.0.0.1:${PROMETHEUS_PORT:-9090}`
