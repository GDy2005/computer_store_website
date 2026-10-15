COMPUTER STORE — PHASE 1 TO PHASE 3

Architecture: React frontend, Nginx, two API Gateway replicas, six Node.js
microservices, Kafka, MongoDB replica set, Redis and Elasticsearch.
Run npm and Docker commands from this source/ directory. The Git repository
root is the parent project/ directory.

RUN
  docker compose up -d --build

Then open:
  http://localhost
  http://localhost/products
  http://localhost/products/steelseries-apex-pro-tkl-gen-3
  http://localhost/api/v1/products?page=1&limit=12
  http://localhost/api/v1/search?search=gaming&page=1&limit=12

The startup graph runs the idempotent catalog seed and Elasticsearch reindex
jobs before Search Service and the gateways become ready. The seed currently
contains 5 categories and 40 products. Kafka topic initialization can take a
few minutes on the first start.

VERIFY (Node >= 22.12)
  npm ci --ignore-scripts
  npm run lint
  npm test
  npm run build
  npm run smoke

Useful Docker checks:
  docker compose ps -a
  docker compose logs catalog-service search-service search-reindex
  docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count

PHASE STATUS
  Phase 1: infrastructure, service runtime, contracts, Kafka reliability.
  Phase 2: local/Google auth, Redis sessions, profile, addresses, password flows,
           notification email jobs and authentication frontend screens.
  Phase 3: category/product/comment/rating backend, 40-product seed, inventory
           consumer, landing/catalog/detail UI, filter/sort/pagination and the
           Elasticsearch Search Service synchronized through Kafka.
  Phase 4: cart, coupon, checkout and order Saga are the next implementation.

The current product images are placeholders. Replace the image URLs/publicIds
in services/catalog-service/src/seeds/data/products.json or use the protected
Cloudinary upload API after configuring credentials. Real Google OAuth and SMTP
delivery also require local credentials in .env.

Read docs/phase-1.md, docs/phase-2.md and docs/phase-3.md for ownership,
commands, API checks and remaining limitations.

PERSISTENCE
MongoDB rs0, Kafka KRaft, Redis AOF and Elasticsearch use named volumes.
Only Nginx publishes a host port. docker compose down retains data; avoid
docker compose down -v unless deleting all local demo data is intentional.

CI
../.github/workflows/ci.yml installs from the lockfile, runs lint/tests/build,
builds containers and runs the Compose integration smoke from source/.
