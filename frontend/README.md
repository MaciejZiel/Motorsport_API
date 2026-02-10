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

## Build and test

```bash
npm --prefix frontend run build
npm --prefix frontend run test
```
