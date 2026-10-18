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
