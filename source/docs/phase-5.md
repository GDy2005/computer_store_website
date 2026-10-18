# Phase 5 — Orders và loyalty

Phase 5 được chia thành các mục để triển khai và kiểm tra riêng:

1. Lịch sử và chi tiết đơn hàng của customer.
2. Loyalty account và ledger.
3. Redeem điểm trong checkout và compensation.
4. Cộng điểm khi đơn `DELIVERED` và phát Kafka events.
5. Hoàn thiện liên kết guest activation với đơn hàng, integration test và tài liệu.

## Mục 1 — Lịch sử và chi tiết đơn hàng

Trạng thái: đã triển khai.

### Luồng backend

```text
GET /api/v1/orders/me?page=1&limit=10
  -> order.routes.js
  -> requireUser
  -> validateOrderListQuery
  -> order.controller.js
  -> customer-order.service.js
  -> orders collection (filter bằng userId từ session)
```

API:

- `GET /api/v1/orders/me`: trả danh sách mới nhất trước, phân trang từ backend.
- `GET /api/v1/orders/me/:orderNumber`: trả snapshot sản phẩm, giao hàng, thanh toán và status history mới nhất trước.

Không nhận `userId` từ query/body. `userId` luôn lấy từ internal token do Gateway ký từ session. Truy vấn chi tiết dùng đồng thời `{userId, orderNumber}`, vì vậy order của người khác trả `404` và không làm lộ việc order có tồn tại.

Response customer không chứa `unitCost`, `totalCost` hoặc `profit`.

### Vị trí mã nguồn

| Phần | File |
|---|---|
| Route và authentication | `services/order-service/src/routes/order.routes.js` |
| Validate `page`, `limit` | `services/order-service/src/validations/order.validation.js` |
| HTTP response | `services/order-service/src/controllers/order.controller.js` |
| Query, phân trang, lọc dữ liệu nội bộ | `services/order-service/src/services/customer-order.service.js` |
| API frontend và format tiền/ngày/trạng thái | `frontend/src/features/orders/orderApi.js` |
| Danh sách đơn | `frontend/src/pages/orders/OrdersPage.jsx` |
| Chi tiết và status history | `frontend/src/pages/orders/OrderDetailPage.jsx` |
| Protected routes | `frontend/src/App.jsx` |
| Unit test | `tests/order-history-phase5.test.js` |

### Kiểm tra riêng mục 1

```powershell
node --test tests/order-history-phase5.test.js
npm run lint
npm run build
```

Các tình huống test gồm validation phân trang, sắp xếp mới nhất, filter theo chủ sở hữu, ẩn dữ liệu giá vốn/lợi nhuận và từ chối đọc order của user khác.

## Mục 2 — Loyalty account và ledger

Trạng thái: đã triển khai.

Order Service là chủ sở hữu duy nhất của dữ liệu điểm:

- `loyalty_accounts` lưu `userId`, `pointsBalance` và `version`.
- `loyalty_transactions` là sổ giao dịch có dấu vết đầy đủ, gồm `EARN`, `REDEEM`, `REFUND` và trạng thái `PENDING`, `COMMITTED`, `REVERSED`.
- Unique index `{orderId, type}` ngăn cùng một order tạo trùng một loại giao dịch.
- User chưa có account được xem như có số dư `0`; không cần tạo document rỗng.

API customer:

```http
GET /api/v1/loyalty/me?page=1&limit=10
```

API yêu cầu đăng nhập, trả số dư hiện tại và ledger mới nhất trước. Frontend hiển thị tại `/loyalty`.

### Vị trí mã nguồn Mục 2

| Phần | File |
|---|---|
| Account model | `services/order-service/src/models/loyalty-account.model.js` |
| Ledger model và indexes | `services/order-service/src/models/loyalty-transaction.model.js` |
| Đọc số dư, ledger và nghiệp vụ điểm | `services/order-service/src/services/loyalty.service.js` |
| API route/controller | `services/order-service/src/routes/order.routes.js`, `controllers/order.controller.js` |
| Gateway proxy | `api-gateway/src/app.js` |
| Frontend API | `frontend/src/features/loyalty/loyaltyApi.js` |
| Trang số dư và ledger | `frontend/src/pages/loyalty/LoyaltyPage.jsx` |

## Mục 3 — Redeem điểm trong checkout và compensation

Trạng thái: đã triển khai.

Quy ước:

- `1 point = 1.000 VND`.
- Chỉ user đăng nhập được dùng điểm; guest vẫn checkout bình thường với `pointsToRedeem = 0`.
- Backend đọc số dư thật và tự tính `pointsDiscount`; không nhận tổng tiền hoặc giá trị giảm từ frontend.
- Điểm tối đa bằng `floor(total sau coupon và phí giao hàng / 1000)` để tổng tiền không âm.

Luồng thành công:

```text
Checkout preview -> kiểm tra số dư và mức tối đa
Place order transaction
  -> atomic decrement loyalty account
  -> tạo REDEEM/PENDING
  -> tạo order + outbox
Inventory reserved transaction
  -> REDEEM/COMMITTED
  -> order CONFIRMED
```

Luồng bù trừ:

```text
Inventory rejected hoặc checkout timeout
  -> REDEEM/REVERSED
  -> cộng lại pointsBalance
  -> tạo REFUND/COMMITTED
  -> order CANCELLED
```

Filter atomic `{userId, pointsBalance: {$gte: points}}` bảo vệ hai checkout đồng thời. Nếu số dư đã thay đổi, toàn bộ transaction tạo order/coupon/redeem rollback và API yêu cầu khách preview lại.

Order snapshot lưu `pointsUsed`, `pointsDiscount` và `redeemStatus`. Trang chi tiết order hiển thị khoản giảm bằng điểm.

### Vị trí mã nguồn Mục 3

| Phần | File |
|---|---|
| Validate `pointsToRedeem` | `services/order-service/src/validations/order.validation.js` |
| Preview, tính tiền, reserve điểm | `services/order-service/src/services/checkout.service.js` |
| Commit/refund theo Saga | `services/order-service/src/services/order-workflow.service.js` |
| Loyalty snapshot trong order | `services/order-service/src/models/order.model.js` |
| Form dùng điểm | `frontend/src/pages/checkout/CheckoutPage.jsx` |
| Hiển thị điểm trong order | `frontend/src/pages/orders/OrderDetailPage.jsx` |
| Test Mục 2–3 | `tests/loyalty-phase5.test.js` |

### Kiểm tra riêng Mục 2–3

```powershell
node --test tests/loyalty-phase5.test.js
npm run lint
npm run build
```

Mục 4 sẽ bổ sung nguồn cộng điểm khi order chuyển sang `DELIVERED` và phát `loyalty.changed.v1`. Trước Mục 4, account thực tế chưa tự phát sinh điểm mới nên màn hình có thể hiển thị số dư `0`; redeem đã sẵn sàng và được test bằng account có số dư.
