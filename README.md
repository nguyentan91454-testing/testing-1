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
- Lighting calculator dùng chung web và bot: `GET /api/v1/lighting/room-types`, `POST /api/v1/lighting/calculate`.
- Chatbot: `POST /api/v1/chat/messages`, `POST /api/v1/chat/session/reset`, gửi phản hồi qua `PATCH /api/v1/chat/messages/:messageId/feedback`. Phiên chat lưu bằng cookie HttpOnly; tra đơn khách cần `orderVerification` gồm mã đơn và 4 số cuối điện thoại, còn tên/số điện thoại liên hệ gửi riêng trong `contactDetails` để không đưa vào prompt AI.
- Admin chatbot: `GET/PUT /api/v1/admin/chatbot/settings`, `GET /api/v1/admin/chatbot/usage`, xem hội thoại tại `/api/v1/admin/chatbot/sessions`, xử lý yêu cầu liên hệ tại `/api/v1/admin/chatbot/contact-requests`.

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

Chatbot dùng Gemini khi `AI_PROVIDER=gemini` và `GEMINI_API_KEY` được cấu hình; mặc định `AI_PROVIDER=mock` chỉ lọc sản phẩm từ database. Ngân sách và chế độ demo chỉnh trong Admin. Các phần backend còn lại theo PRD gồm recommendations/ML, vận chuyển và các tích hợp giao diện.

