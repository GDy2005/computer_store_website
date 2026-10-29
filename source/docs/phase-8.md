# Phase 8 — AI chatbot có căn cứ từ catalog

**Trạng thái: hoàn tất phần mã nguồn và kiểm tra tĩnh/tự động.** Integration test thật cần
Docker Desktop đang chạy.

Chatbot Phase 8 chỉ tư vấn năm nhóm đang có trong cửa hàng: laptop, màn hình, bàn phím,
chuột và SSD/lưu trữ. Nó không tự tạo sản phẩm, giá, tồn kho hay đường dẫn.

## Luồng xử lý

```text
ChatWidget
  -> POST /api/v1/ai/chat
  -> API Gateway ký internal context
  -> AI Service trích xuất category/brand/ngân sách/nhu cầu
  -> Search Service trả ứng viên thật từ Elasticsearch
  -> OpenAI tùy chọn chỉ chọn productId trong tập ứng viên
  -> AI Service gắn lại tên, giá và /products/:slug từ Search
```

Khi chưa cấu hình provider, provider lỗi hoặc hết quota, service tự chọn tối đa ba kết quả
Search đầu tiên. Vì vậy chức năng chính vẫn chạy được và không phát sinh chi phí API.

## Vai trò file chính

| File | Vai trò |
|---|---|
| `services/ai-service/src/services/intent.service.js` | Hiểu danh mục, brand, ngân sách và từ khóa tiếng Việt bằng luật xác định |
| `services/ai-service/src/clients/search-client.service.js` | Gọi Search Service bằng internal token |
| `services/ai-service/src/services/chat.service.js` | Điều phối tìm kiếm, scope guard và fallback; chỉ trả sản phẩm thật |
| `services/ai-service/src/services/ai-provider.service.js` | Adapter OpenAI Responses API tùy chọn; đầu ra chỉ gồm `productId` |
| `services/ai-service/src/prompts/product-advisor.prompt.js` | Prompt và dữ liệu tối thiểu gửi provider |
| `services/ai-service/src/controllers/chat.controller.js` | Nhận request MVC và trả response chuẩn |
| `services/ai-service/src/validations/chat.validation.js` | Chỉ nhận `message` dài 2–800 ký tự; từ chối history/field thừa |
| `frontend/src/features/chatbot/ChatWidget.jsx` | Hộp chat responsive, gợi ý mẫu và thẻ liên kết sản phẩm |
| `tests/ai-phase8.test.js` | Test intent, grounding, privacy, fallback và internal client |
| `scripts/ai-integration.js` | Kiểm tra end-to-end qua Gateway với catalog/search thật |

AI Service không có database. Nội dung đang hiển thị chỉ nằm trong state của trình duyệt và
mỗi request chỉ gửi câu hỏi hiện tại. Provider không nhận câu hỏi thô, session, user, địa chỉ
hay lịch sử đơn; nó chỉ nhận intent đã chuẩn hóa cùng các ứng viên công khai từ Search.

## Cấu hình

Chế độ mặc định trong `.env`:

```dotenv
AI_PROVIDER=fallback
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER_TIMEOUT_MS=8000
```

Chế độ này đủ để chạy và demo toàn bộ guardrail. Nếu muốn dùng OpenAI để xếp hạng ứng viên,
đổi `AI_PROVIDER=openai`, điền key và một model hỗ trợ Structured Outputs. Không commit `.env`.
Adapter dùng Responses API với `store: false` và JSON Schema; xem
[OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses).

## Test trên giao diện

Từ thư mục `source/`:

```powershell
docker compose up -d --build
docker compose ps
```

Mở `http://localhost`, bấm **Tư vấn AI** ở góc phải dưới rồi thử:

- `Laptop gaming dưới 30 triệu`
- `Chuột Logitech không dây`
- `SSD khoảng 4 triệu`
- `Tư vấn điện thoại dưới 10 triệu` — phải bị scope guard từ chối

Mỗi sản phẩm gợi ý phải có giá và nút **Xem sản phẩm** mở đúng trang `/products/:slug`.
Chatbot không khẳng định số lượng tồn kho.

## Test bằng lệnh

Không cần provider/key:

```powershell
$body = @{ message = 'Laptop gaming dưới 30 triệu' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost/api/v1/ai/chat -ContentType 'application/json' -Body $body
```

Kiểm tra tự động:

```powershell
npm test
npm run lint
npm run build
npm run ai:integration
```

Xem log:

```powershell
docker compose logs -f ai-service search-service gateway-1 gateway-2
```
