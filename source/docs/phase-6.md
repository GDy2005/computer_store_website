# Phase 6 — Comments, ratings và WebSocket

**Trạng thái Phase 6: hoàn tất.**

## Chức năng

### Guest comment

- `GET /api/v1/products/:id/comments?page=1&limit=10` đọc comment mới nhất.
- `POST /api/v1/products/:id/comments` cho phép cả guest và user đăng nhập.
- Guest phải nhập `guestName`, `guestEmail` và `content`.
- User đăng nhập chỉ gửi `content`; tên hiển thị được lấy từ Identity Service.
- HTML bị loại bỏ bằng `sanitize-html`; email guest không xuất hiện trong API/event.
- Comment được lưu cùng `comments.created.v1` trong một MongoDB transaction.

### Authenticated rating và average cache

- `GET /api/v1/products/:id/ratings` trả average, tổng lượt, phân bố sao và
  `myRating` nếu request có session.
- `PUT /api/v1/products/:id/rating` yêu cầu đăng nhập và nhận số nguyên `1..5`.
- Unique index `{productId, userId}` bảo đảm mỗi user chỉ có một rating/product;
  request sau cập nhật rating cũ.
- Sau mỗi upsert, Catalog Service tính lại và cache `averageRating`,
  `ratingCount` trong product rồi ghi `ratings.updated.v1` vào Outbox.

### Realtime

```text
Catalog REST -> catalog_db + Outbox -> Kafka
  -> realtime-gateway-group -> Socket.IO room product:<productId>
  -> Product detail cập nhật comment/rating không reload
```

- Event phía trình duyệt: `comment.created`, `rating.updated`.
- Socket chỉ được join room khi product ID là MongoDB ObjectId hợp lệ.
- Hai Gateway cùng consumer group; Socket.IO Redis adapter chuyển event tới
  client ở mọi Gateway replica.
- Client chỉ dùng WebSocket transport nên không cần sticky session cho polling.
- REST API vẫn là source of truth; mất realtime tạm thời không làm mất dữ liệu.

## File chính

| Vai trò | File |
|---|---|
| Comment model/service/API | `services/catalog-service/src/models/comment.model.js`, `services/comment.service.js`, `routes/comment.routes.js` |
| Rating model/service/API | `services/catalog-service/src/models/rating.model.js`, `services/rating.service.js`, `routes/rating.routes.js` |
| Catalog Outbox event | `services/catalog-service/src/events/catalog-events.js` |
| Kafka → Socket.IO Gateway | `api-gateway/src/services/realtime.service.js` |
| Khởi động HTTP + realtime | `api-gateway/src/server.js` |
| Nginx WebSocket proxy | `infra/nginx/nginx.conf` |
| Frontend API/realtime | `frontend/src/features/feedback/feedbackApi.js`, `useProductRealtime.js` |
| Giao diện feedback | `frontend/src/features/feedback/ProductFeedback.jsx` |
| Integration test | `scripts/phase6-integration.js` |

## Kiểm tra tự động

Chạy tại thư mục `source/`:

```powershell
npm test
npm run lint
npm run build
npm run phase6:integration
```

Integration script tạo một guest comment và upsert rating `5` sao của tài khoản
admin trên product đầu tiên để kiểm tra dữ liệu thật; chạy lại sẽ tạo thêm một
comment test nhưng không tạo trùng rating admin.

Kết quả xác nhận cuối Phase 6:

- `npm test`: 78/78 test đạt.
- `npm run lint`: đạt.
- `npm run build`: đạt.
- `npm run phase6:integration`: kiểm tra guest comment, email privacy,
  authenticated rating, average cache và Kafka → Socket.IO realtime.

## Kiểm tra thủ công trên giao diện

```powershell
docker compose up -d --build
```

1. Mở `http://localhost/products` và chọn một sản phẩm.
2. Kéo xuống **Bình luận và đánh giá**; chờ chip báo
   **Realtime đã kết nối**.
3. Khi chưa đăng nhập, nhập tên, email và comment rồi bấm
   **Gửi bình luận**.
4. Mở cùng sản phẩm ở tab ẩn danh thứ hai. Comment mới phải xuất hiện ở cả
   hai tab mà không reload.
5. Đăng nhập, quay lại sản phẩm, chọn `1..5` sao và bấm
   **Lưu đánh giá**. Điểm trung bình và tổng lượt phải cập nhật realtime.
6. Đăng xuất rồi thử gọi rating bằng Postman; API phải trả `401`.

Xem log realtime nếu cần:

```powershell
docker compose logs -f gateway-1 gateway-2 catalog-service
```

Kiểm tra API nhanh bằng PowerShell:

```powershell
Invoke-RestMethod http://localhost/api/v1/products/<PRODUCT_ID>/comments
Invoke-RestMethod http://localhost/api/v1/products/<PRODUCT_ID>/ratings
```

Thay `<PRODUCT_ID>` bằng `_id` lấy từ API product hoặc DevTools Network.
