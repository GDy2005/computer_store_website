# Computer Store

[![CI](https://github.com/GDy2005/computer_store_website/actions/workflows/ci.yml/badge.svg)](https://github.com/GDy2005/computer_store_website/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

A full-stack computer-store platform built around event-driven Node.js
microservices. The project includes a responsive customer storefront, an
administration dashboard, real-time catalog feedback, loyalty points, grounded
AI product recommendations, and a local simulated-card checkout.

> This repository is intended for development, demonstrations, and academic
> evaluation. Payment integrations use sandbox credentials only.

## Highlights

- Local and Google authentication backed by Redis sessions.
- Account activation, password recovery, addresses, and SMTP notifications.
- Product catalog, variants, inventory, comments, ratings, and Cloudinary upload.
- Elasticsearch search with filters, sorting, and Kafka synchronization.
- Guest/customer carts, coupons, checkout Saga, order history, and loyalty.
- Cash on Delivery and a fixed simulated card for local payment testing.
- Realtime feedback updates through Socket.IO.
- Admin product, category, inventory, user, order, coupon, and analytics tools.
- Search-grounded AI assistant with an offline fallback mode.
- Horizontally scalable backend services and API Gateway.
- Automated lint, tests, frontend build, Docker integration, and CI evidence.

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Material UI |
| Edge | Nginx reverse proxy |
| Gateway | Express, Redis sessions, Socket.IO |
| Services | Node.js microservices using an MVC-oriented structure |
| Primary data | MongoDB replica set |
| Events | Apache Kafka with outbox/idempotent consumers |
| Cache/session | Redis |
| Search | Elasticsearch |
| Media | Cloudinary (optional) |
| AI | Local fallback or OpenAI-compatible API (optional) |
| Payments | Cash on Delivery, fixed simulated card |
| Runtime | Docker Compose |

Only Nginx publishes a host port. Databases, brokers, and application services
remain inside the private Docker network.

## Quick start

### Requirements

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Docker Compose v2
- At least 8 GB of RAM allocated to Docker is recommended

### 1. Clone

```bash
git clone https://github.com/GDy2005/computer_store_website.git
cd computer_store_website/source
```

### 2. Create the environment file

PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

At minimum, review these values in `source/.env`:

```dotenv
HTTP_PORT=80
SERVICE_REPLICAS=2
FRONTEND_URL=http://localhost
INTERNAL_SERVICE_SECRET=replace-with-a-random-secret
SESSION_SECRET=replace-with-another-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=change-me
DEMO_CUSTOMER_EMAIL=customer@example.com
DEMO_CUSTOMER_PASSWORD=Customer@123
AI_PROVIDER=fallback
EMAIL_TRANSPORT=json
```

Use `SERVICE_REPLICAS=1` on a machine with limited memory. The administrator is
seeded only during the first identity-database initialization.

### 3. Start

```bash
docker compose up -d
```

The first run downloads/builds images, initializes MongoDB and Kafka, seeds the
demo catalog, coupons, and 45 demo orders, and creates the Elasticsearch index.
The order events are published through Kafka and automatically build the
Analytics dashboard. One-shot containers ending with `Exited (0)` completed
successfully. Demo orders are added once even if the database has a few real
orders; later restarts do not duplicate them.

### 4. Open

| Page | URL |
| --- | --- |
| Storefront | <http://localhost> |
| Products | <http://localhost/products> |
| Cart | <http://localhost/cart> |
| Checkout | <http://localhost/checkout> |
| Customer orders | <http://localhost/orders> |
| Admin dashboard | <http://localhost/admin> |
| Gateway readiness | <http://localhost/health/ready> |
| Products API | <http://localhost/api/v1/products?page=1&limit=12> |
| Search API | <http://localhost/api/v1/search?search=gaming&page=1&limit=12> |

If `HTTP_PORT=8080`, replace `http://localhost` with
`http://localhost:8080` in local URLs and callback settings.

### Demo customer account

Use the seeded customer to test the complete customer journey:

| Field | Value |
| --- | --- |
| Email | `customer@example.com` |
| Password | `Customer@123` |
| Profile | Active customer with avatar and phone number |
| Addresses | Home (default) and office |
| Orders | Six orders across confirmed, shipping, delivered, and cancelled states |
| Loyalty | Points earned from the seeded delivered orders |

The seed is idempotent: restarting it does not duplicate orders or award the
same loyalty points twice. Override `DEMO_CUSTOMER_EMAIL` and
`DEMO_CUSTOMER_PASSWORD` in `source/.env` if different demo credentials are
needed before the first seed run.

## Environment integrations

All integrations below are optional. The core storefront runs with their keys
left empty.

<details>
<summary><strong>Real email delivery with Gmail SMTP</strong></summary>

Use a Google App Password, not the normal account password:

```dotenv
EMAIL_TRANSPORT=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-google-app-password
EMAIL_FROM=your-account@gmail.com
```

Apply the change:

```bash
docker compose up -d --force-recreate notification-service identity-service
```

`FRONTEND_URL` controls links embedded in activation and password-reset emails.

</details>

<details>
<summary><strong>Google OAuth</strong></summary>

Create a Web OAuth Client in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials):

```dotenv
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback
```

Add the following to the OAuth Client:

- Authorized JavaScript origin: `http://localhost`
- Authorized redirect URI: `http://localhost/api/v1/auth/google/callback`

Apply the change:

```bash
docker compose up -d --force-recreate gateway
```

</details>

<details>
<summary><strong>Cloudinary product image upload</strong></summary>

Create an account at [Cloudinary](https://cloudinary.com/) and configure:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Apply the change:

```bash
docker compose up -d --force-recreate catalog-service
```

Existing seeded image URLs continue to work without Cloudinary.

</details>

<details>
<summary><strong>OpenAI-compatible provider</strong></summary>

The default fallback mode needs no API key:

```dotenv
AI_PROVIDER=fallback
OPENAI_API_KEY=
OPENAI_MODEL=
```

To enable an OpenAI-compatible provider:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=your-model-name
OPENAI_BASE_URL=https://api.openai.com/v1
```

Apply the change:

```bash
docker compose up -d --force-recreate ai-service
```

</details>

## Test the simulated card checkout

No public domain, tunnel, provider account, or payment credential is required.
Start the website on localhost, add a product to the cart, and select
**Simulated card payment** at checkout.

Use this exact test card:

| Field | Value |
| --- | --- |
| Cardholder name | `NGUYEN VAN A` |
| Card number | `4242 4242 4242 4242` |
| Expiry date | `12/30` |
| CVV | `123` |

The interface displays a short authorization loading state. The backend only
accepts the values above and then marks the simulated transaction as paid.
Incorrect values are declined. The card number and CVV are never stored in the
order. Do not enter real card information. Cash on Delivery remains available.

## Useful commands

```bash
# Show all containers, including completed one-shot jobs
docker compose ps -a

# Tail selected services
docker compose logs --tail=200 order-service gateway nginx

# Stop while retaining data
docker compose down

# Rebuild after source changes
docker compose up -d --build

# Run local quality checks (Node.js 22.12+)
npm ci --ignore-scripts
npm run lint
npm test
npm run build
npm run smoke
```

> **Data-loss warning:** `docker compose down -v` permanently deletes the
> MongoDB, Kafka, Redis, and Elasticsearch volumes.

## Troubleshooting

### Old frontend is still displayed

```bash
docker compose up -d --build --force-recreate frontend gateway order-service nginx
```

Then hard-refresh with `Ctrl+Shift+R` or open a private browser window.

### Search reindex failed

```bash
docker compose logs --tail=200 search-reindex elasticsearch catalog-service
```

## Data and security

- Named volumes persist MongoDB, Kafka, Redis, and Elasticsearch data.
- `source/.env` is ignored by Git; only `.env.example` should be committed.
- Never publish OAuth secrets, SMTP App Passwords, Cloudinary secrets, or
  OpenAI API keys.
- The fixed card is test data only. This project does not process real cards.

For the complete plain-text operations guide, see [README.txt](README.txt).
Additional project evidence and submission notes are under
[`Bonus`](Bonus/README.md).
