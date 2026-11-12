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
  DEMO_CUSTOMER_EMAIL=customer@example.com
  DEMO_CUSTOMER_PASSWORD=Customer@123

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

The automatic seed also creates a complete customer test account:

  Email:     customer@example.com
  Password:  Customer@123

This customer has a phone number, two delivery addresses, six sample orders in
multiple states, and Loyalty points earned from delivered orders. The seed can
be rerun safely without duplicating the same orders or points. Set
DEMO_CUSTOMER_EMAIL and DEMO_CUSTOMER_PASSWORD before the first seed run to use
different demo credentials.


3.2. Use a different host port

If port 80 is busy, for example use port 8080:

  HTTP_PORT=8080
  FRONTEND_URL=http://localhost:8080
  GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback

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
localhost URL only works on the computer running Docker, which is sufficient
for this local project.


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
completed successfully; it is not a broken-container state. order-seed creates
coupons and adds 45 demo orders if they do not already exist. Their Outbox
events are published through Kafka and automatically populate Analytics, so
later restarts neither duplicate orders nor overwrite existing statistics.

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

5.1. Demo login accounts

Customer account:

  Email:                       customer@example.com
  Password:                    Customer@123
  Role:                        CUSTOMER
  Prepared delivery addresses: Home (default) and Office
  Prepared order history:      6 orders in multiple statuses
  Loyalty points:              Earned from seeded delivered orders

Use this account to test the customer profile, address management, product
catalog, cart, checkout, order history, and Loyalty features.

Administrator account:

  Email:     admin@example.com
  Password:  change-me
  Role:      ADMIN

The values above are the defaults. If DEMO_CUSTOMER_EMAIL,
DEMO_CUSTOMER_PASSWORD, ADMIN_EMAIL, or ADMIN_INITIAL_PASSWORD were changed in
source/.env before the first seed run, sign in with those configured values.

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


8. TEST THE SIMULATED CARD PAYMENT
----------------------------------

No public domain, tunnel, provider account, or extra environment variable is
required. Start the website normally:

  docker compose up -d

Open http://localhost, add a product to the cart, proceed to checkout, and
select "Simulated card payment".

Use this exact test card:

  Cardholder name:  NGUYEN VAN A
  Card number:      4242 4242 4242 4242
  Expiry date:      12/30
  CVV:              123

After submission, the interface shows a short loading state while the backend
validates the fixed card. Correct values produce a simulated paid transaction.
Any different value is declined. The order stores only the payment status and
a generated transaction reference; the card number and CVV are never stored.

This is a local demonstration only. Never enter real card information. Cash
on Delivery remains available.


9. COMMON TROUBLESHOOTING
-------------------------

The browser still displays an old frontend build:

  docker compose up -d --build --force-recreate frontend gateway order-service nginx

Then press Ctrl+Shift+R or open a private browser window.

View service logs:

  docker compose logs --tail=200 SERVICE_NAME

Example:

  docker compose logs --tail=200 order-service gateway nginx

Investigate a failed Elasticsearch reindex:

  docker compose logs --tail=200 search-reindex elasticsearch catalog-service

An initialization, seed, or reindex container with Exited (0) completed
normally.


10. SECURITY NOTES
------------------

  - Never commit source/.env.
  - Do not place Google secrets, SMTP App Passwords, Cloudinary API secrets,
    or OpenAI API keys in documentation or screenshots.
  - The fixed simulated card is test data only. Never enter a real card.
  - A production deployment requires a stable domain, HTTPS, rotated secrets,
    monitoring, backups, and provider-approved production credentials.
