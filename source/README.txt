COMPUTER STORE — FINAL PROJECT

Architecture: React frontend, Nginx, two API Gateway replicas, two replicas of
each of seven Node.js microservices, Kafka, MongoDB replica set, Redis and
Elasticsearch.
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
  - SERVICE_REPLICAS defaults to 2 and controls every backend service and the
    API Gateway. Infrastructure and one-shot initialization jobs stay single.
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
  - The AI chatbot works locally with AI_PROVIDER=fallback and needs no
    API key. To enable provider ranking, set AI_PROVIDER=openai together with
    OPENAI_API_KEY and OPENAI_MODEL. Product facts still come from Search.

Docker Compose reads source/.env automatically when run from source/.
The .env file is ignored by Git; keep credentials local and commit only
the .env.example template when documenting new environment variables.

RUN
  docker compose up -d

This is the only command required to build missing images and start the full
application. Initialization, seed and reindex jobs finish with `Exited (0)`;
this is expected and does not indicate a failure.

Then open:
  http://localhost
  http://localhost/products
  http://localhost/products/steelseries-apex-pro-tkl-gen-3
  http://localhost/cart
  http://localhost/checkout
  http://localhost/admin
  http://localhost/api/v1/products?page=1&limit=12
  http://localhost/api/v1/search?search=gaming&page=1&limit=12

Open any customer page and select "Tư vấn AI" in the lower-right corner.

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
  npm run customer-orders:integration
  npm run feedback:integration
  npm run admin:integration
  npm run ai:integration
  npm run system:integration

Useful Docker checks:
  docker compose ps -a
  docker compose logs catalog-service search-service search-reindex
  docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count

FEATURE STATUS
  Infrastructure: service runtime, contracts, Kafka reliability and Docker.
  Authentication: local/Google auth, Redis sessions, profile, addresses,
                  password flows and notification email jobs.
  Catalog/Search: product data, inventory, landing/catalog/detail UI,
                  filter/sort/pagination and Elasticsearch synchronization.
  Cart/Checkout: guest/user cart, coupons, guest resolution, Kafka inventory
                 Saga, order confirmation email and responsive UI.
  Customer orders: history/detail, status history, guest activation and
                   loyalty ledger/redeem/earn.
  Feedback: guest comments, authenticated ratings, cached averages and
            Kafka-to-Socket.IO realtime updates.
  Administration: product/category/inventory, users, orders, coupons,
                  analytics projections and responsive dashboards.
  AI: stateless chatbot, Vietnamese need extraction, Search-grounded
      recommendations, verified links, fallback and privacy guardrails.
  Scaling/QA: two replicas of every backend service and Gateway, Docker DNS,
              Kafka consumer groups, Redis adapter and automated CI evidence.

The current product images are placeholders. Replace the image URLs/publicIds
in services/catalog-service/src/seeds/data/products.json or use the protected
Cloudinary upload API after configuring credentials. Real Google OAuth and SMTP
delivery also require local credentials in .env.

Read the files in docs/ for ownership, commands, API checks and limitations.

DEMO ANALYTICS
The normal startup already seeds the admin, coupons, five categories and forty
products. To replace only Analytics read models with deterministic dashboard
fixtures, run `npm run seed:demo:analytics`. This intentionally resets only
analytics_db projections; do not run it when preserving real dashboard totals.

PERSISTENCE
MongoDB rs0, Kafka KRaft, Redis AOF and Elasticsearch use named volumes.
Only Nginx publishes a host port. docker compose down retains data; avoid
docker compose down -v unless deleting all local demo data is intentional.

CI
../.github/workflows/ci.yml installs from the lockfile, runs lint/tests/build,
builds containers, runs the system integrations and uploads a sanitized
`ci-evidence` artifact. See Bonus/README.md for the submission checklist.
