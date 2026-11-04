# Computer Store

[![CI](https://github.com/GDy2005/computer_store_website/actions/workflows/ci.yml/badge.svg)](https://github.com/GDy2005/computer_store_website/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

A full-stack computer-store platform built around event-driven Node.js
microservices. The project includes a responsive customer storefront, an
administration dashboard, real-time catalog feedback, loyalty points, grounded
AI product recommendations, and optional VNPay sandbox checkout.

> This repository is intended for development, demonstrations, and academic
> evaluation. Payment integrations use sandbox credentials only.

## Highlights

- Local and Google authentication backed by Redis sessions.
- Account activation, password recovery, addresses, and SMTP notifications.
- Product catalog, variants, inventory, comments, ratings, and Cloudinary upload.
- Elasticsearch search with filters, sorting, and Kafka synchronization.
- Guest/customer carts, coupons, checkout Saga, order history, and loyalty.
- Cash on Delivery and optional VNPay sandbox payment.
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
| Payments | VNPay Sandbox (optional) |
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
demo catalog, and creates the Elasticsearch index. One-shot containers ending
with `Exited (0)` completed successfully.

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

## Optional VNPay sandbox checkout

Cash on Delivery works without public hosting. VNPay needs a public HTTPS
callback, which can be supplied locally with a Cloudflare Quick Tunnel.

### 1. Install cloudflared

```powershell
winget install --id Cloudflare.cloudflared --exact
cloudflared --version
```

If the executable is installed but not available on `PATH`:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" --version
```

References: [cloudflared downloads](https://developers.cloudflare.com/tunnel/downloads/),
[Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

### 2. Start the tunnel

Keep the website running, then open a second terminal:

```powershell
cloudflared tunnel --url http://localhost:80
```

Cloudflare prints a hostname similar to
`https://YOUR-TUNNEL.trycloudflare.com`. Keep this terminal open.

### 3. Configure the public origin

```dotenv
FRONTEND_URL=https://YOUR-TUNNEL.trycloudflare.com
PAYMENT_PUBLIC_BASE_URL=https://YOUR-TUNNEL.trycloudflare.com
GOOGLE_CALLBACK_URL=https://YOUR-TUNNEL.trycloudflare.com/api/v1/auth/google/callback
```

### 4. Register VNPay sandbox

Register at [VNPay Sandbox](https://sandbox.vnpayment.vn/devreg) with the
tunnel URL as the website URL, then configure the credentials supplied by
VNPay:

```dotenv
VNPAY_TMN_CODE=terminal-code-provided-by-vnpay
VNPAY_HASH_SECRET=hash-secret-provided-by-vnpay
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Callback URLs:

```text
Return: https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/return
IPN:    https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/ipn
```

Apply the environment:

```bash
docker compose up -d --force-recreate identity-service order-service gateway
```

Open the tunnel URL, sign in on that hostname, and complete checkout with
`VNPay (sandbox)`.

Sandbox success card:

| Field | Value |
| --- | --- |
| Bank | NCB |
| Card number | `9704198526191432198` |
| Cardholder | `NGUYEN VAN A` |
| Issue date | `07/15` |
| OTP | `123456` |

### When the Quick Tunnel hostname changes

Quick Tunnel hostnames may change after restart. When that happens:

1. Update `FRONTEND_URL` and `PAYMENT_PUBLIC_BASE_URL`.
2. Update `GOOGLE_CALLBACK_URL` if Google OAuth is enabled.
3. Update the VNPay website, Return URL, and IPN URL when required.
4. Update the Google origin and redirect URI when Google OAuth is enabled.
5. Recreate the services:

   ```bash
   docker compose up -d --force-recreate identity-service order-service gateway
   ```

6. Open the new hostname and sign in again.
7. Request new activation/reset emails because old messages contain the old URL.

For a stable public hostname, use a named Cloudflare Tunnel with a custom
domain. Quick Tunnel is suitable for testing only.

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

### Verify VNPay variables without printing secrets

```bash
docker compose exec -T order-service node -e "for (const k of ['PAYMENT_PUBLIC_BASE_URL','VNPAY_TMN_CODE','VNPAY_HASH_SECRET']) console.log(k, process.env[k] ? 'SET' : 'MISSING')"
```

## Data and security

- Named volumes persist MongoDB, Kafka, Redis, and Elasticsearch data.
- `source/.env` is ignored by Git; only `.env.example` should be committed.
- Never publish OAuth secrets, SMTP App Passwords, Cloudinary secrets,
  OpenAI API keys, or `VNPAY_HASH_SECRET`.
- Sandbox and Quick Tunnel credentials must not be used as production setup.

For the complete plain-text operations guide, see [README.txt](README.txt).
Additional project evidence and submission notes are under
[`Bonus`](Bonus/README.md).
