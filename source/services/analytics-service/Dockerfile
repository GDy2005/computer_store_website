FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
RUN npm ci --omit=dev --ignore-scripts
USER node
ARG SERVICE_PATH
ENV SERVICE_PATH=$SERVICE_PATH
CMD ["sh", "-c", "node $SERVICE_PATH/src/server.js"]
