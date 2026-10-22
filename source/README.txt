COMPUTER STORE — PHASE 1 TO PHASE 6

Architecture: React frontend, Nginx, two API Gateway replicas, six Node.js
microservices, Kafka, MongoDB replica set, Redis and Elasticsearch.
Run npm and Docker commands from this source/ directory. The Git repository
root is the parent project/ directory.

ENVIRONMENT SETUP
Before the first run, create source/.env from the example. Run one of the
following commands from source/ only if .env does not already exist:

  Windows CMD:  copy .env.example .env
  PowerShell:   Copy-Item .env.example .env
  Linux/macOS:  cp .env.example .env

Edit .env for your local setup:
  - Set INTERNAL_SERVICE_SECRET and SESSION_SECRET to separate random values.
  - Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD before the first startup;
    these credentials are used to create the initial admin account.
  - HTTP_PORT defaults to 80. If you change it (for example, to 8080), update
    FRONTEND_URL to http://localhost:8080 and GOOGLE_CALLBACK_URL to
    http://localhost:8080/api/v1/auth/google/callback, and use that port in
    the browser URLs below.
  - Google sign-in requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
  - EMAIL_TRANSPORT=json is suitable for local testing without SMTP delivery.
    To send real email, set EMAIL_TRANSPORT=smtp and configure SMTP_HOST,
    SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM.
  - Cloudinary uploads require CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
    CLOUDINARY_API_SECRET. Leave optional credentials blank when not in use.

Docker Compose reads source/.env automatically when run from source/.
The .env file is ignored by Git; keep credentials local and commit only
the .env.example template when documenting new environment variables.

RUN
  docker compose up -d --build

Then open:
  http://localhost
  http://localhost/products
  http://localhost/products/steelseries-apex-pro-tkl-gen-3
  http://localhost/cart
  http://localhost/checkout
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
  npm run auth:integration
  npm run notification:integration
  npm run order:integration
  npm run phase5:integration
  npm run phase6:integration

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
  Phase 4: guest/user cart, coupon, checkout, guest account resolution,
           Kafka inventory Saga, order confirmation email and responsive UI.
  Phase 5: customer order history/detail, status history, guest activation,
           loyalty ledger/redeem/earn and order/loyalty events.
  Phase 6: guest/user comments, authenticated rating, cached average rating,
           Kafka-to-Socket.IO realtime updates and responsive feedback UI.

The current product images are placeholders. Replace the image URLs/publicIds
in services/catalog-service/src/seeds/data/products.json or use the protected
Cloudinary upload API after configuring credentials. Real Google OAuth and SMTP
delivery also require local credentials in .env.

Read docs/phase-1.md through docs/phase-6.md for ownership,
commands, API checks and remaining limitations.

PERSISTENCE
MongoDB rs0, Kafka KRaft, Redis AOF and Elasticsearch use named volumes.
Only Nginx publishes a host port. docker compose down retains data; avoid
docker compose down -v unless deleting all local demo data is intentional.

CI
../.github/workflows/ci.yml installs from the lockfile, runs lint/tests/build,
builds containers and runs the Compose integration smoke from source/.
