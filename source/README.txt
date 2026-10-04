COMPUTER STORE — PHASE 1 FOUNDATION

Architecture: API Gateway + five independently deployed microservices + Kafka.
Phase 1 accepted locally on 2026-10-03: Compose startup, 12 healthy containers,
2 successful init jobs, real Kafka smoke and event integration checks passed.
Source repository root: this source/ directory. Initialize Git here when ready;
the GitHub Actions workflow assumes source/ is the checkout root.
The full architecture specification is included unchanged at
docs/NodeJS_Final_Project_Source_Architecture.md for a standalone checkout.

RUN
  docker compose up -d
Then open http://localhost and http://localhost/foundation.
The parent directory also has a forwarding Compose file for the same command.
No .env file, host Node installation or manual initialization is required.
Verified images: Kafka 3.9.2, MongoDB 7.0.26, Redis 7.4-bookworm,
Nginx 1.28-bookworm. This avoids the damaged images from the interrupted run.
Demo secrets have non-sensitive local defaults. Override before production.
Kafka topic initialization creates 48 topics and can take several minutes.

VERIFY (Node 22.12+)
  npm ci --ignore-scripts
  npm run lint
  npm test
  npm run build
  npm run smoke
Or use scripts/verify-compose.ps1 on Windows after installing dependencies.
Additional real broker/database checks:
  docker compose exec -T identity-service node scripts/event-integration.js
For another HTTP port set HTTP_PORT in source/.env and APP_BASE_URL for smoke.

INSPECT
  docker compose ps -a
  docker compose logs identity-service catalog-service order-service notification-service analytics-service
  docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
  docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --list
  docker compose exec mongo mongosh --quiet --eval "rs.status()"

Probe endpoints use /api/v1/foundation/{identity|catalog|order|notification|analytics}.
POST /probes accepts {"message":"hello","mode":"normal|retry|poison"}.
GET /probes/{probeId} reads the local effect. GET /api/v1/foundation/status
reads each service over signed internal HTTP, never another service's database.
Probes are demo tools: set FOUNDATION_PROBES_ENABLED=false outside development.

PHASE BOUNDARY
No registration/login, products, checkout, email delivery, dashboard business
projections, Elasticsearch or AI functionality is implemented yet. Domain topics
and draft v1 schemas are foundations for their respective later phases.
The real Kafka probe proves local transaction + outbox + independent consumers.
Read docs/phase-1.md for ownership, contracts, checks and limitations.

PERSISTENCE
MongoDB rs0, Kafka KRaft and Redis AOF each use a named volume.
Only Nginx publishes a host port; service/database ports stay on Compose network.
docker compose down retains data. Avoid down -v unless deleting demo data is intended.

CI
The included workflow installs from lockfile, runs lint/contracts/unit tests,
builds frontend and containers, then runs the real Compose integration smoke.
A workflow file alone is not evidence of a successful hosted GitHub Actions run.

GIT
Use source/ as the Git repository root so .github/workflows/ci.yml is discovered.
From C:\nodejs_finalterm\source:
  git init -b main
  git add .
  git status --short
  git commit -m "Implement Phase 1 microservices foundation"
Then add your repository URL as origin and push main.
Commit package-lock.json, .env.example, .gitattributes and source files.
node_modules, dist, logs and real .env variants are ignored.
