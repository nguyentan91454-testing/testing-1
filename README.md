# Home & Decor Commerce

Đồ án thương mại điện tử đồ gia dụng và trang trí. Toàn bộ đơn và thanh toán hiện ở chế độ demo; không nhận tiền thật.

## Backend hiện có

- Express 5 + TypeScript strict, Zod configuration, Helmet, CORS allowlist, rate limit và structured logging.
- PostgreSQL + Prisma với các mô hình catalog, biến thể, giỏ, đơn, thanh toán, vận chuyển, coupon, chatbot và audit.
- Module thuần tính giá VND và quy tắc chuyển trạng thái đơn, có unit test.
- Catalog: `GET /api/v1/products` (lọc, sắp xếp, phân trang, tìm không dấu), `GET /api/v1/products/:slug`.
- Giỏ khách vãng lai: `GET/POST/PATCH/DELETE /api/v1/cart` với session cookie HttpOnly; giá luôn lấy từ DB.
- Checkout demo: `POST /api/v1/orders`, cần header `Idempotency-Key`; kiểm tra tồn kho và tạo snapshot đơn trong transaction.
- Admin riêng: `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/logout`, `GET /api/v1/admin/auth/me`; xem/chuyển trạng thái đơn qua `/api/v1/admin/orders`. Mọi route Admin cần session cookie và quyền kiểm tra tại API.
- Health endpoints: `/api/v1/health/live` và `/api/v1/health/ready`.

## Chạy local

Yêu cầu Node 22+, pnpm 12+ và Docker.

```powershell
Copy-Item .env.example .env
docker compose up -d db mailpit
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm test
pnpm dev:api
```

API mặc định chạy tại `http://localhost:4000`; Mailpit tại `http://localhost:8025`.

Seed tạo admin từ `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD` trong `.env`. Đổi cả mật khẩu mẫu và `JWT_ACCESS_SECRET` trước khi đưa lên môi trường public. Checkout và VietQR hiện là demo, không kết nối ngân hàng thật.

Các phần backend còn lại theo PRD gồm OAuth Google cho khách hàng, xác nhận thanh toán giả lập/webhook, worker hết hạn giữ hàng, email, vận chuyển và chatbot.

