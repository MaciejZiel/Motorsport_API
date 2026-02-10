# Motorsport Frontend (Angular)

Standalone Angular app connected to the Django API in the parent repository.

## Run in development

From project root:

```bash
npm --prefix frontend install
npm --prefix frontend run start
```

App URL: `http://localhost:4200`

## Backend dependency

This frontend expects backend API at:

`http://127.0.0.1:8000/api/v1`

Configured in `src/app/api.config.ts`.

## Current routes

- `/` Dashboard (stats + standings)
- `/drivers` Driver list
- `/teams` Team list
- `/races` Race calendar list
- `/login` JWT sign-in page

## JWT login

Frontend sends credentials to:

`POST /api/v1/auth/token/`

On success it stores `access` and `refresh` tokens in browser localStorage.

## Protected routes and auth header

- Routes `/drivers`, `/teams`, `/races` require login.
- Logged-out user is redirected to `/login?next=...`.
- Logged-in user opening `/login` is redirected to `/`.
- HTTP requests (except token endpoint) include `Authorization: Bearer <access>` automatically.

## Build and test

```bash
npm --prefix frontend run build
npm --prefix frontend run test
```
