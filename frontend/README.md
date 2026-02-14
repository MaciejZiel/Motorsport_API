# Motorsport Frontend (Angular)

Standalone Angular app connected to the Django API in the parent repository.

## Run in development

From project root:

```bash
npm --prefix frontend install
npm --prefix frontend run start
```

App URL: `http://localhost:4200`

For Docker compose, run from repository root:

```bash
docker compose up --build
```

## Backend dependency

This frontend uses relative API paths:

`/api/v1`

Configured in `src/app/api.config.ts` and routed either by Angular dev proxy or Nginx:

- Local dev (`npm run start`): proxy target `http://127.0.0.1:8000`
- Docker compose (Nginx container): `/api/*` proxy target from `API_UPSTREAM` (default via compose: `http://api:8000`)
- To override in compose, set `FRONTEND_API_UPSTREAM` (example: `http://host.docker.internal:8000`)

## Current routes

- `/` Dashboard (stats + standings)
- `/drivers` Driver list
- `/drivers/:id` Driver detail
- `/teams` Team list
- `/teams/:id` Team detail
- `/races` Race calendar list
- `/races/:id` Race detail
- `/admin` Admin workspace (staff only)
- `/login` JWT sign-in page
- `/register` JWT sign-up page

## JWT login

Frontend sends credentials to:

`POST /api/v1/auth/token/`

On success it stores `access` and `refresh` tokens in browser sessionStorage.

Frontend can create a user account via:

`POST /api/v1/auth/register/`

Frontend logout calls:

`POST /api/v1/auth/logout/`

to blacklist the current refresh token server-side.

## Protected routes and auth header

- Routes `/drivers`, `/drivers/:id`, `/teams`, `/teams/:id`, `/races`, `/races/:id` require login.
- Route `/admin` requires staff/superuser role.
- Logged-out user is redirected to `/login?next=...`.
- Logged-in user opening `/login` is redirected to `/`.
- HTTP requests (except register, token, and token refresh endpoints) include `Authorization: Bearer <access>` automatically.
- Frontend uses `GET /api/v1/auth/me/` to resolve current user role and admin access.
- On API `401`, frontend uses the refresh token (`POST /api/v1/auth/token/refresh/`) and retries the failed request once.

## UI behavior

- Top-right theme toggle switches between light and dark mode.
- Theme selection is persisted in browser localStorage.
- List pages (`/drivers`, `/teams`, `/races`) support filters + pagination synced with URL query params.
- List pages include loading, error, and empty states with retry actions.

## Build and test

```bash
npm --prefix frontend run build
npm --prefix frontend run test
```
