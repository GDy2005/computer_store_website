# Phase 2 manual — Authentication and user

Tài liệu này là checklist để tự triển khai Phase 2 trên nền Phase 1 hiện tại.
Nó mô tả thứ tự, trách nhiệm của từng service, file cần tạo và tiêu chí kiểm
tra; không cung cấp một bản implementation hoàn chỉnh để sao chép.

## 1. Kết quả cần đạt

Sau Phase 2, hệ thống phải có:

- Đăng ký, kích hoạt tài khoản, đăng nhập và đăng xuất.
- Session dùng chung giữa hai Gateway qua Redis.
- Xem/cập nhật profile và quản lý nhiều địa chỉ giao hàng.
- Đổi mật khẩu và khôi phục mật khẩu bằng token một lần.
- Google OAuth.
- `users.created.v1`, `users.updated.v1` và `email.requested.v1` được ghi qua
  Outbox rồi publish lên Kafka.
- Notification Service consume yêu cầu email kích hoạt/reset một cách idempotent.
- Đúng hai role `CUSTOMER`, `ADMIN`; chỉ seed script được tạo `ADMIN`.
- Frontend có các màn hình auth/profile tương ứng.
- Unit, contract và integration tests chạy trong CI.

Phase 2 không làm product, cart, checkout, order, loyalty hoặc dashboard.

## 2. Quyết định kiến trúc phải giữ

### Gateway sở hữu session

- Browser chỉ gọi API Gateway qua Nginx.
- Gateway dùng `express-session` và Redis store đã có từ Phase 1.
- Sau login/OAuth, Gateway regenerate session rồi chỉ lưu `userId` và `role`.
- Logout phải destroy session trong Redis và clear cookie.
- Không lưu JWT/session token trong `localStorage`.
- Không để Identity Service tự tạo một cookie session khác.

### Identity Service sở hữu user

- Chỉ Identity Service đọc/ghi `identity_db.users` và `password_tokens`.
- Gateway không truy cập MongoDB.
- Identity xác minh mật khẩu, trạng thái account và `isBanned`.
- Identity không tin `x-user-id` hoặc `x-user-role` từ browser.

### Notification Service sở hữu email job

- Notification Service consume `email.requested.v1`.
- Handler chỉ tạo `email_jobs` idempotently; một worker riêng gửi email.
- Không gửi SMTP bên trong MongoDB transaction.

### Giao tiếp liên service

- Truy vấn cần phản hồi ngay dùng signed internal HTTP.
- Thay đổi cần đồng bộ bất đồng bộ dùng Kafka event.
- User document, password token và outbox records liên quan phải được ghi trong
  cùng local MongoDB transaction.
- Consumer có side effect phải dùng processed marker.

## 3. Điểm cần xác nhận với giảng viên

Đề PDF nói form tạo account chỉ nhận email, họ tên và địa chỉ giao hàng, nhưng
phần khác lại yêu cầu login/change/reset password. Cách an toàn được dùng trong
tài liệu này là:

1. `POST /auth/register` chỉ nhận email, họ tên và địa chỉ.
2. Hệ thống tạo account `PENDING_ACTIVATION` với `passwordHash: null`.
3. Email kích hoạt dẫn tới form đặt mật khẩu lần đầu.
4. Sau khi đặt mật khẩu, account chuyển thành `ACTIVE`.

Nếu giảng viên xác nhận registration được phép nhận password, chỉ thay đổi luồng
register/activate; các phần session, profile, reset và OAuth giữ nguyên.

## 4. Kiểm tra nền trước khi bắt đầu

Chạy từ `source/`:

```powershell
npm ci --ignore-scripts
npm run lint
npm test
npm run build
docker compose config --quiet
```

Khi Docker Desktop hoạt động, chạy thêm:

```powershell
docker compose up -d
npm run smoke
docker compose exec -T identity-service node scripts/event-integration.js
```

Không bắt đầu Phase 2 nếu lỗi Phase 1 chưa được giải thích hoặc sửa.

## 5. Cài dependency thủ công

Không sửa trực tiếp `package-lock.json`. Chạy các lệnh npm để package manifest và
lockfile được cập nhật đồng thời:

```powershell
npm install mongoose bcryptjs --workspace @store/identity-service
npm install passport passport-google-oauth20 --workspace @store/api-gateway
npm install mongoose nodemailer --workspace @store/notification-service
```

Nếu chưa làm Google OAuth hoặc email ngay, chỉ cài dependency khi bắt đầu slice
tương ứng. Không cài package toàn cục.

## 6. Bổ sung environment variables

Thêm tên biến và giá trị mẫu không nhạy cảm vào `.env.example`:

```dotenv
FRONTEND_URL=http://localhost
PASSWORD_TOKEN_TTL_MINUTES=30
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost/api/v1/auth/google/callback
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@example.com
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=change-me
```

Sau đó truyền đúng tập biến cho Gateway, Identity và Notification trong Compose.
Không commit credential thật hoặc file `.env`.

## 7. Tạo cấu trúc MVC/layered cho Identity Service

Phase 2 dùng cấu trúc MVC/layered thay vì chia theo `modules/`. Vì service trả JSON
chứ không render HTML, frontend React là View; phía backend đi theo luồng
`Route -> Controller -> Service -> Model`.

Tạo thủ công cấu trúc sau; tên file có thể điều chỉnh nhưng giữ rõ trách nhiệm:

```text
services/identity-service/src/
├── config/
│   └── database.js
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   └── address.controller.js
├── models/
│   ├── user.model.js
│   └── password-token.model.js
├── services/
│   ├── auth.service.js
│   ├── user.service.js
│   ├── address.service.js
│   └── password-token.service.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── address.routes.js
├── validations/
│   ├── auth.validation.js
│   ├── user.validation.js
│   └── address.validation.js
├── middlewares/
│   └── require-user.js
├── events/
│   ├── handlers.js
│   └── user.events.js
├── seeds/
│   └── seed-admin.js
├── app.js
└── server.js
```

Trách nhiệm từng lớp:

- Route khai báo URL và nối validation/middleware/controller.
- Controller chỉ đọc request, gọi service và tạo HTTP response.
- Service chứa nghiệp vụ, transaction và gọi Outbox.
- Model chỉ định nghĩa MongoDB schema, indexes và thao tác dữ liệu cơ bản.
- Validation kiểm tra body/params/query trước khi controller chạy.
- Không truy cập model trực tiếp từ route hoặc nhét nghiệp vụ vào controller.

Address là subdocument của User nên chưa cần `address.model.js`. Auth cũng không cần
model riêng vì nó dùng `User` và `PasswordToken`.

## 8. User model

Tạo `User` trong collection `users` với các field:

- `email`: required, lowercase, trim, unique.
- `passwordHash`: string hoặc `null`; không select mặc định khi đọc profile.
- `fullName`, `phone`.
- `role`: enum `CUSTOMER|ADMIN`, mặc định `CUSTOMER`.
- `isBanned`: boolean, mặc định `false`.
- `accountStatus`: enum `ACTIVE|PENDING_ACTIVATION`.
- `socialAccounts`: `{provider, providerUserId}`.
- `addresses`: subdocuments có label, recipientName, phone, addressLine, ward,
  district, province và `isDefault`.
- timestamps và tắt version key nếu nhất quán với model hiện tại.

Indexes tối thiểu:

- `{email: 1}` unique.
- Social provider ID unique/sparse để một Google account không liên kết hai user.

Quy tắc nghiệp vụ:

- Normalize email trước mọi lookup.
- Không nhận `role`, `isBanned`, `accountStatus` từ public request.
- Không trả `passwordHash` về API.
- Tối đa một địa chỉ mặc định.
- User bị ban không được login hoặc dùng customer-only API.

## 9. Password token model

Tạo collection `password_tokens`:

- `userId`.
- `type`: `ACTIVATION|PASSWORD_RESET`.
- `tokenHash`: unique; chỉ lưu hash, không lưu raw token.
- `expiresAt`: TTL index.
- `usedAt`: `null` cho tới khi sử dụng.
- `createdAt`.

Khi tạo token:

1. Sinh ít nhất 32 random bytes bằng `node:crypto`.
2. Chỉ trả raw token cho bước tạo action URL.
3. Lưu SHA-256 hash vào MongoDB.
4. Khi nhận token, hash lại rồi query token chưa dùng và chưa hết hạn.
5. Đánh dấu `usedAt` trong cùng transaction với thay đổi password/account.
6. Vô hiệu hóa token cũ cùng loại khi cấp token mới.

Không log raw token, password hoặc action URL chứa token.

## 10. Request validation và error contract

Mở rộng package `@store/validation` để có middleware validate body/params/query.
Có thể tiếp tục dùng AJV đang có trong package này.

Mỗi schema phải:

- Khai báo `additionalProperties: false`.
- Normalize email nhưng không tự sửa dữ liệu khác âm thầm.
- Kiểm tra ObjectId/UUID đúng định dạng.
- Giới hạn độ dài string và array.
- Không chấp nhận role/status từ client.

Các error code nên thống nhất:

- `VALIDATION_ERROR` — 400.
- `UNAUTHORIZED` — 401.
- `FORBIDDEN` — 403.
- `NOT_FOUND` — 404.
- `EMAIL_ALREADY_EXISTS` — 409.
- `INVALID_CREDENTIALS` — 401; không tiết lộ email hay password sai.
- `TOKEN_INVALID_OR_EXPIRED` — 400.

## 11. Register và activation — vertical slice đầu tiên

Public endpoint:

```text
POST /api/v1/auth/register
```

Body theo cách hiểu an toàn của đề:

```text
email, fullName, address
```

Thứ tự xử lý trong Identity Service:

1. Validate và normalize input.
2. Kiểm tra email unique; xử lý duplicate key thành HTTP 409.
3. Sinh activation token và hash.
4. Trong một MongoDB transaction:
   - tạo user `CUSTOMER`, `PENDING_ACTIVATION`, `passwordHash: null`;
   - tạo địa chỉ đầu tiên với `isDefault: true`;
   - tạo password token;
   - tạo outbox `users.created.v1`;
   - tạo outbox `email.requested.v1` loại `ACCOUNT_ACTIVATION`.
5. Trả 202/201 nhưng không trả raw token hoặc password hash.

Activation endpoint triển khai nội bộ như một phần của auth API:

```text
POST /api/v1/auth/activate
```

Body gồm activation token và password mới. Hash password bằng bcrypt với cost hợp
lý. Trong transaction, dùng token, cập nhật `passwordHash`, chuyển account thành
`ACTIVE` và đánh dấu token đã dùng.

Nếu email đã tồn tại, không tự ghi đè user hoặc tự đổi role.

## 12. Gateway-owned login, session và logout

Giữ Gateway ở `api-gateway/`, không chuyển vào `services/`. Có thể tổ chức phần auth
theo cùng kiểu layered:

```text
api-gateway/src/
├── config/
│   └── passport.js
├── controllers/
│   └── auth.controller.js
├── services/
│   └── identity-client.service.js
├── routes/
│   └── auth.routes.js
├── middlewares/
│   └── require-session.js
├── app.js
└── server.js
```

Gateway không có model user và không kết nối `identity_db`. `auth.controller.js`
quản lý session; `identity-client.service.js` chỉ gọi signed internal HTTP tới
Identity Service.

### Sửa signed internal context

Hiện signed token chỉ mang `requestId`. Mở rộng nó để có claims do Gateway tạo:

- `requestId`.
- `userId` hoặc `null`.
- `role` hoặc `null`.

Gateway phải xóa mọi `x-user-id`/`x-user-role` do client gửi và chỉ lấy user từ
`req.session`. Identity tiếp tục verify issuer, audience, algorithm và expiry.

### Login

Không dùng generic proxy cho login vì Identity không thể ghi Gateway session.
Tạo handler login tại Gateway trước vòng lặp proxy hiện tại:

1. Gateway validate/nhận email + password.
2. Gateway gọi signed internal HTTP tới Identity để verify credential.
3. Identity kiểm tra password, `ACTIVE` và không bị ban; trả user tối thiểu.
4. Gateway gọi `req.session.regenerate(...)`.
5. Gateway lưu `{userId, role}` rồi `save()` trước khi trả response.

Endpoint browser vẫn là:

```text
POST /api/v1/auth/login
```

### Logout

Gateway xử lý trực tiếp:

```text
POST /api/v1/auth/logout
```

Destroy Redis session, clear cookie đúng tên và trả success. Gọi logout hai lần
không được gây lỗi 500.

### Authorization

- Gateway chặn route customer nếu không có session.
- Identity vẫn kiểm tra signed context và user hiện còn ACTIVE/not banned.
- Không chỉ dựa vào việc frontend ẩn button.
- Dùng rate limit nghiêm hơn cho login/forgot-password so với API thông thường.

## 13. Profile và address APIs

Triển khai đúng các endpoint:

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
GET    /api/v1/users/me/addresses
POST   /api/v1/users/me/addresses
PATCH  /api/v1/users/me/addresses/:id
DELETE /api/v1/users/me/addresses/:id
PATCH  /api/v1/users/me/addresses/:id/default
```

Quy tắc:

- `userId` luôn lấy từ signed context, không lấy từ body/query.
- Profile chỉ cho sửa field được allowlist như fullName/phone.
- Khi đặt default, tất cả địa chỉ khác phải thành `false` trong cùng atomic update
  hoặc transaction.
- Khi xóa default và vẫn còn địa chỉ, chọn default mới theo quy tắc xác định.
- Trả 404 nếu address không thuộc user hiện tại.
- Không cho user tự đổi email/role/isBanned bằng profile endpoint.
- Profile thay đổi tạo `users.updated.v1` qua Outbox; address-only change không cần
  event nếu chưa có consumer cần dữ liệu địa chỉ.

## 14. Change password và forgot/reset password

### Change password

`PATCH /users/me/password` yêu cầu current password và new password:

1. Recheck current password.
2. Validate new password và không cho trùng mật khẩu hiện tại.
3. Hash mới rồi update trong transaction.
4. Regenerate hoặc destroy các session theo chính sách đã chọn.

Nếu muốn logout mọi thiết bị, thêm `sessionVersion` vào user và session context;
không cần tự quét Redis keys.

### Forgot password

`POST /auth/forgot-password` luôn trả response giống nhau dù email tồn tại hay
không để tránh account enumeration. Nếu user hợp lệ:

1. Cấp token `PASSWORD_RESET`.
2. Ghi `email.requested.v1` trong cùng transaction.
3. Rate-limit theo IP và normalized email.

### Reset password

`POST /auth/reset-password` nhận raw token + password mới. Dùng token một lần,
update password và đánh dấu token trong một transaction. Token dùng lại hoặc hết
hạn phải thất bại bằng cùng một response chung.

## 15. Event và Outbox

Dùng `createEvent()` từ `@store/event-contracts`; không tự dựng envelope.

### `users.created.v1`

Payload hiện có: `userId`, `email`, `fullName`, `role`, `accountStatus`.
Identity Service phải là producer và Kafka key là `userId`.

### `users.updated.v1`

Payload hiện có: `userId`, `fullName`, `isBanned`. Dùng cho profile update và các
thay đổi mà consumer hiện cần. Nếu muốn thêm field, cập nhật JSON Schema và
contract tests trước khi producer phát field mới.

### `email.requested.v1`

Dùng loại `ACCOUNT_ACTIVATION` hoặc `PASSWORD_RESET`. `templateData` chỉ chứa dữ
liệu cần render. Action token phải ngắn hạn, dùng một lần và không được ghi log.

Siết contract `producer` theo topic trước khi dùng business event thật:

- `users.*`: chỉ `identity-service`.
- `email.requested`: `identity-service` hoặc `order-service`.

## 16. Notification consumer

Notification Service cũng dùng cấu trúc MVC/layered. Consumer Kafka đóng vai trò
đầu vào song song với HTTP controller:

```text
services/notification-service/src/
├── controllers/
│   └── email.controller.js
├── models/
│   └── email-job.model.js
├── services/
│   ├── email.service.js
│   └── email-worker.service.js
├── routes/
│   └── email.routes.js
├── events/
│   ├── handlers.js
│   └── email-requested.consumer.js
├── templates/
│   ├── account-activation.js
│   └── password-reset.js
├── app.js
└── server.js
```

Nếu Notification Service không có public email API thì `email.controller.js` và
`email.routes.js` có thể bỏ. Kafka consumer gọi `email.service.js`; worker gọi
`email-worker.service.js`. Không gửi SMTP trực tiếp trong consumer.

Luồng xử lý:

1. Consumer group `notification-email-group` subscribe `email.requested.v1` cùng
   retry/DLQ tương ứng.
2. Validate event contract.
3. Dùng processed marker `(eventId, consumer)`.
4. Trong transaction, upsert một `email_job` theo `eventId`.
5. Commit Kafka offset sau transaction.
6. Worker đọc job `PENDING`, gửi bằng Nodemailer, rồi đánh dấu `SENT`.
7. Lỗi tạm thời có retry giới hạn; lỗi payload đi DLQ.

Nên mở rộng `startService` bằng options/hook cho domain consumers thay vì copy
toàn bộ foundation runtime vào Notification Service. Foundation probe phải tiếp
tục hoạt động sau refactor.

## 17. Admin seed

Tạo `seedAdmin.js` idempotent:

- Đọc `ADMIN_EMAIL` và `ADMIN_INITIAL_PASSWORD` từ environment.
- Upsert theo normalized email.
- Hash password.
- Tạo đúng một account role `ADMIN`, status `ACTIVE`.
- Không in password hash/secret ra log.
- Không cho public registration truyền role ADMIN.

Có thể thêm one-shot `identity-seed` trong Compose theo mẫu `catalog-seed` và để
Identity Service chờ seed hoàn tất. Chạy seed lại không được tạo admin thứ hai.

## 18. Google OAuth

Làm sau khi email/password session đã ổn.

Khuyến nghị để Gateway sở hữu OAuth callback vì Gateway sở hữu browser session:

1. Gateway bắt đầu Google OAuth và kiểm tra `state`.
2. Callback lấy verified Google profile.
3. Gateway gọi signed internal endpoint của Identity.
4. Identity tìm theo provider ID; nếu chưa có thì link theo verified email hoặc
   tạo user ACTIVE không có local password.
5. Nếu tạo user mới, ghi `users.created.v1` qua Outbox.
6. Gateway regenerate Redis session và redirect về frontend allowlist.

Không nhận redirect URL tùy ý từ query. Không trả Google token cho frontend hoặc
lưu provider access token nếu ứng dụng không cần gọi Google API sau login.

## 19. Frontend

Tạo lần lượt:

```text
frontend/src/features/auth/
frontend/src/pages/auth/LoginPage.jsx
frontend/src/pages/auth/RegisterPage.jsx
frontend/src/pages/auth/ForgotPasswordPage.jsx
frontend/src/pages/auth/PasswordActionPage.jsx
frontend/src/pages/profile/ProfilePage.jsx
frontend/src/pages/profile/AddressesPage.jsx
```

Frontend cần:

- Auth state lấy từ `/users/me`, không tin localStorage.
- Loading, empty, validation và server-error states rõ ràng.
- Header đổi Login/Profile/Logout theo session.
- Route guard chỉ phục vụ UX; backend vẫn là lớp bảo vệ thật.
- Form không gửi field ngoài allowlist.
- Không hiển thị raw provider error, token hoặc stack trace.
- Responsive trên mobile/desktop.

## 20. Tests phải tự viết

Thêm tối thiểu:

```text
tests/identity-auth.test.js
tests/identity-addresses.test.js
tests/gateway-session.test.js
tests/notification-email.test.js
scripts/auth-integration.js
```

### Unit/contract cases

- Normalize email và unique email.
- Hash/compare password; không trả passwordHash.
- Chỉ seed mới tạo ADMIN.
- Token hết hạn, dùng hai lần và wrong type đều bị từ chối.
- Một user chỉ có một default address.
- `users.created`, `users.updated`, `email.requested` pass schema.
- Wrong producer hoặc extra sensitive field bị contract từ chối.
- Duplicate email event chỉ tạo một email job.

### HTTP/integration cases

- Register hợp lệ; input thừa/sai bị 400.
- Duplicate email trả 409 hoặc response an toàn đã chọn.
- Account chưa activate/bị ban không login được.
- Login sai dùng chung `INVALID_CREDENTIALS`.
- Login regenerate session; cookie có `HttpOnly`, `SameSite`.
- Session tạo qua Gateway 1 vẫn dùng được qua Gateway 2.
- `/users/me` không có session trả 401.
- User không sửa được role/isBanned.
- CRUD address giữ đúng default invariant.
- Logout làm session cũ vô hiệu.
- Forgot-password không làm lộ email có tồn tại.
- Reset token chỉ dùng một lần.
- Outbox/event integration không tạo side effect trùng.
- Notification retry/DLQ vẫn hoạt động.

Google OAuth cần ít nhất manual integration evidence với test credential; tách
khỏi unit tests để CI không phụ thuộc Google thật.

## 21. Thứ tự commit khuyến nghị

Không gom toàn bộ Phase 2 vào một commit. Ví dụ:

1. `Add identity user and password token models`
2. `Implement registration and account activation outbox`
3. `Add Redis-backed login and logout sessions`
4. `Implement profile and address management`
5. `Add password change and recovery flow`
6. `Consume identity email requests in notification service`
7. `Add Google OAuth login`
8. `Build authentication and profile UI`
9. `Add Phase 2 integration tests and documentation`

Điều này cũng giúp GitHub Insights thể hiện đóng góp đều theo yêu cầu bài.

## 22. Definition of Done Phase 2

Chỉ đánh dấu hoàn thành khi tất cả mục sau đạt:

- [ ] Register/activate/login/logout hoạt động qua Nginx/Gateway.
- [ ] Session thật sự nằm ở Redis và dùng xuyên hai Gateway.
- [ ] Profile và address CRUD đúng ownership/default invariant.
- [ ] Change/forgot/reset password hoạt động, token một lần và có TTL.
- [ ] Google OAuth tạo/link đúng user và tạo Gateway session.
- [ ] Không có public API tạo ADMIN hoặc sửa role.
- [ ] Password chỉ lưu dạng hash; token chỉ lưu hash; response không rò secret.
- [ ] User change + event nằm trong cùng transaction/Outbox.
- [ ] Notification consume email event idempotently; retry/DLQ có bằng chứng.
- [ ] Frontend có đủ state và responsive.
- [ ] `npm run lint`, `npm test`, `npm run build` đều pass.
- [ ] `docker compose up -d`, smoke và auth integration đều pass.
- [ ] GitHub Actions hosted run xanh.
- [ ] README, `.env.example` và Phase 2 evidence được cập nhật.

Không chuyển sang Phase 3 business implementation nếu session, authorization,
Outbox và integration tests của Phase 2 chưa ổn.
