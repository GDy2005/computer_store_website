# Phase 1 foundation

**Status: ACCEPTED locally on 2026-10-03 (Asia/Saigon).**
`docker compose up -d` now exits 0. All 12 long-running containers are healthy;
the two initialization jobs exit 0. Real broker/database smoke and integration
checks passed. Phase 2 has not been implemented.

The original architecture specification is authoritative. Microservices and
Kafka are required now. Five service entrypoints build into five separate
containers; shared packages contain infrastructure only, never domain modules.

## Plan and scope

1. npm workspaces and version-controlled JSON Schema contracts.
2. Kafka client, structured logger, validation, test utilities and runtime.
3. Five database owners, local MongoDB transactions, outbox and processed markers.
4. Kafka KRaft, rs0, Redis, init jobs and dependency health checks in Compose.
5. Two stateless gateways behind Nginx; Redis-backed session store is wired.
6. React/MUI theme, router, customer layout and development diagnostics.
7. Contract/unit tests, actual Compose smoke, GitHub Actions lint/test/build.

Phase 2 may begin only after `docker compose up -d` and the smoke pass.

## Files

Root manifests, lockfile, ESLint configuration, ignore files, env example,
Compose file, README, this document and CI workflow. Each gateway/core service
has package.json, Dockerfile and src/app.js + src/server.js. Each core service
has src/events/handlers.js for its local probe handler. Shared packages are
event-contracts (topics, envelope, 16 schemas), kafka-client, logger, validation,
test-utils and service-runtime. Frontend includes Vite config, index, React
entrypoint, routes/layout and theme. Infrastructure includes Nginx configs,
Kafka topic config/creation script, MongoDB rs0 initialization. Verification
scripts and tests complete the foundation. scripts/scaffold.mjs records the
initial generation; do not rerun it over edited files.

## Docker services

frontend, nginx, gateway-1, gateway-2, identity-service, catalog-service,
order-service, notification-service, analytics-service, kafka, kafka-init,
mongo, mongo-init, redis. Init jobs must exit 0; remaining containers have
healthchecks. Search/AI/Elasticsearch are later-phase features, not claimed here.

## Ownership

| Service | Database | Future business collections |
|---|---|---|
| identity-service | identity_db | users, password_tokens |
| catalog-service | catalog_db | categories, products, comments, ratings, inventory_reservations |
| order-service | order_db | carts, coupons, orders, loyalty_accounts, loyalty_transactions |
| notification-service | notification_db | email_jobs |
| analytics-service | analytics_db | dashboard_daily, dashboard_monthly, product_sales |

Every service owns its processed_events and foundation_probes/
foundation_dead_letters. Phase 1 adds outbox_events for probe publication in each
owner. Notification/Analytics business flows will remain consumer-driven.
DB_NAME must match a fixed ownership allowlist. No cross-database imports or
queries occur. Logical isolation in the demo is enforced in application setup;
MongoDB database-scoped credentials/network security are production hardening.

## Topics and contracts

All 15 topics from specification section 7.2 exist, plus foundation.probe.v1.
Each has .retry/.dlq, 3 partitions, replication factor 1, retention 7 days.
The complete list is in packages/event-contracts/topics.js and
infra/kafka/topic-config.json. JSON schemas reject unknown envelope/payload
fields and validate version, timestamps, IDs, enums and numeric bounds.
eventType is singular for user/product/comment/rating/order, as in the spec.
Producer callers must use createEvent; outbox validates again before publishing.
The initial domain payloads are explicit draft contracts; review them when each
business slice is added. Do not silently change contracts once consumers use them.

| Contract family | Required payload |
|---|---|
| users.created | userId, email, fullName, role, accountStatus |
| users.updated | userId, fullName, isBanned |
| products.created/updated | productId, name, description, brand, categoryId, tags, minPrice, maxPrice, averageRating, isActive |
| comments.created | commentId, productId, displayName, content |
| ratings.updated | productId, averageRating, ratingCount |
| orders.created/confirmed | orderId, orderNumber, userId, customer, item snapshots, pricing |
| orders.cancelled | orderId, orderNumber, reason |
| orders.status-changed | orderId, orderNumber, previousStatus, status |
| inventory.reserved | orderId, reservationId, items |
| inventory.rejected | orderId, reason, items |
| inventory.release-requested | orderId, reservationId, reason |
| loyalty.changed | userId, orderId, transactionId, type, points, balanceAfter |
| email.requested | userId, recipientEmail, type, templateData |
| foundation.probe | probeId UUID, message up to 200 characters, mode |

Domain schemas reserve future topics; no domain handlers fabricate successful
business behavior. Phase 1 subscribes only to probe/retry/DLQ and has a distinct
foundation consumer group per owner. Domain consumer groups from section 7.3
will be wired when their domain handlers exist.

## Delivery semantics

POST probe writes the local probe and outbox in one MongoDB transaction. A
background publisher leases pending rows for 60 seconds, publishes with the
aggregate key, and marks PUBLISHED only after broker acknowledgement. A crash
after publish can redeliver, deliberately using at-least-once semantics.

Each consumer writes its effect and unique (eventId, consumer) processed marker
in the same local transaction. Manual offsets commit after successful handling
or acknowledged retry/DLQ routing. Retry messages are targeted to the failed
consumer group so other groups do not create duplicate retry effects. Transient
failures retry with bounded exponential delays; contract failures go directly
to DLQ. Broker routing failure leaves the source offset uncommitted. Poison mode
demonstrates retry exhaustion. Outbox broker failures remain pending for eventual
recovery, rather than dropping domain changes after a retry limit.

Ready health checks verify database ping, Kafka reachability and consumer group
join; consumer crashes turn readiness false. Foundation status exposes pending
outbox, processed count and observed DLQ count. Full domain consumer lag metrics,
DLQ replay tooling and outbox archival are deferred operational work.

## Verification evidence

Actual checks rerun on 2026-10-03 (Asia/Saigon):

| Phase 1 requirement | Evidence | Result |
|---|---|---|
| source/ npm monorepo | Gateway, frontend, five services and shared workspace packages installed/buildable | PASS |
| MongoDB replica set, Redis, Kafka KRaft | rs0 primary=true; all three containers healthy; named volumes retained | PASS |
| API Gateway and five core service skeletons | Two gateways plus five independent service containers healthy | PASS |
| Topics, envelope and contract schemas | 48 application topics (16 base + retry/DLQ); 9 contract/foundation tests pass | PASS |
| Kafka client, logger, validation, test utilities | Shared infrastructure packages used by the running services | PASS |
| Outbox / Processed Event base | Real transaction rollback, duplicate Kafka delivery and commit/offset-gap replay tests pass | PASS |
| Standard error/validation response | Invalid probe request returns HTTP 400 in smoke test | PASS |
| React/MUI theme, router and layout | Vite build passes (985 modules); frontend healthy and served through Nginx | PASS |
| CI lint/test/build | Workflow configured; equivalent lint/tests/frontend/container builds pass locally | PASS locally; hosted workflow not run |
| Single-command Compose startup | Exact `docker compose up -d` from C:\\nodejs_finalterm exits 0 | PASS |

Container status at acceptance:

- Running and healthy: frontend, nginx, gateway-1, gateway-2, identity-service,
  catalog-service, order-service, notification-service, analytics-service,
  kafka, mongo, redis.
- Exited successfully (code 0): mongo-init, kafka-init.
- Kafka internal `__consumer_offsets` exists in addition to 48 application topics.
- Active groups: identity-service-foundation-group,
  catalog-service-foundation-group, order-service-foundation-group,
  notification-service-foundation-group, analytics-service-foundation-group.
- All five service status responses report `pendingOutbox: 0` and one observed
  dead letter from the poison-message demonstration.

Smoke output:

```text
PASS normal 17fdf0a2-2219-4167-a297-61dee3bfc9d0
PASS retry cd3369fa-c71c-4a52-b298-9d943166b822
PASS poison 71a243ce-4d0b-4d67-80a9-339e9b3ebd92
PASS Phase 1: 5 services, real Kafka, transactions, retry, DLQ, 2 gateways
```

Real event integration output:

```text
PASS real MongoDB transaction rollback (effect + outbox)
PASS duplicate Kafka delivery creates exactly one local effect in all five services
PASS replay after DB commit without offset commit is idempotent (real transaction)
```

The replay test simulates the DB-commit/offset-acknowledgement gap using real
MongoDB transactions; it does not forcibly crash a process. No hosted GitHub
Actions execution is claimed: the workspace has not been connected to a remote
GitHub repository. The workflow assumes source/ is the repository checkout root.

### Recovery from the interrupted Docker run

The original cached Kafka image had a missing snapshot
`snapshots/3774/fs`; repulling the same tag reused the damaged cache. Other old
images subsequently failed with a missing MongoDB system user or an entrypoint
`exec format error`. Recovery uses official replacement tags:

- Kafka: apache/kafka:3.9.2 (from 3.9.1).
- MongoDB: mongo:7.0.26 (from floating mongo:7.0).
- Redis: redis:7.4-bookworm (from 7.4-alpine).
- Nginx and frontend base: nginx:1.28-bookworm (from 1.28-alpine).

Frontend and Nginx healthchecks now use curl available in the Debian image.
Application containers were rebuilt and all previously interrupted checks ran.
No global Docker prune/reset was performed; named database/broker/cache volumes
and unrelated project containers were preserved.

### Reproduce acceptance

```text
docker compose up -d
cd source
npm run lint
npm test
npm run build
npm run smoke
docker compose exec -T identity-service node scripts/event-integration.js
docker compose ps -a
```

On Windows, source/scripts/verify-compose.ps1 runs Compose, smoke and event
integration checks together. Database credentials must never point these
verification scripts at production. Normal startup does not require npm on the
host; local verification does.

## Git readiness review — 2026-10-04

Phase 1 is ready to commit/push with source/ as the Git repository root.
The workspace has no initialized Git repository or configured remote yet.

Rechecked successfully: lint, all 9 tests, frontend build, npm audit (0 reported
vulnerabilities), exact `docker compose up -d` (exit 0), all 12 running containers
healthy, both init jobs exit 0, real Kafka smoke and transaction/event integration.
Secret-pattern scanning of publishable source found no private keys, actual
provider tokens or credential-bearing MongoDB connection URLs. Demo placeholders
in Compose and .env.example are intentional local configuration examples.

Git ignore rules now exclude .env and .env.* except .env.example, as well as
node_modules, dist, coverage and logs. Verified using Git's own ignore/file-list
commands against a temporary audit repository; no project Git metadata was
created. The lockfile, example environment file and workflow remain publishable.
.gitattributes fixes shell script line endings to LF for Windows checkouts.

The full original architecture document is included at
docs/NodeJS_Final_Project_Source_Architecture.md; its SHA-256 matches the original.
No remote push or hosted GitHub Actions run is claimed. Phase 2 remains outside
the implemented scope.
