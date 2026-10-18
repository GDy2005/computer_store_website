# Phase 4 — Giỏ hàng và checkout

## Kết quả hiện tại

Phase 4 đã có luồng hoàn chỉnh từ giao diện đến Kafka Saga:

- Guest và user đã đăng nhập đều có giỏ hàng; giỏ guest được gộp sau khi đăng nhập.
- Catalog Service luôn tính lại giá và tồn kho, nên frontend không thể tự gửi giá sản phẩm.
- Hai coupon seed là `WELCOME10` và `SAVE200K`.
- Checkout hỗ trợ COD và thanh toán online mô phỏng.
- Guest checkout tự tìm hoặc tạo tài khoản theo email, đồng thời gửi email kích hoạt nếu là tài khoản mới.
- Order Service tạo đơn và event `orders.created.v1` bằng Outbox.
- Catalog Service giữ tồn kho rồi phát `inventory.reserved.v1` hoặc `inventory.rejected.v1`.
- Order Service xác nhận/hủy đơn, áp dụng/hoàn coupon và phát event kết quả.
- Catalog commit tồn kho sau `orders.confirmed.v1`; Notification Service tạo email xác nhận đơn.
- Trang trạng thái tự poll cho tới khi đơn `CONFIRMED` hoặc `REJECTED`.

Trạng thái kiểm tra ngày 18/10/2026: đã triển khai mã nguồn Phase 4; `npm test` đạt 54/54, lint và frontend build đạt (build cảnh báo bundle lớn hơn 500 kB). Đã khởi động Docker Desktop nhưng `docker compose up -d --build` bị chặn khi giải nén image Elasticsearch 8.15.3 (`unexpected EOF`, sau đó `blob not found`). Vì vậy chưa xác nhận lại checkout end-to-end trên Kafka/MongoDB thật trong lần kiểm tra này; cần chạy `npm run order:integration` sau khi Docker tải image thành công.

## Vai trò ngắn gọn của các phần

### Bổ sung hoàn thiện ngày 18/10/2026

- Checkout quá 120 giây chưa nhận kết quả tồn kho sẽ chuyển sang `REJECTED` / `CANCELLED`, hoàn lượt coupon và giữ nguyên giỏ hàng để khách thử lại. Worker quét tối đa 100 đơn mỗi 5 giây, kiểm tra lại trạng thái trong MongoDB transaction; chạy lại an toàn sau restart hoặc khi có nhiều replicas.
- Nếu `inventory.reserved.v1` đến sau khi đơn đã bị hủy, Order phát `inventory.release-requested.v1` qua Outbox. Catalog giải phóng `reservedStock` một lần; đơn không bị xác nhận lại.
- Checkout online mô phỏng bị từ chối sẽ chuyển payment sang `FAILED`; đây không phải tích hợp hoàn tiền của cổng thanh toán thật.
- Retry `checkoutId` được ràng buộc với user hoặc guest cart token ban đầu. Hai request cùng `checkoutId` gặp unique-key conflict trả về đơn đã commit nếu đúng chủ sở hữu.
- Trang xử lý đơn hiển thị thông báo nghiệp vụ bằng tiếng Việt.

### Bản đồ mã nguồn để đọc và trình bày Phase 4

Các đường dẫn dưới đây tính từ `source/`:

| Yêu cầu | File chính |
|---|---|
| API giỏ hàng, coupon, preview, đặt đơn, trạng thái | `services/order-service/src/routes/order.routes.js` và `controllers/order.controller.js` |
| Lưu giỏ guest/user, thêm/sửa/xóa/gộp giỏ | `services/order-service/src/models/cart.model.js` và `services/cart.service.js` |
| Kiểm tra coupon và giữ lượt sử dụng | `services/order-service/src/services/coupon.service.js` |
| Seed `WELCOME10`, `SAVE200K` | `services/order-service/src/seeds/seed-coupons.js` |
| Tính tiền, snapshot đơn, retry checkoutId, lưu order + Outbox | `services/order-service/src/services/checkout.service.js` |
| Model đơn, lịch sử trạng thái, index quét timeout | `services/order-service/src/models/order.model.js` |
| Xác nhận/từ chối, hoàn coupon, bù trừ kết quả giữ kho đến muộn | `services/order-service/src/services/order-workflow.service.js` |
| Quét checkout quá hạn, lifecycle worker | `services/order-service/src/services/checkout-timeout.service.js` và `order.runtime.js` |
| Producer order/release events và consumer inventory | `services/order-service/src/events/order.events.js` và `order-workflow.consumer.js` |
| Báo giá thật, giữ/commit/giải phóng tồn kho | `services/catalog-service/src/services/product.service.js`, `inventory.service.js` và `events/inventory.consumer.js` |
| Tìm/tạo guest account và email activation | `services/identity-service/src/services/internal-user.service.js` |
| Email xác nhận sau event confirmed | `services/notification-service/src/events/order-confirmed.consumer.js`, `services/email-worker.service.js` |
| Transaction, processed marker, Outbox publisher, retry/DLQ dùng chung | `packages/service-runtime/index.js` |
| UI giỏ hàng và badge không reload | `frontend/src/features/cart/CartContext.jsx` và `pages/cart/CartPage.jsx` |
| Form checkout và trang theo dõi kết quả | `frontend/src/pages/checkout/CheckoutPage.jsx` và `OrderProcessingPage.jsx` |
| Test nghiệp vụ và các nhánh recovery | `tests/order-phase4.test.js` và `tests/order-recovery-phase4.test.js` |
| Guest checkout qua Nginx/Gateway/Kafka | `scripts/order-integration.js` |

Để đọc theo luồng: `order.routes.js` → `order.controller.js` → `checkout.service.js` → `order.events.js` → Catalog `inventory.consumer.js` / `inventory.service.js` → Order `order-workflow.service.js` → Notification `order-confirmed.consumer.js`.

Kiểm tra riêng Phase 4 khi phát triển:

```powershell
node --test tests/order-phase4.test.js tests/order-recovery-phase4.test.js
```

Test tự động dùng mock kiểm tra timeout, hoàn coupon một lần, kết quả giữ kho đến muộn, giải phóng kho một lần, quyền retry và unique-key conflict. Kiểm thử tích hợp Kafka/MongoDB thật vẫn cần Docker hoạt động; lệnh `order:integration` hiện kiểm tra nhánh checkout thành công, chưa tự động gây lỗi timeout/race trên hạ tầng thật.

### Order Service

- `src/models`: schema `Cart`, `Coupon`, `Order` và các index MongoDB.
- `src/controllers`: nhận request, gọi service và trả response.
- `src/services/cart.service.js`: thêm/sửa/xóa/gộp giỏ; lấy giá thật từ Catalog.
- `src/services/coupon.service.js`: kiểm tra điều kiện, tính giảm giá và giữ lượt dùng coupon.
- `src/services/checkout.service.js`: preview, chống tạo trùng bằng `checkoutId`, lưu order và Outbox trong transaction.
- `src/services/order-workflow.service.js`: nhận kết quả tồn kho để xác nhận hoặc hủy đơn.
- `src/clients`: gọi internal API của Catalog và Identity bằng chữ ký nội bộ.
- `src/events`: tạo order events và consume kết quả inventory.
- `src/validations`: chỉ cho phép đúng field, kiểu dữ liệu và UUID hợp lệ.
- `src/seeds/seed-coupons.js`: seed coupon idempotent.

### Các service liên quan

- Catalog `product.service.js`: `quote()` trả snapshot giá, cost và tồn kho cho Order Service.
- Catalog `inventory.service.js`: reserve, release và commit tồn kho bằng MongoDB transaction.
- Identity `internal-user.service.js`: lấy user đang đăng nhập hoặc tìm/tạo account cho guest checkout.
- Notification `order-confirmed.consumer.js`: tạo email job xác nhận đơn theo `eventId`, không gửi trùng.

Mỗi Kafka topic của Saga dùng một consumer group riêng. Không dùng chung một `groupId` cho các consumer có danh sách topic khác nhau, vì Kafka có thể giao partition cho sai handler.

### Frontend

- `features/cart/cartApi.js`: gọi API cart, coupon, checkout và order status.
- `features/cart/CartContext.jsx`: giữ giỏ hàng dùng chung, cập nhật badge và merge guest cart.
- `pages/cart/CartPage.jsx`: sửa số lượng, xóa item và xem tạm tính.
- `pages/checkout/CheckoutPage.jsx`: nhập người nhận, địa chỉ, coupon, payment và đặt hàng.
- `pages/checkout/OrderProcessingPage.jsx`: poll trạng thái Saga và hiển thị kết quả.
- `pages/products/ProductDetailPage.jsx`: chọn variant và thêm vào giỏ.

## Luồng xử lý

```text
Frontend -> Order: place-order + checkoutId
Order -> Identity: lấy hoặc tạo user
Order -> Catalog: quote lại giá/tồn kho
Order -> Kafka: orders.created.v1
Kafka -> Catalog: giữ tồn kho
Catalog -> Kafka: inventory.reserved.v1 / inventory.rejected.v1
Kafka -> Order: xác nhận / hủy order và xử lý coupon
Order -> Kafka: orders.confirmed.v1 / orders.cancelled.v1
Kafka -> Catalog: commit tồn kho nếu confirmed
Kafka -> Notification: gửi email xác nhận nếu confirmed
```

## Chạy bằng Docker

Chạy tại thư mục `source/`:

```powershell
docker compose up -d --build
docker compose ps -a
```

Các job `mongo-init`, `kafka-init`, `identity-seed`, `catalog-seed`, `order-seed` và `search-reindex` thoát với mã `0` là đúng.

Mở giao diện:

```text
http://localhost/products
http://localhost/cart
http://localhost/checkout
```

## Kiểm tra nhanh tự động

```powershell
npm run lint
npm test
npm run build
npm run order:integration
```

`order:integration` chạy một guest checkout thật qua Nginx/Gateway, kiểm tra coupon, hai request cùng `checkoutId` gửi đồng thời, Kafka inventory Saga và tồn kho đã commit giảm đúng một sản phẩm. Mỗi lần chạy sẽ tạo một user/đơn demo, dùng một lượt `WELCOME10` và giảm tồn kho một sản phẩm. Khi kiểm tra tồn kho, nên chạy trên dữ liệu demo không có người khác đặt cùng variant.

## Kiểm tra bằng Postman

Tạo một UUID và dùng cùng giá trị đó trong header của tất cả request:

```text
x-guest-cart-token: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

### 1. Lấy `productId` và `variantId`

```http
GET http://localhost/api/v1/products?page=1&limit=12
```

Lấy `_id` của product và `_id` của một variant còn `availableStock`.

### 2. Thêm vào giỏ

```http
POST http://localhost/api/v1/cart/items
```

```json
{
  "productId": "PRODUCT_OBJECT_ID",
  "variantId": "VARIANT_OBJECT_ID",
  "quantity": 1
}
```

### 3. Kiểm tra coupon

```http
POST http://localhost/api/v1/coupons/validate
```

```json
{
  "code": "WELCOME10"
}
```

`WELCOME10` giảm 10%, tối đa 500.000đ, đơn tối thiểu 1.000.000đ. `SAVE200K` giảm 200.000đ, đơn tối thiểu 5.000.000đ.

### 4. Preview checkout

```http
POST http://localhost/api/v1/checkout/preview
```

```json
{
  "couponCode": "WELCOME10"
}
```

### 5. Đặt hàng

```http
POST http://localhost/api/v1/checkout/place-order
```

```json
{
  "checkoutId": "GENERATE_A_NEW_UUID_V4",
  "couponCode": "WELCOME10",
  "paymentMethod": "COD",
  "customer": {
    "fullName": "Nguyen Van A",
    "email": "phase4-demo@example.com",
    "phone": "0900000000"
  },
  "shippingAddress": {
    "recipientName": "Nguyen Van A",
    "phone": "0900000000",
    "addressLine": "1 Nguyen Hue",
    "ward": "Ben Nghe",
    "district": "Quan 1",
    "province": "TP HCM"
  }
}
```

Giữ nguyên `checkoutId` khi retry: API phải trả lại cùng `orderNumber`, không tạo đơn thứ hai.

### 6. Xem trạng thái

```http
GET http://localhost/api/v1/orders/ORDER_NUMBER/status
```

Kết quả cuối phải là `workflowStatus: CONFIRMED` hoặc `REJECTED`. Vẫn phải gửi đúng `x-guest-cart-token` đã dùng khi checkout.

## Xem log Saga

```powershell
docker compose logs --tail=100 order-service catalog-service notification-service
```

Nếu sửa coupon seed:

```powershell
docker compose run --rm order-seed
```

## Chưa thuộc Phase 4

- Danh sách/chi tiết đơn hàng của khách, hủy đơn và lịch sử trạng thái: Phase 5.
- Loyalty ledger, tích điểm và redeem: Phase 5.
- Thanh toán online thật: hiện chỉ mô phỏng trạng thái `PAID`.
- Trang quản trị order/coupon: Phase 7.
