# Bonus evidence index

Thư mục này là mục lục bằng chứng cho các bonus và kiểm thử hệ thống. Không lưu API key, `.env`,
cookie, access token hoặc dữ liệu cá nhân trong ảnh/log nộp bài.

| Hạng mục | Source chính | Test/bằng chứng chạy |
|---|---|---|
| CI/CD | `../.github/workflows/ci.yml` | GitHub Actions run và artifact `ci-evidence` |
| Microservices | `docker-compose.yml`, `api-gateway/src/app.js` | `GET /api/v1/foundation/status`, `docker compose ps` |
| Hai Gateway + Nginx | `infra/nginx/nginx.conf` | `scripts/system-integration.js` kiểm tra cả `gateway-1` và `gateway-2` |
| Kafka consumer groups | `packages/service-runtime/index.js` | Hai replica Notification và `kafka-consumer-groups.sh --describe --all-groups` |
| Retry và DLQ | `packages/service-runtime/index.js` | `npm run smoke` chạy normal/retry/poison probe |
| Socket.IO Redis | `api-gateway/src/services/realtime.service.js` | System test gửi event xuyên hai Socket.IO server qua Redis |
| Elasticsearch | `services/search-service/` | System test kiểm tra index có ít nhất 40 document |
| AI grounded | `services/ai-service/` | System test kiểm tra product ID, giá và URL đều từ Search |
| Automated QA | `tests/`, `scripts/*-integration.js` | `npm test`, `npm run lint`, `npm run build` |

## Lệnh thu thập bằng chứng local

```powershell
docker compose up -d --build
npm run smoke
npm run system:integration
docker compose ps -a
docker compose exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups
docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count
```

Khi quay video hoặc chụp screenshot, nên thu lần lượt:

1. `docker compose ps` hiển thị hai Gateway và hai Notification replicas healthy.
2. Nhiều lần gọi `/health/live` trả cả hai giá trị `x-gateway-instance`.
3. Kafka consumer groups có ít nhất hai member ở các group Notification.
4. Elasticsearch `_count` có ít nhất 40 sản phẩm.
5. Chatbot trả thẻ sản phẩm mở được URL thật.
6. GitHub Actions xanh và có artifact `ci-evidence`.

Không đặt ảnh giả vào repository. Chỉ thêm screenshot/log được tạo từ lần chạy thật cuối cùng.
