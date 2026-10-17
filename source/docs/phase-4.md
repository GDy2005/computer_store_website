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

## Vai trò ngắn gọn của các phần

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

`order:integration` chạy một guest checkout thật qua Nginx/Gateway, kiểm tra coupon, idempotency và Kafka inventory Saga. Mỗi lần chạy sẽ tạo một user/đơn demo, dùng một lượt `WELCOME10` và giảm tồn kho một sản phẩm.

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
