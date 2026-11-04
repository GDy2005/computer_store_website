COMPUTER STORE - INSTALLATION AND OPERATIONS GUIDE
==================================================

Repository:
  https://github.com/GDy2005/computer_store_website.git

Computer Store is a Docker-based e-commerce system built with a React
frontend, Nginx, a Node.js API Gateway, Node.js microservices, MongoDB,
Kafka, Redis, and Elasticsearch. Only Nginx publishes a host port; internal
services communicate through the Docker network.


1. PREREQUISITES
----------------

Required:
  - Git.
  - Docker Desktop running locally.
  - Docker Compose v2 (the command is "docker compose" with a space).
  - Host port 80 must be available unless HTTP_PORT is changed.

Recommended:
  - Allocate at least 8 GB of RAM to Docker because the stack includes Kafka,
    Elasticsearch, MongoDB, and multiple backend services.
  - Node.js 22.12 or newer is only needed for running lint, tests, and builds
    outside Docker.

Verify the required tools:

  git --version
  docker --version
  docker compose version


2. CLONE THE REPOSITORY
-----------------------

  git clone https://github.com/GDy2005/computer_store_website.git
  cd computer_store_website/source

Run the Docker and npm commands in this guide from the source/ directory.
Docker Compose reads source/.env when it is started from this directory.


3. CREATE AND CONFIGURE source/.env
-----------------------------------

PowerShell:

  Copy-Item .env.example .env

Windows Command Prompt:

  copy .env.example .env

Linux/macOS:

  cp .env.example .env

Open source/.env and review the groups below. The .env file is ignored by
Git. Never commit passwords, access keys, or provider secrets.


3.1. Required local settings

  HTTP_PORT=80
  NODE_ENV=development
  SERVICE_REPLICAS=2
  FRONTEND_URL=http://localhost
  ADMIN_EMAIL=admin@example.com
  ADMIN_INITIAL_PASSWORD=change-me

Replace INTERNAL_SERVICE_SECRET and SESSION_SECRET with two different random
values. PowerShell can generate one with:

  [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  )

If the machine has limited memory, use:

  SERVICE_REPLICAS=1

The administrator is seeded only when the identity database is initialized.
Changing ADMIN_EMAIL or ADMIN_INITIAL_PASSWORD later does not replace an
administrator that already exists in the MongoDB volume.


3.2. Use a different host port

If port 80 is busy, for example use port 8080:

  HTTP_PORT=8080
  FRONTEND_URL=http://localhost:8080
  GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
  PAYMENT_PUBLIC_BASE_URL=http://localhost:8080

The website will then be available at http://localhost:8080.


3.3. Email delivery

The default configuration does not send real email:

  EMAIL_TRANSPORT=json

To deliver real email through Gmail SMTP:

  EMAIL_TRANSPORT=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-account@gmail.com
  SMTP_PASS=your-google-app-password
  EMAIL_FROM=your-account@gmail.com

SMTP_PASS must be a Google App Password, not the normal Google account
password. Apply changed email settings with:

  docker compose up -d --force-recreate notification-service identity-service

FRONTEND_URL is used in account activation and password-reset emails. A
localhost URL only works on the computer running Docker. Use the public
Cloudflare URL from section 8 if recipients must open the link over the
Internet.


3.4. Google sign-in (optional)

Create an OAuth client at:
  https://console.cloud.google.com/apis/credentials

Local settings:

  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback

Configure the OAuth client with:

  Authorized JavaScript origin:
    http://localhost

  Authorized redirect URI:
    http://localhost/api/v1/auth/google/callback

Apply the settings with:

  docker compose up -d --force-recreate gateway

Leave GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET empty when Google sign-in is
not required.


3.5. Cloudinary uploads (optional)

Cloudinary is only required for uploading product images from the admin UI.
Create an account at:
  https://cloudinary.com/

Set:

  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=

Apply the settings with:

  docker compose up -d --force-recreate catalog-service

The seeded catalog and existing image URLs work without Cloudinary. Only the
protected image-upload endpoint is disabled when these values are empty.


3.6. AI chatbot provider (optional)

The free local fallback does not require an API key:

  AI_PROVIDER=fallback
  OPENAI_API_KEY=
  OPENAI_MODEL=

To enable OpenAI ranking:

  AI_PROVIDER=openai
  OPENAI_API_KEY=your-api-key
  OPENAI_MODEL=your-model-name
  OPENAI_BASE_URL=https://api.openai.com/v1

Apply the settings with:

  docker compose up -d --force-recreate ai-service


4. START THE FULL STACK
-----------------------

Make sure Docker Desktop is running, then run from source/:

  docker compose up -d

The first startup may take several minutes because Docker downloads images,
builds the application, seeds data, creates Kafka topics, and builds the
Elasticsearch product index.

The mongo-init, kafka-init, identity-seed, catalog-seed, order-seed, and
search-reindex containers run once and then show Exited (0). This means they
completed successfully; it is not a broken-container state.

Inspect the stack:

  docker compose ps -a
  docker compose logs --tail=100 nginx gateway identity-service catalog-service order-service

Gateway readiness endpoint:

  http://localhost/health/ready


5. WEBSITE AND API ADDRESSES
----------------------------

With HTTP_PORT=80:

  Home:                       http://localhost
  Product catalog:            http://localhost/products
  Shopping cart:              http://localhost/cart
  Checkout:                   http://localhost/checkout
  Customer profile:           http://localhost/profile
  Customer orders:            http://localhost/orders
  Admin dashboard:            http://localhost/admin
  Gateway readiness:          http://localhost/health/ready
  Products API:               http://localhost/api/v1/products?page=1&limit=12
  Search API:                 http://localhost/api/v1/search?search=gaming&page=1&limit=12

Sign in to the admin dashboard with the ADMIN_EMAIL and
ADMIN_INITIAL_PASSWORD configured before the first database initialization.

MongoDB, Kafka, Redis, and Elasticsearch are internal Docker services and do
not publish ports directly to the host.


6. STOP, RESTART, AND REBUILD
-----------------------------

Stop containers while retaining all data:

  docker compose down

Start again:

  docker compose up -d

Rebuild after changing source code:

  docker compose up -d --build

WARNING: The following command permanently deletes MongoDB, Kafka, Redis, and
Elasticsearch volumes:

  docker compose down -v

Only use down -v when intentionally recreating all local data from scratch.


7. RUN QUALITY CHECKS (OPTIONAL)
--------------------------------

Node.js 22.12 or newer is required:

  npm ci --ignore-scripts
  npm run lint
  npm test
  npm run build
  npm run smoke


8. ENABLE VNPay SANDBOX WITH CLOUDFLARE TUNNEL (OPTIONAL)
---------------------------------------------------------

Skip this section when only Cash on Delivery is needed. VNPay requires a
public HTTPS URL to return the browser to the store and to send server-to-
server payment notifications to the order service.


8.1. Start the local website

  docker compose up -d

Confirm that http://localhost is available before creating the tunnel.


8.2. Install cloudflared on Windows

  winget install --id Cloudflare.cloudflared --exact

Close and reopen the terminal, then verify:

  cloudflared --version

If Windows installed cloudflared but PATH has not updated, run:

  & "C:\Program Files (x86)\cloudflared\cloudflared.exe" --version

Official resources:
  https://developers.cloudflare.com/tunnel/downloads/
  https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
  https://github.com/cloudflare/cloudflared/releases


8.3. Create a Quick Tunnel

For HTTP_PORT=80:

  cloudflared tunnel --url http://localhost:80

Or call the executable directly:

  & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80

Use http://localhost:8080 instead when HTTP_PORT=8080.

Cloudflare prints a URL similar to:

  https://random-name.trycloudflare.com

Keep the cloudflared terminal open throughout the test. Quick Tunnel does not
require purchasing a domain, but its URL may change after it is restarted.


8.4. Update source/.env

Replace YOUR-TUNNEL with the hostname Cloudflare generated. Do not append a
trailing slash:

  FRONTEND_URL=https://YOUR-TUNNEL.trycloudflare.com
  PAYMENT_PUBLIC_BASE_URL=https://YOUR-TUNNEL.trycloudflare.com
  GOOGLE_CALLBACK_URL=https://YOUR-TUNNEL.trycloudflare.com/api/v1/auth/google/callback

If Google sign-in is disabled, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET can
remain empty.

FRONTEND_URL controls activation and password-reset email links.
PAYMENT_PUBLIC_BASE_URL controls the VNPay Return and IPN callback URLs.


8.5. Register a VNPay Sandbox merchant

Register at:
  https://sandbox.vnpayment.vn/devreg

Suggested values:

  Website name: Computer Store Sandbox
  Website URL:  https://YOUR-TUNNEL.trycloudflare.com

VNPay sends the sandbox connection details to the registered email. Add them
to source/.env:

  VNPAY_TMN_CODE=terminal-code-provided-by-vnpay
  VNPAY_HASH_SECRET=hash-secret-provided-by-vnpay
  VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

If VNPay asks for explicit callback addresses, use:

  Return URL:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/return

  IPN URL:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/ipn

Never share or commit VNPAY_HASH_SECRET.


8.6. Apply the VNPay environment settings

If only TmnCode and HashSecret changed and the tunnel URL stayed the same:

  docker compose up -d --force-recreate order-service

If the application changed from localhost to the tunnel URL:

  docker compose up -d --force-recreate identity-service order-service gateway

Open the website through the tunnel URL from the beginning, sign in there,
add a product to the cart, and select VNPay (sandbox) during checkout. Do not
start the browser session on localhost and then switch to the tunnel hostname;
the two hosts have separate browser sessions.

Successful VNPay sandbox card:

  Bank:         NCB
  Card number:  9704198526191432198
  Cardholder:   NGUYEN VAN A
  Issue date:   07/15
  OTP:          123456


8.7. Google OAuth through the tunnel

When Google sign-in is enabled, add the following in Google Cloud Console:

  Authorized JavaScript origin:
    https://YOUR-TUNNEL.trycloudflare.com

  Authorized redirect URI:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/auth/google/callback

Then recreate the Gateway:

  docker compose up -d --force-recreate gateway


8.8. IMPORTANT: when the Quick Tunnel URL changes

Every time Quick Tunnel generates a new URL, repeat all applicable steps:

  1. Update FRONTEND_URL in source/.env.
  2. Update PAYMENT_PUBLIC_BASE_URL in source/.env.
  3. Update GOOGLE_CALLBACK_URL when Google OAuth is enabled.
  4. Update the website/Return/IPN addresses in VNPay when required.
  5. Update the Google origin and redirect URI when Google OAuth is enabled.
  6. Apply the environment again:

       docker compose up -d --force-recreate identity-service order-service gateway

  7. Open the new tunnel URL and sign in again.
  8. Keep the cloudflared terminal running throughout the test.

Emails sent before the URL changed still contain the old link. Request a new
activation or password-reset email after identity-service has been recreated.

For a stable long-term URL, use a named Cloudflare Tunnel with a custom domain
or another tunnel provider with a reserved hostname. Quick Tunnel is intended
for development and testing.


9. COMMON TROUBLESHOOTING
-------------------------

The browser still displays an old frontend build:

  docker compose up -d --build --force-recreate frontend gateway order-service nginx

Then press Ctrl+Shift+R or open a private browser window.

View service logs:

  docker compose logs --tail=200 SERVICE_NAME

Example:

  docker compose logs --tail=200 order-service gateway nginx

Check that the order container received VNPay variables without printing the
secret values:

  docker compose exec -T order-service node -e "for (const k of ['PAYMENT_PUBLIC_BASE_URL','VNPAY_TMN_CODE','VNPAY_HASH_SECRET']) console.log(k, process.env[k] ? 'SET' : 'MISSING')"

Investigate a failed Elasticsearch reindex:

  docker compose logs --tail=200 search-reindex elasticsearch catalog-service

An initialization, seed, or reindex container with Exited (0) completed
normally.


10. SECURITY NOTES
------------------

  - Never commit source/.env.
  - Do not place Google secrets, SMTP App Passwords, Cloudinary API secrets,
    OpenAI API keys, or VNPAY_HASH_SECRET in documentation or screenshots.
  - Quick Tunnel and sandbox provider credentials are for testing only.
  - A production deployment requires a stable domain, HTTPS, rotated secrets,
    monitoring, backups, and provider-approved production credentials.
