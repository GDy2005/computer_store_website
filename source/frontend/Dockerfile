FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.npm \
  npm ci --include=optional --ignore-scripts \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000 \
    --fetch-timeout=300000 \
  && npm rebuild esbuild \
  && npm run build --workspace frontend
FROM nginx:1.28-bookworm
COPY infra/frontend/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
