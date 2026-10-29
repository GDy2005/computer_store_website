# Phase 7 — Admin và Analytics

Phase 7 hoàn thiện khu vực quản trị theo đúng phạm vi của đề bài: sản phẩm/tồn kho,
danh mục, người dùng, đơn hàng, coupon và dashboard. Không bổ sung phân quyền nhiều
cấp, hoàn tiền, cấu hình hệ thống hoặc các chức năng admin ngoài yêu cầu.

**Trạng thái Phase 7: hoàn tất.** Unit/contract test, lint, frontend production build
và Docker Compose config đều đã đạt; integration test thật cần Docker Desktop đang chạy.

## Luồng tổng quát

```text
Admin browser
  -> API Gateway (session + signed internal context)
  -> Identity Service: users, ban/unban
  -> Catalog Service: categories, products, variants/stock
  -> Order Service: orders, status, coupons
  -> Analytics Service: dashboard read models

Identity/Catalog/Order -> Outbox -> Kafka -> Analytics projections
```

Mỗi business service vẫn tự kiểm tra `role === ADMIN`; frontend guard chỉ dùng để
điều hướng và không phải lớp bảo mật. Analytics Service không đọc database của service
khác mà chỉ xây read model từ event Kafka. Vì vậy số liệu dashboard có thể chậm vài giây.

## API quản trị

Tất cả endpoint sau yêu cầu đăng nhập bằng tài khoản admin:

| Nhóm | Endpoint chính |
|---|---|
| Dashboard | `GET /api/v1/admin/dashboard/summary`, `GET /api/v1/admin/dashboard/analytics` |
| Sản phẩm | `GET/POST /api/v1/admin/products`, `GET/PATCH/DELETE /api/v1/admin/products/:id` |
| Danh mục | `GET/POST /api/v1/admin/categories`, `PATCH/DELETE /api/v1/admin/categories/:id` |
| Người dùng | `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id/ban` |
| Đơn hàng | `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/:id`, `PATCH /api/v1/admin/orders/:id/status` |
| Coupon | `GET /api/v1/admin/coupons`, `POST /api/v1/admin/coupons` |

Dashboard nâng cao nhận một trong các khoảng `year`, `quarter`, `month`, `week` hoặc
`custom`. Với `custom`, truyền thêm `startDate` và `endDate` theo `YYYY-MM-DD`.

## Vai trò các file chính

| Khu vực | Vai trò |
|---|---|
| `services/identity-service/src/*/admin-user.*` | List, sửa thông tin an toàn và ban/unban customer |
| `services/order-service/src/services/admin-order.service.js` | List/detail đơn với filter và dữ liệu tài chính dành cho admin |
| `services/order-service/src/services/admin-coupon.service.js` | List usage và tạo coupon |
| `services/analytics-service/src/models/` | Các read model do Analytics sở hữu |
| `services/analytics-service/src/projections/` | Cộng/trừ projection idempotent từ event |
| `services/analytics-service/src/services/dashboard.service.js` | Tổng hợp KPI, series và phân bố sản phẩm/danh mục |
| `services/analytics-service/src/scripts/rebuild-projections.js` | Xóa riêng read model Analytics và replay event fixture |
| `frontend/src/features/admin/` | API client, ADMIN guard, layout và component dùng chung |
| `frontend/src/pages/admin/` | Các màn hình quản trị |

## Chạy và kiểm tra trên giao diện

Từ thư mục `source/`:

```powershell
docker compose up -d --build
docker compose ps
```

1. Mở `http://localhost/login`.
2. Đăng nhập bằng `ADMIN_EMAIL` và `ADMIN_INITIAL_PASSWORD` trong `.env`.
3. Chọn **Quản trị**, hoặc mở thẳng `http://localhost/admin`.
4. Kiểm tra dashboard và lần lượt các trang Sản phẩm, Danh mục, Người dùng,
   Đơn hàng, Mã giảm giá.
5. Ở Dashboard, đổi các kỳ tuần/tháng/quý/năm. Chọn **Tùy chỉnh** rồi nhập hai ngày.
6. Ở Sản phẩm, thử sửa stock của một variant. `reservedStock` không được frontend
   gửi lên hoặc ghi đè.
7. Ở Người dùng, thử ban rồi unban một customer. Tài khoản admin không thể bị ban.
8. Ở Đơn hàng, chỉ dùng các trạng thái tiếp theo được giao diện cho phép.

Nếu dashboard chưa đổi ngay sau thao tác, chờ vài giây để Kafka consumer cập nhật
projection rồi tải lại trang.

## Kiểm tra tự động

```powershell
npm test
npm run lint
npm run build
npm run admin:integration
```

Kết quả kiểm tra mã nguồn cuối Phase 7: `92/92` test đạt, lint đạt và frontend build đạt.

Xem log khi cần:

```powershell
docker compose logs -f identity-service catalog-service order-service analytics-service gateway-1 gateway-2
```

## Rebuild projection khi demo

Script rebuild chỉ được dùng khi muốn tạo lại dữ liệu đọc của Analytics từ fixture;
nó không xóa user, product hay order thuộc các service khác. Lệnh này sẽ xóa các
projection hiện tại trong `analytics_db`, vì vậy không chạy khi đang cần giữ dashboard:

```powershell
docker compose exec -T -e ANALYTICS_REBUILD_CONFIRM=true analytics-service npm run rebuild:projections --workspace @store/analytics-service
```

