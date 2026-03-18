FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

ENV API_UPSTREAM=http://api:8000

COPY nginx.default.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/motorsport-frontend/browser /usr/share/nginx/html

EXPOSE 80
