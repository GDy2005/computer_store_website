# Bonus implementation and evidence index

This directory indexes the implementation and runtime evidence for the bonus
features claimed by the project. It belongs at the repository root because it
is submission evidence rather than application runtime source.

Do not store API keys, `.env` files, session cookies, access tokens, payment
credentials, personal data, or unredacted secrets in screenshots or logs.

## Implemented bonus features

| Bonus area | Main implementation | Automated or runtime evidence |
| --- | --- | --- |
| CI/CD | `.github/workflows/ci.yml` | Separate lint, unit-test, frontend-build, and Docker-integration jobs; the integration job uploads the `ci-evidence` artifact |
| Microservices and Kafka | `source/docker-compose.yml`, `source/services/`, `source/packages/event-contracts/` | Smoke and integration tests exercise real Kafka events, MongoDB transactions, outbox processing, idempotency, retry, and DLQ handling |
| Horizontal scaling and Nginx | `source/docker-compose.yml`, `source/infra/nginx/nginx.conf` | `source/scripts/system-integration.js` verifies two DNS addresses for Gateway and every backend service, plus traffic across both Gateway instances |
| Kafka consumer groups | `source/packages/service-runtime/index.js` | System integration verifies at least two active members in every required Kafka consumer group |
| Socket.IO with Redis | `source/api-gateway/src/services/realtime.service.js` | System integration sends a realtime event between two Socket.IO servers through the Redis adapter |
| Elasticsearch search | `source/services/search-service/` | System integration verifies the `products_v1` index contains at least 40 products and returns searchable catalog data |
| Grounded AI assistant | `source/services/ai-service/` | Unit and system tests verify recommendations use real Search Service product IDs, prices, and canonical URLs, with a fallback when the provider is unavailable |
| Automated QA | `source/tests/`, `source/scripts/*-integration.js` | `npm run lint`, `npm test`, `npm run build`, smoke tests, and service/system integration tests |

## CI evidence artifact

Every Docker-integration run uploads an artifact named `ci-evidence`. It
contains:

- `compose-ps.txt`: container and one-shot job states.
- `kafka-consumer-groups.txt`: Kafka group membership and offsets.
- `elasticsearch-count.json`: document count for `products_v1`.
- `readiness.json`: the public Gateway readiness response.

Foundation diagnostics remain protected by an administrator session. The smoke
and system integration scripts log in with the seeded test administrator before
calling `/api/v1/foundation/*`; the endpoint is not made public for CI.

## Collect evidence locally

Run these commands from `source/`:

```powershell
docker compose up -d --build
npm run smoke
npm run system:integration
docker compose ps -a
docker compose exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups
docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count
```

For a final demonstration, capture evidence that:

1. Gateway and all backend services expose two replicas.
2. Repeated `/health/live` requests return both `x-gateway-instance` values.
3. Kafka-backed services have at least two consumer-group members where required.
4. Elasticsearch contains at least 40 indexed products.
5. The chatbot returns product cards with working catalog URLs.
6. GitHub Actions completes successfully and publishes `ci-evidence`.

Only add screenshots or logs produced by a real verified run. Do not add mock
evidence, dependency folders, generated build output, or secrets.
