# Phase 9 — Scaling, QA và submission readiness

**Trạng thái mã nguồn: hoàn tất.** Phase này không thêm nghiệp vụ bán hàng mới; nó chứng
minh hệ thống hiện tại có thể scale, kiểm thử và thu thập bằng chứng nộp bài.

## Thành phần hoàn thiện

- Nginx cân bằng tải thụ động giữa `gateway-1` và `gateway-2`, dùng upstream keep-alive.
- Session nằm trong Redis; cả hai Gateway dùng chung Socket.IO Redis adapter.
- `notification-service` và `notification-service-2` cùng tham gia ba Kafka consumer group.
- Email worker claim job nguyên tử bằng `findOneAndUpdate` và lease, tránh gửi trùng khi scale.
- Smoke test bao phủ 7 logical services, Kafka normal/retry/DLQ và hai Gateway.
- Phase 9 integration kiểm tra Nginx, consumer members, Redis adapter, demo seed,
  Elasticsearch và AI grounded.
- GitHub Actions chạy lint/test/build, Compose, integration và upload artifact bằng chứng.
- Giao diện có skip-link, reduced-motion, form/filter/chat responsive tốt hơn trên mobile.

## Vai trò file chính

| File | Vai trò |
|---|---|
| `docker-compose.yml` | Hai Gateway, hai Notification replicas và runner Phase 9 |
| `infra/nginx/nginx.conf` | Load balancing, WebSocket proxy và security headers cơ bản |
| `scripts/smoke.js` | Probe normal/retry/poison cho sáu Kafka services và health của AI |
| `scripts/system-integration.js` | Bằng chứng tích hợp scaling/Search/AI/Redis/Elasticsearch |
| `tests/submission-phase9.test.js` | Chặn regression ở Compose, Nginx, seed, CI và evidence |
| `Bonus/README.md` | Ma trận bằng chứng và checklist video/screenshot |
| `.github/workflows/ci.yml` | Pipeline cuối cùng và artifact `ci-evidence` |

## Demo seed

`docker compose up` tự chạy seed idempotent cho một admin, coupon, 5 category và 40
product. Mỗi product có ít nhất 2 variant và 3 image record. Nếu muốn dashboard có fixture
đẹp để demo, lệnh sau **chỉ xóa và tạo lại read models trong `analytics_db`**, không xóa
user, product hoặc order của service khác:

```powershell
npm run seed:demo:analytics
```

Không chạy lệnh này khi đang cần giữ số liệu dashboard thực.

## Kiểm tra local

Từ `source/`:

```powershell
npm ci --ignore-scripts
npm run lint
npm test
npm run build
docker compose --profile test config --quiet
docker compose up -d --build
npm run smoke
npm run system:integration
```

Kiểm tra trực quan:

1. Mở `http://localhost` ở desktop và viewport mobile.
2. Kiểm tra menu, filter giá, pagination, cart/checkout, admin cards và chatbot.
3. Dùng phím `Tab`; liên kết **Bỏ qua điều hướng** phải xuất hiện và đưa focus tới nội dung.
4. Gọi `http://localhost/health/live` nhiều lần và xem header `x-gateway-instance`.
5. Xem `Bonus/README.md` để thu log/screenshot cuối cùng.

CI là lần khởi động trên runner sạch; local không cần xóa named volumes đang chứa dữ liệu.
