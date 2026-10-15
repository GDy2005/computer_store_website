# Phase 3 — Catalog và tìm kiếm sản phẩm

## Kết quả hiện tại

Phase 3 đã có đủ luồng xem catalog và phần Search bonus:

- Catalog Service quản lý category, product, variant, comment, rating và tồn kho.
- Seed idempotent tạo 5 danh mục, 40 sản phẩm và 80 variants từ file JSON.
- Trang chủ hiển thị danh mục nổi bật, sản phẩm mới, bán chạy và các nhóm sản phẩm.
- Trang `/products` có keyword, category, brand, khoảng giá, rating, 6 kiểu sắp xếp và phân trang backend.
- Trang `/products/:slug` hiển thị gallery, giá, biến thể, thuộc tính và tồn kho khả dụng.
- Search Service dùng Elasticsearch `products_v1`, nhận product/rating events từ Kafka và có lệnh reindex từ Catalog.
- Catalog phát event product/comment/rating; inventory consumer xử lý reservation event phục vụ Phase 4.

## Vai trò các phần chính

### Catalog Service

- `src/models`: schema MongoDB và ràng buộc dữ liệu.
- `src/controllers`: nhận request/response HTTP, không chứa nghiệp vụ dài.
- `src/services`: xử lý nghiệp vụ catalog, filter, giá, tồn kho, comment và rating.
- `src/routes`: khai báo public/admin API theo mô hình MVC.
- `src/validations`: kiểm tra query, params và body trước khi vào controller.
- `src/events`: publish/consume Kafka và cập nhật tồn kho an toàn.
- `src/seeds/data`: dữ liệu JSON có thể chỉnh thủ công.
- `src/seeds`: đọc JSON và seed idempotent vào MongoDB.

### Search Service

- `src/controllers`, `src/services`, `src/routes`, `src/validations`: lớp HTTP theo MVC.
- `src/config/elasticsearch.js`: client Elasticsearch, tạo mapping, index và truy vấn.
- `src/clients/catalog-client.service.js`: lấy bản ghi chuẩn từ Catalog bằng internal signature.
- `src/events/search.consumer.js`: đồng bộ index khi nhận event Kafka.
- `src/scripts/reindex-products.js`: dựng lại toàn bộ index từ Catalog.
- `infra/elasticsearch/product-index-mapping.json`: mapping của index `products_v1`.

### Frontend

- `src/features/products`: API client, formatter và product card dùng lại được.
- `src/pages/HomePage.jsx`: landing page catalog.
- `src/pages/products/ProductsPage.jsx`: danh sách, filter, sort và pagination.
- `src/pages/products/ProductDetailPage.jsx`: chi tiết và lựa chọn variant.

## Chạy bằng Docker

Tại thư mục `source/`:

```powershell
docker compose up -d --build
docker compose ps -a
```

`catalog-seed` và `search-reindex` là job chạy một lần rồi thoát mã `0`; đây là trạng thái đúng, không phải container lỗi.

Nếu chỉ sửa dữ liệu seed và muốn chạy lại:

```powershell
docker compose run --rm catalog-seed
docker compose run --rm search-reindex
```

Seed dùng upsert nên có thể chạy lại. Tuy nhiên sản phẩm đã sửa tay trong database có thể bị dữ liệu JSON cập nhật lại.

## Kiểm tra trên trình duyệt hoặc Postman

Các request public không cần token:

```text
GET http://localhost/api/v1/categories?featured=true
GET http://localhost/api/v1/products?page=1&limit=12&sort=newest
GET http://localhost/api/v1/products/filters
GET http://localhost/api/v1/products?search=gaming&category=laptop&brand=ASUS&minPrice=10000000&maxPrice=50000000&minRating=0&sort=price_asc&page=1&limit=12
GET http://localhost/api/v1/products/steelseries-apex-pro-tkl-gen-3
GET http://localhost/api/v1/search?search=gaming&sort=price_asc&page=1&limit=12
```

Trang giao diện:

```text
http://localhost/
http://localhost/products
http://localhost/products/steelseries-apex-pro-tkl-gen-3
```

Kiểm tra index:

```powershell
docker compose logs search-reindex
docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count
```

Kết quả kỳ vọng hiện tại là `Indexed 40 products` và `count: 40`.

## API cần đăng nhập

- `POST /api/v1/products/:id/comments`: hỗ trợ user đăng nhập hoặc khách nhập tên/email.
- `PUT /api/v1/products/:id/rating`: user đăng nhập mới được đánh giá.
- `/api/v1/admin/categories` và `/api/v1/admin/products`: chỉ admin được CRUD.
- `POST /api/v1/admin/products/images`: chỉ admin; nhận tối đa 6 file JPEG/PNG/WebP/AVIF, mỗi file tối đa 5 MB.

Đăng nhập bằng tài khoản admin seed trong Postman và giữ cookie session để thử các route admin.

## Kiểm tra source

```powershell
npm ci --ignore-scripts
npm run lint
npm test
npm run build
npm run smoke
```

## Phần chưa thuộc Phase 3

- Nút thêm giỏ, cart, coupon, checkout và Order Saga: Phase 4.
- UI comment/rating realtime: Phase 6; API và event nền đã có.
- Giao diện CRUD admin: Phase 7; API admin đã có.
- Ảnh thật: file seed đang dùng placeholder. Cần thay bằng URL ảnh hợp lệ/Cloudinary và giữ `publicId` tương ứng trước khi demo chính thức.
