COMPUTER STORE - INSTALLATION AND OPERATIONS GUIDE
==================================================

ENGLISH VERSION
===============

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

IMPORTANT - COMPLETE FEATURE CONFIGURATION:

  To use and verify every website feature, you must configure every external
  integration described in Sections 3.3 through 3.6: Gmail SMTP, Google OAuth,
  Cloudinary, and an OpenAI-compatible AI provider. The application can still
  start with its JSON-email, seeded-image, and rule-based AI fallbacks, but
  those fallbacks do not demonstrate real email delivery, Google sign-in,
  media upload, or external AI responses.

  Therefore, an empty provider value is acceptable only for limited local
  development. It is not considered a complete project setup.


3.1. Required local settings

  HTTP_PORT=80
  NODE_ENV=development
  SERVICE_REPLICAS=2
  FRONTEND_URL=http://localhost
  CORS_ALLOWED_ORIGINS=http://localhost
  ADMIN_EMAIL=admin@example.com
  ADMIN_INITIAL_PASSWORD=change-me
  DEMO_CUSTOMER_ID=64b000000000000000000001
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
  CORS_ALLOWED_ORIGINS=http://localhost:8080
  GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback

The website will then be available at http://localhost:8080.


3.3. Email delivery (required for complete functionality)

The fallback below only writes email content to service logs and does not send
real messages:

  EMAIL_TRANSPORT=json

For complete functionality, configure Gmail SMTP:

  EMAIL_TRANSPORT=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-account@gmail.com
  SMTP_PASS=your-google-app-password
  EMAIL_FROM=your-account@gmail.com

SMTP_PASS must be a Google App Password, not the normal Google account
password. Enable two-step verification on the Google account, create an App
Password at https://myaccount.google.com/apppasswords, and use the generated
16-character value as SMTP_PASS. Apply changed email settings with:

  docker compose up -d --force-recreate notification-service identity-service

FRONTEND_URL is used in account activation and password-reset emails. A
localhost URL only works on the computer running Docker, which is sufficient
for this local project.


3.4. Google sign-in (required for complete functionality)

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

Empty GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET values disable Google sign-in.
Do not leave them empty when testing the complete website.


3.5. Cloudinary uploads (required for complete functionality)

Cloudinary stores uploaded customer avatars and product images from the admin
UI.
Create an account at:
  https://cloudinary.com/

Set:

  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=

Apply the settings with:

  docker compose up -d --force-recreate identity-service catalog-service

The seeded catalog and existing remote image URLs still display without
Cloudinary, but avatar and product-image uploads are unavailable. Empty values
are therefore only a fallback, not a complete setup.


3.6. AI chatbot provider (required for complete functionality)

The local rule-based fallback does not require an API key, but it does not
demonstrate external AI-provider integration:

  AI_PROVIDER=fallback
  OPENAI_API_KEY=
  OPENAI_MODEL=

For complete functionality, configure an OpenAI-compatible provider:

  AI_PROVIDER=openai
  OPENAI_API_KEY=your-api-key
  OPENAI_MODEL=your-model-name
  OPENAI_BASE_URL=https://api.openai.com/v1

Apply the settings with:

  docker compose up -d --force-recreate ai-service

Use a model supported by the configured account and base URL. Keep
OPENAI_BASE_URL=https://api.openai.com/v1 when using the official OpenAI API.
The API key must never be committed to Git.


3.7. Complete source/.env checklist

Before starting the complete website, verify that none of the provider values
below are blank and that the active modes are smtp and openai:

  EMAIL_TRANSPORT=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-account@gmail.com
  SMTP_PASS=your-google-app-password
  EMAIL_FROM=your-account@gmail.com

  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback

  CLOUDINARY_CLOUD_NAME=your-cloud-name
  CLOUDINARY_API_KEY=your-api-key
  CLOUDINARY_API_SECRET=your-api-secret

  AI_PROVIDER=openai
  OPENAI_API_KEY=your-api-key
  OPENAI_MODEL=your-supported-model
  OPENAI_BASE_URL=https://api.openai.com/v1
  AI_PROVIDER_TIMEOUT_MS=8000

Keep the internal Elasticsearch defaults unless the corresponding Compose
service or index name is intentionally changed:

  ELASTICSEARCH_URL=http://elasticsearch:9200
  ELASTICSEARCH_PRODUCT_INDEX=products_v1

Also set unique non-default values for:

  INTERNAL_SERVICE_SECRET=
  SESSION_SECRET=

After changing multiple environment groups, recreate the complete stack so
every container receives the new values:

  docker compose up -d --build --force-recreate


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


BONUS FEATURES - 2.0 POINTS CLAIMED
-----------------------------------

1. GitHub Actions CI/CD pipeline.
2. Microservices architecture with Kafka-based asynchronous communication.
3. Search-grounded AI product assistant.
4. Elasticsearch-powered product search.

Implementation references and the runtime-evidence checklist are available in:
  Bonus/README.md
  Bonus/evidence/README.md


==========================================================================
PHIÊN BẢN TIẾNG VIỆT
==========================================================================

COMPUTER STORE - HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH
================================================

Kho mã nguồn:
  https://github.com/GDy2005/computer_store_website.git

Computer Store là hệ thống thương mại điện tử chạy bằng Docker, gồm React,
Nginx, Node.js API Gateway, các Node.js microservice, MongoDB, Kafka, Redis và
Elasticsearch. Chỉ Nginx công khai cổng ra máy host; các service còn lại liên
lạc qua mạng nội bộ Docker.


1. YÊU CẦU TRƯỚC KHI CÀI ĐẶT
----------------------------

Bắt buộc:
  - Git.
  - Docker Desktop đang chạy.
  - Docker Compose v2, sử dụng lệnh "docker compose".
  - Cổng 80 đang trống, hoặc đổi HTTP_PORT sang cổng khác.

Khuyến nghị:
  - Cấp ít nhất 8 GB RAM cho Docker.
  - Chỉ cần Node.js 22.12 trở lên nếu chạy lint, test và build ngoài Docker.
  - Chuẩn bị tài khoản Google, Cloudinary và nhà cung cấp AI để bật đầy đủ
    tính năng bên ngoài.

Kiểm tra công cụ:

  git --version
  docker --version
  docker compose version


2. CLONE DỰ ÁN
--------------

  git clone https://github.com/GDy2005/computer_store_website.git
  cd computer_store_website/source

Thực hiện các lệnh Docker và npm trong tài liệu này tại thư mục source/.
Docker Compose sẽ tự đọc source/.env khi chạy từ thư mục đó.


3. TẠO VÀ CẤU HÌNH source/.env
------------------------------

PowerShell:

  Copy-Item .env.example .env

Command Prompt:

  copy .env.example .env

Linux/macOS:

  cp .env.example .env

Mở source/.env và cấu hình theo các mục bên dưới. File .env đã được Git bỏ
qua. Tuyệt đối không commit mật khẩu, API key hoặc provider secret.

QUAN TRỌNG - CẤU HÌNH ĐẦY ĐỦ TÍNH NĂNG:

  Muốn sử dụng và kiểm thử toàn bộ tính năng website, bắt buộc phải cấu hình
  đầy đủ Gmail SMTP, Google OAuth, Cloudinary và nhà cung cấp AI tương thích
  OpenAI ở Mục 3.3 đến 3.6.

  Hệ thống vẫn có thể khởi động khi thiếu các giá trị này nhờ fallback: email
  được ghi dưới dạng JSON, ảnh seed vẫn hiển thị và chatbot dùng luật cục bộ.
  Tuy nhiên fallback không chứng minh được gửi email thật, đăng nhập Google,
  upload ảnh hoặc phản hồi từ AI bên ngoài. Vì vậy để trống các biến provider
  chỉ phù hợp cho phát triển cục bộ giới hạn, không phải cấu hình hoàn chỉnh.


3.1. Cấu hình cục bộ cơ bản

  HTTP_PORT=80
  NODE_ENV=development
  INTERNAL_SERVICE_SECRET=chuoi-bi-mat-noi-bo-ngau-nhien
  SESSION_SECRET=chuoi-bi-mat-session-khac
  SESSION_TTL_MINUTES=480
  FOUNDATION_PROBES_ENABLED=true
  SERVICE_REPLICAS=2
  FRONTEND_URL=http://localhost
  CORS_ALLOWED_ORIGINS=http://localhost
  PASSWORD_TOKEN_TTL_MINUTES=30
  ADMIN_EMAIL=admin@example.com
  ADMIN_INITIAL_PASSWORD=change-me
  DEMO_CUSTOMER_ID=64b000000000000000000001
  DEMO_CUSTOMER_EMAIL=customer@example.com
  DEMO_CUSTOMER_PASSWORD=Customer@123

INTERNAL_SERVICE_SECRET và SESSION_SECRET phải là hai giá trị ngẫu nhiên khác
nhau. Tạo một giá trị bằng PowerShell:

  [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  )

Nếu máy ít RAM, có thể đặt:

  SERVICE_REPLICAS=1

Tài khoản quản trị chỉ được seed khi cơ sở dữ liệu Identity khởi tạo. Việc đổi
ADMIN_EMAIL hoặc ADMIN_INITIAL_PASSWORD sau đó không tự thay tài khoản đã có
trong MongoDB volume.


3.2. Dùng cổng khác

Nếu cổng 80 bận, ví dụ dùng 8080:

  HTTP_PORT=8080
  FRONTEND_URL=http://localhost:8080
  CORS_ALLOWED_ORIGINS=http://localhost:8080
  GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback

Khi đó website nằm tại http://localhost:8080. Phải cập nhật cùng cổng trong
Google Cloud Console.


3.3. Gmail SMTP - bắt buộc để gửi email thật

Fallback dưới đây chỉ ghi nội dung email vào log, không gửi email thật:

  EMAIL_TRANSPORT=json

Để sử dụng đầy đủ tính năng kích hoạt tài khoản và quên mật khẩu, cấu hình:

  EMAIL_TRANSPORT=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-account@gmail.com
  SMTP_PASS=your-google-app-password
  EMAIL_FROM=your-account@gmail.com

Bật xác minh hai bước cho tài khoản Google, truy cập
https://myaccount.google.com/apppasswords, tạo App Password và dùng chuỗi được
cấp cho SMTP_PASS. Không dùng mật khẩu Google thông thường.

Áp dụng lại cấu hình email:

  docker compose up -d --force-recreate notification-service identity-service

FRONTEND_URL được chèn vào liên kết kích hoạt và đặt lại mật khẩu. Với dự án
cục bộ, http://localhost chỉ mở được trên máy đang chạy Docker.


3.4. Google OAuth - bắt buộc để kiểm thử đăng nhập Google

Tạo OAuth client tại:
  https://console.cloud.google.com/apis/credentials

Cấu hình source/.env:

  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback

Cấu hình OAuth client trong Google Cloud Console:

  Authorized JavaScript origin:
    http://localhost

  Authorized redirect URI:
    http://localhost/api/v1/auth/google/callback

Nếu dùng cổng khác 80, thêm cổng đó vào cả origin và redirect URI. Áp dụng:

  docker compose up -d --force-recreate gateway

Để trống Client ID hoặc Client Secret sẽ vô hiệu hóa đăng nhập Google.


3.5. Cloudinary - bắt buộc để upload ảnh

Cloudinary lưu avatar khách hàng và ảnh sản phẩm được tải lên từ giao diện
quản trị. Tạo tài khoản tại:
  https://cloudinary.com/

Lấy thông tin trong Cloudinary Dashboard và cấu hình:

  CLOUDINARY_CLOUD_NAME=your-cloud-name
  CLOUDINARY_API_KEY=your-api-key
  CLOUDINARY_API_SECRET=your-api-secret

Áp dụng:

  docker compose up -d --force-recreate identity-service catalog-service

Ảnh seed và URL ảnh có sẵn vẫn hiển thị khi thiếu Cloudinary, nhưng upload
avatar và ảnh sản phẩm sẽ không hoạt động.


3.6. Nhà cung cấp AI - bắt buộc để kiểm thử AI bên ngoài

Fallback cục bộ dưới đây không cần API key nhưng chỉ tư vấn theo luật:

  AI_PROVIDER=fallback
  OPENAI_API_KEY=
  OPENAI_MODEL=

Để sử dụng đầy đủ tích hợp AI, cấu hình một provider tương thích OpenAI:

  AI_PROVIDER=openai
  OPENAI_API_KEY=your-api-key
  OPENAI_MODEL=your-supported-model
  OPENAI_BASE_URL=https://api.openai.com/v1
  AI_PROVIDER_TIMEOUT_MS=8000

Giữ nguyên hai giá trị Elasticsearch nội bộ, trừ khi chủ động đổi tên service
hoặc index tương ứng trong Docker Compose:

  ELASTICSEARCH_URL=http://elasticsearch:9200
  ELASTICSEARCH_PRODUCT_INDEX=products_v1

Giữ OPENAI_BASE_URL như trên nếu dùng OpenAI chính thức. Nếu dùng provider
khác, nhập base URL và model do provider đó hỗ trợ. Áp dụng:

  docker compose up -d --force-recreate ai-service


3.7. Danh sách kiểm tra source/.env đầy đủ

Trước khi chạy bản đầy đủ, xác nhận các biến sau không để trống:

  - INTERNAL_SERVICE_SECRET và SESSION_SECRET.
  - SMTP_USER, SMTP_PASS và EMAIL_FROM; EMAIL_TRANSPORT phải là smtp.
  - GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.
  - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.
  - OPENAI_API_KEY và OPENAI_MODEL; AI_PROVIDER phải là openai.

Sau khi thay đổi nhiều nhóm biến môi trường, recreate toàn bộ stack:

  docker compose up -d --build --force-recreate


4. KHỞI ĐỘNG TOÀN BỘ HỆ THỐNG
-----------------------------

Đảm bảo Docker Desktop đang chạy, sau đó chạy tại source/:

  docker compose up -d

Lần đầu có thể mất vài phút để tải image, build ứng dụng, tạo Kafka topic,
seed dữ liệu và lập Elasticsearch index.

Các container mongo-init, kafka-init, identity-seed, catalog-seed, order-seed
và search-reindex chỉ chạy một lần. Trạng thái Exited (0) nghĩa là hoàn thành
thành công, không phải container bị hỏng. order-seed tạo coupon và đơn hàng
mẫu; dữ liệu được Analytics nhận qua Kafka và không bị nhân đôi khi chạy lại.

Kiểm tra:

  docker compose ps -a
  docker compose logs --tail=100 nginx gateway identity-service catalog-service order-service

Readiness endpoint:

  http://localhost/health/ready


5. ĐỊA CHỈ WEBSITE VÀ API
-------------------------

Khi HTTP_PORT=80:

  Trang chủ:                    http://localhost
  Sản phẩm:                     http://localhost/products
  Giỏ hàng:                     http://localhost/cart
  Thanh toán:                   http://localhost/checkout
  Hồ sơ khách hàng:             http://localhost/profile
  Đơn hàng:                     http://localhost/orders
  Trang quản trị:               http://localhost/admin
  Gateway readiness:            http://localhost/health/ready
  Products API:                 http://localhost/api/v1/products?page=1&limit=12
  Search API:                   http://localhost/api/v1/search?search=gaming&page=1&limit=12


5.1. Tài khoản demo

Khách hàng:

  Email:                        customer@example.com
  Mật khẩu:                     Customer@123
  Vai trò:                      CUSTOMER
  Địa chỉ:                      Home mặc định và Office
  Lịch sử:                      6 đơn hàng ở nhiều trạng thái
  Điểm thưởng:                  Có điểm từ đơn đã giao

Quản trị viên:

  Email:                        admin@example.com
  Mật khẩu:                     change-me
  Vai trò:                      ADMIN

Nếu đã đổi các biến tài khoản trong source/.env trước lần seed đầu tiên, hãy
đăng nhập bằng giá trị đã cấu hình.


6. DỪNG, KHỞI ĐỘNG LẠI VÀ BUILD
-------------------------------

Dừng nhưng giữ dữ liệu:

  docker compose down

Khởi động lại:

  docker compose up -d

Build sau khi đổi code:

  docker compose up -d --build

CẢNH BÁO: lệnh sau xóa vĩnh viễn toàn bộ volume MongoDB, Kafka, Redis và
Elasticsearch:

  docker compose down -v

Chỉ dùng khi thật sự muốn tạo lại toàn bộ dữ liệu từ đầu.


7. KIỂM TRA CHẤT LƯỢNG CODE
---------------------------

Cần Node.js 22.12 trở lên:

  npm ci --ignore-scripts
  npm run lint
  npm test
  npm run build
  npm run smoke


8. KIỂM THỬ THANH TOÁN THẺ MÔ PHỎNG
-----------------------------------

Thêm sản phẩm vào giỏ, đến trang thanh toán, chọn thanh toán thẻ mô phỏng và
nhập đúng:

  Tên chủ thẻ:                  NGUYEN VAN A
  Số thẻ:                       4242 4242 4242 4242
  Ngày hết hạn:                 12/30
  CVV:                          123

Giá trị đúng tạo giao dịch mô phỏng thành công; giá trị khác sẽ bị từ chối.
Backend chỉ lưu trạng thái và mã tham chiếu, không lưu số thẻ hoặc CVV. Không
nhập thông tin thẻ thật. Thanh toán khi nhận hàng vẫn khả dụng.


9. XỬ LÝ SỰ CỐ THƯỜNG GẶP
-------------------------

Trình duyệt còn hiển thị frontend cũ:

  docker compose up -d --build --force-recreate frontend gateway order-service nginx

Sau đó nhấn Ctrl+Shift+R hoặc mở cửa sổ riêng tư.

Xem log service:

  docker compose logs --tail=200 SERVICE_NAME

Kiểm tra lỗi reindex:

  docker compose logs --tail=200 search-reindex elasticsearch catalog-service

Container init, seed hoặc reindex ở trạng thái Exited (0) là bình thường.


10. LƯU Ý BẢO MẬT
-----------------

  - Không commit source/.env.
  - Không đưa Google secret, Gmail App Password, Cloudinary API Secret hoặc
    OpenAI API key vào tài liệu, ảnh chụp màn hình hay GitHub Actions log.
  - Chỉ dùng thẻ mô phỏng; không nhập thẻ thật.
  - Khi triển khai production cần domain ổn định, HTTPS, secret mới, backup,
    giám sát và credential production được provider phê duyệt.


TÍNH NĂNG BONUS - YÊU CẦU 2.0 ĐIỂM
----------------------------------

1. GitHub Actions CI/CD.
2. Microservices với giao tiếp bất đồng bộ qua Kafka.
3. Trợ lý AI tư vấn dựa trên catalog.
4. Tìm kiếm sản phẩm bằng Elasticsearch.

Tài liệu triển khai và danh sách bằng chứng runtime:
  Bonus/README.md
  Bonus/evidence/README.md
