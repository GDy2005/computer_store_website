COMPUTER STORE - HUONG DAN CAI DAT VA CHAY HE THONG
=================================================

Repository:
  https://github.com/GDy2005/computer_store_website.git

He thong gom React frontend, Nginx, API Gateway, cac Node.js microservice,
MongoDB replica set, Kafka, Redis va Elasticsearch. Tat ca thanh phan duoc
khoi dong bang Docker Compose. Chi Nginx cong khai mot cong ra may host.


1. YEU CAU TRUOC KHI CAI DAT
----------------------------

Bat buoc:
  - Git.
  - Docker Desktop dang chay.
  - Docker Compose v2 (lenh "docker compose", co dau cach).
  - Cong 80 tren may chua bi ung dung khac su dung.

Khuyen nghi:
  - Docker duoc cap it nhat 8 GB RAM vi he thong co Kafka, Elasticsearch,
    MongoDB va nhieu backend service.
  - Node.js >= 22.12 chi can khi muon chay lint/test/build ngoai Docker.

Kiem tra cong cu:

  git --version
  docker --version
  docker compose version


2. CLONE SOURCE CODE
--------------------

  git clone https://github.com/GDy2005/computer_store_website.git
  cd computer_store_website/source

Tat ca lenh Docker va npm trong tai lieu nay duoc chay tu thu muc source/.
Khong chay Docker Compose tu mot thu muc ngau nhien vi Compose can doc
source/.env.


3. TAO FILE .env
----------------

PowerShell:

  Copy-Item .env.example .env

Windows CMD:

  copy .env.example .env

Linux/macOS:

  cp .env.example .env

Mo source/.env va kiem tra cac nhom bien ben duoi. File .env da duoc Git
ignore; khong commit mat khau, API key hoac secret len repository.


3.1. Cau hinh bat buoc cho local

  HTTP_PORT=80
  NODE_ENV=development
  SERVICE_REPLICAS=2
  FRONTEND_URL=http://localhost
  ADMIN_EMAIL=admin@example.com
  ADMIN_INITIAL_PASSWORD=change-me

Doi INTERNAL_SERVICE_SECRET va SESSION_SECRET thanh hai chuoi bi mat khac
nhau. Co the tao chuoi ngau nhien bang PowerShell:

  [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  )

Neu may khong du RAM, co the dung:

  SERVICE_REPLICAS=1

Tai khoan admin chi duoc seed trong lan khoi tao database dau tien. Neu volume
MongoDB da ton tai, viec doi ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD trong .env se
khong tu dong doi tai khoan admin cu.


3.2. Neu cong 80 dang duoc su dung

Vi du chuyen sang cong 8080:

  HTTP_PORT=8080
  FRONTEND_URL=http://localhost:8080
  GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
  PAYMENT_PUBLIC_BASE_URL=http://localhost:8080

Khi do website se nam tai http://localhost:8080.


3.3. Email

Mac dinh:

  EMAIL_TRANSPORT=json

Che do nay giup he thong chay ma khong can tai khoan SMTP, nhung khong gui
email that. De gui email that qua Gmail SMTP:

  EMAIL_TRANSPORT=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-account@gmail.com
  SMTP_PASS=your-google-app-password
  EMAIL_FROM=your-account@gmail.com

SMTP_PASS phai la Google App Password, khong phai mat khau Gmail thong thuong.
Sau khi thay cac bien email:

  docker compose up -d --force-recreate notification-service identity-service

FRONTEND_URL la goc cua lien ket kich hoat tai khoan va dat lai mat khau trong
email. Localhost chi mo dung tren may dang chay Docker. Neu nguoi nhan email
can mo tu Internet, hay dung URL Cloudflare Tunnel o muc 8.


3.4. Dang nhap Google (tuy chon)

Tao OAuth Client tai:
  https://console.cloud.google.com/apis/credentials

Local setup:

  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback

Trong Google Cloud OAuth Client, them:

  Authorized JavaScript origin:
    http://localhost

  Authorized redirect URI:
    http://localhost/api/v1/auth/google/callback

Sau khi thay cau hinh:

  docker compose up -d --force-recreate gateway

Neu khong dung Google, de trong GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET.


3.5. Cloudinary (tuy chon)

Chi can khi admin muon upload anh san pham. Tao tai khoan tai:
  https://cloudinary.com/

Sau do dien:

  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=

Ap dung lai cau hinh:

  docker compose up -d --force-recreate catalog-service

Neu de trong, catalog va anh URL da seed van hoat dong; chi API upload anh bi
vo hieu hoa.


3.6. AI chatbot (tuy chon)

Che do mien phi, khong can API key:

  AI_PROVIDER=fallback
  OPENAI_API_KEY=
  OPENAI_MODEL=

Neu muon dung OpenAI:

  AI_PROVIDER=openai
  OPENAI_API_KEY=your-api-key
  OPENAI_MODEL=your-model-name
  OPENAI_BASE_URL=https://api.openai.com/v1

Ap dung lai cau hinh:

  docker compose up -d --force-recreate ai-service


4. KHOI DONG TOAN BO HE THONG
----------------------------

Dam bao Docker Desktop dang chay, sau do tu source/ chay:

  docker compose up -d

Lan dau Docker phai tai image, build source, seed data va tao search index nen
co the mat vai phut. Cac container nhu mongo-init, kafka-init, identity-seed,
catalog-seed, order-seed va search-reindex chay mot lan roi hien Exited (0).
Day la trang thai thanh cong, khong phai container bi hu.

Kiem tra:

  docker compose ps -a
  docker compose logs --tail=100 nginx gateway identity-service catalog-service order-service

Kiem tra nhanh Gateway:

  http://localhost/health/ready


5. CAC DIA CHI WEBSITE VA API
-----------------------------

Neu HTTP_PORT=80:

  Trang chu:                  http://localhost
  Danh sach san pham:         http://localhost/products
  Gio hang:                   http://localhost/cart
  Thanh toan:                 http://localhost/checkout
  Ho so:                      http://localhost/profile
  Don hang cua khach:         http://localhost/orders
  Dashboard admin:            http://localhost/admin
  Health check:               http://localhost/health/ready
  Products API:               http://localhost/api/v1/products?page=1&limit=12
  Search API:                 http://localhost/api/v1/search?search=gaming&page=1&limit=12

Dang nhap admin bang ADMIN_EMAIL va ADMIN_INITIAL_PASSWORD da dat truoc lan
khoi tao database dau tien.

MongoDB, Kafka, Redis va Elasticsearch chi nam trong Docker network, khong
cong khai cong truc tiep ra host.


6. DUNG VA KHOI DONG LAI
------------------------

Dung container nhung giu lai du lieu:

  docker compose down

Khoi dong lai:

  docker compose up -d

Sau khi sua source code:

  docker compose up -d --build

CANH BAO: lenh sau xoa toan bo MongoDB, Kafka, Redis va Elasticsearch data:

  docker compose down -v

Chi dung down -v khi that su muon tao lai du lieu tu dau.


7. KIEM TRA SOURCE CODE (TUY CHON)
---------------------------------

Can Node.js >= 22.12:

  npm ci --ignore-scripts
  npm run lint
  npm test
  npm run build
  npm run smoke


8. BAT VNPay SANDBOX QUA CLOUDFLARE TUNNEL (TUY CHON)
-----------------------------------------------------

Khong can buoc nay neu chi dung COD. VNPay can mot HTTPS URL cong khai de
chuyen nguoi dung ve website va gui IPN tu server VNPay den order-service.


8.1. Khoi dong website local truoc

  docker compose up -d

Kiem tra http://localhost truy cap duoc.


8.2. Cai cloudflared tren Windows

  winget install --id Cloudflare.cloudflared --exact

Dong va mo lai terminal, sau do kiem tra:

  cloudflared --version

Neu Windows da cai nhung PATH chua nhan, dung truc tiep:

  & "C:\Program Files (x86)\cloudflared\cloudflared.exe" --version

Tai lieu/tai file chinh thuc:
  https://developers.cloudflare.com/tunnel/downloads/
  https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
  https://github.com/cloudflare/cloudflared/releases


8.3. Tao Quick Tunnel

Neu HTTP_PORT=80:

  cloudflared tunnel --url http://localhost:80

Hoac khi PATH chua nhan:

  & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80

Neu HTTP_PORT=8080 thi thay dia chi dich bang http://localhost:8080.

Cloudflare se in ra URL dang:

  https://random-name.trycloudflare.com

Giu terminal cloudflared dang chay trong suot qua trinh test. Quick Tunnel
khong can mua domain, nhung URL co the thay doi moi lan khoi dong lai.


8.4. Cap nhat source/.env

Thay YOUR-TUNNEL bang hostname Cloudflare vua nhan, khong them dau / o cuoi:

  FRONTEND_URL=https://YOUR-TUNNEL.trycloudflare.com
  PAYMENT_PUBLIC_BASE_URL=https://YOUR-TUNNEL.trycloudflare.com
  GOOGLE_CALLBACK_URL=https://YOUR-TUNNEL.trycloudflare.com/api/v1/auth/google/callback

Neu khong dung Google thi GOOGLE_CALLBACK_URL co the de theo mau nhung
GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET van de trong.

FRONTEND_URL cong khai dam bao email kich hoat/reset mat khau mo dung website.
PAYMENT_PUBLIC_BASE_URL duoc backend dung de tao Return URL va IPN URL VNPay.


8.5. Dang ky VNPay Sandbox

Dang ky merchant test tai:
  https://sandbox.vnpayment.vn/devreg

Gia tri goi y:

  Ten website: Computer Store Sandbox
  Dia chi URL: https://YOUR-TUNNEL.trycloudflare.com

VNPay gui thong tin ket noi ve email dang ky. Dien vao source/.env:

  VNPAY_TMN_CODE=terminal-code-do-vnpay-cap
  VNPAY_HASH_SECRET=hash-secret-do-vnpay-cap
  VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

Neu VNPay yeu cau khai bao Return URL va IPN URL:

  Return URL:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/return

  IPN URL:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/payments/vnpay/ipn

Khong chia se VNPAY_HASH_SECRET va khong commit no len Git.


8.6. Ap dung lai .env sau khi bat VNPay

Neu chi them/sua TmnCode va HashSecret, URL tunnel khong doi:

  docker compose up -d --force-recreate order-service

Neu vua doi tu localhost sang URL tunnel, chay:

  docker compose up -d --force-recreate identity-service order-service gateway

Sau do mo website bang URL tunnel ngay tu dau, dang nhap tren URL tunnel,
them san pham vao gio va chon VNPay (sandbox) khi checkout. Khong nen bat dau
phien dang nhap o localhost roi doi sang tunnel vi hai hostname co session
trinh duyet rieng.

The VNPay sandbox thanh cong:

  Ngan hang:       NCB
  So the:          9704198526191432198
  Ten chu the:     NGUYEN VAN A
  Ngay phat hanh:  07/15
  OTP:             123456


8.7. Neu co dung Google OAuth tren URL tunnel

Trong Google Cloud Console, them:

  Authorized JavaScript origin:
    https://YOUR-TUNNEL.trycloudflare.com

  Authorized redirect URI:
    https://YOUR-TUNNEL.trycloudflare.com/api/v1/auth/google/callback

Sau do recreate Gateway:

  docker compose up -d --force-recreate gateway


8.8. LUU Y KHI QUICK TUNNEL DOI URL

Moi khi tat va chay lai Quick Tunnel, URL co the thay doi. Khi URL thay doi,
phai thuc hien lai TAT CA cac viec sau:

  1. Sua FRONTEND_URL trong source/.env.
  2. Sua PAYMENT_PUBLIC_BASE_URL trong source/.env.
  3. Sua GOOGLE_CALLBACK_URL neu Google OAuth duoc bat.
  4. Cap nhat website URL/Return URL/IPN URL ben VNPay neu portal yeu cau.
  5. Cap nhat origin va redirect URI trong Google Cloud neu dung Google.
  6. Chay lai:

       docker compose up -d --force-recreate identity-service order-service gateway

  7. Mo website bang URL tunnel moi va dang nhap lai.
  8. Luon giu terminal cloudflared mo trong khi test.

Email da gui truoc khi doi URL van chua lien ket cu; hay yeu cau gui email kich
hoat/dat lai mat khau moi sau khi identity-service da duoc recreate.

Neu can URL on dinh lau dai, hay dung Cloudflare Named Tunnel voi domain rieng
hoac mot dich vu tunnel co hostname co dinh. Quick Tunnel chi phu hop test.


9. XU LY LOI THUONG GAP
-----------------------

Giao dien van la ban cu:

  docker compose up -d --build --force-recreate frontend gateway order-service nginx

Sau do nhan Ctrl+Shift+R hoac mo cua so an danh.

Xem log service:

  docker compose logs --tail=200 SERVICE_NAME

Vi du:

  docker compose logs --tail=200 order-service gateway nginx

Kiem tra VNPay variables da vao container ma khong in secret:

  docker compose exec -T order-service node -e "for (const k of ['PAYMENT_PUBLIC_BASE_URL','VNPAY_TMN_CODE','VNPAY_HASH_SECRET']) console.log(k, process.env[k] ? 'SET' : 'MISSING')"

Neu search-reindex that bai:

  docker compose logs --tail=200 search-reindex elasticsearch catalog-service

Neu mot init/seed/reindex container hien Exited (0), do la ket qua binh thuong.


10. BAO MAT
-----------

  - Khong commit source/.env.
  - Khong dua Google Secret, SMTP App Password, Cloudinary API Secret,
    OpenAI API Key hoac VNPAY_HASH_SECRET vao README hay anh chup man hinh.
  - Quick Tunnel va tai khoan sandbox chi dung de phat trien/kiem thu.
  - Truoc khi production can domain on dinh, HTTPS, secret moi, monitoring,
    backup va credential production duoc nha cung cap phe duyet.
