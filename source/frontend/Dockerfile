FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts && npm run build --workspace frontend
FROM nginx:1.28-bookworm
COPY infra/frontend/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
