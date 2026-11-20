# Home & Decor Commerce

## Quick start

Requirements: Node.js 22+, pnpm 12+, and Docker Desktop running.

After cloning the project, run `pnpm install` once. Ensure `.env` exists (copy `.env.example` if needed), then start the full local stack with:

```powershell
pnpm dev
```

This starts the Docker services, waits for them to become healthy, generates the Prisma client, applies database migrations, and runs the API and storefront. Open `http://localhost:5173`.

Public menu filters: `GET /api/v1/categories` (active categories only), `GET /api/v1/spaces`, and `GET /api/v1/styles`; all are sorted by `sortOrder`, then `name`.

Production deployment is documented in [docs/production-deploy.md](docs/production-deploy.md).

## Frontend

The mobile-first React storefront lives in `apps/web`. It includes home discovery by room and style, catalog filters, product detail, cart, demo checkout, lighting calculator, and an API-backed consultation chat.

Vite runs at `http://localhost:5173` and proxies `/api` to the API at `http://localhost:4000`. The startup command seeds the demo catalog and admin account.

Đồ án thương mại điện tử đồ gia dụng và trang trí. Toàn bộ đơn và thanh toán hiện ở chế độ demo; không nhận tiền thật.

## Backend hiện có

- Express 5 + TypeScript strict, Zod configuration, Helmet, CORS allowlist, rate limit và structured logging.
- PostgreSQL + Prisma với các mô hình catalog, biến thể, giỏ, đơn, thanh toán, vận chuyển, coupon, chatbot và audit.
- Module thuần tính giá VND và quy tắc chuyển trạng thái đơn, có unit test.
- Catalog: `GET /api/v1/products` (lọc, sắp xếp, phân trang, tìm không dấu), `GET /api/v1/products/:slug`.
- Ảnh catalog dùng bucket Cloudflare R2 public `konyappi-shop` khi `R2_PUBLIC_BASE_URL` trỏ tới Public Development URL thực `https://pub-....r2.dev`. Có thể dùng Custom Domain bằng cùng biến. Khi chưa cấu hình, web và API tiếp tục dùng ảnh trong `apps/web/public/images`.
- Người dùng có thể đổi hoặc xóa avatar JPEG/PNG/WebP tối đa 5 MB tại `/account/edit`. Bucket `konyappi-shop-private` giữ public access tắt và API cấp link đọc ngắn hạn. Nếu thiếu cấu hình R2, API dùng filesystem.
- Chạy `node scripts/upload-catalog-to-r2.mjs` và `node scripts/migrate-avatars-to-r2.mjs` từ thư mục gốc. Giữ Access Key và Secret Key ngoài Git. Xem cách bật URL và kiểm tra ảnh sau khi chuyển. [Hướng dẫn quản lý ảnh](docs/images.md)
- Giỏ khách vãng lai: `GET/POST/PATCH/DELETE /api/v1/cart` với session cookie HttpOnly; giá luôn lấy từ DB.
- Mã giảm giá áp dụng/xóa tại `POST/DELETE /api/v1/cart/coupon`; cần đăng nhập Google để áp dụng và checkout kiểm tra lại điều kiện, lượt dùng, danh tính, giá giảm trong transaction.
- Checkout demo: `POST /api/v1/orders`, cần header `Idempotency-Key`; kiểm tra tồn kho và tạo snapshot đơn trong transaction, trả token tra cứu có chữ ký hạn 30 ngày.
- Theo dõi đơn công khai: gọi `GET /api/v1/orders/track/:orderCode`, `GET /api/v1/orders/track/:orderCode/qr` hoặc `POST /api/v1/orders/track/:orderCode/confirm-payment` cùng header `x-order-tracking-token` nhận từ checkout/email. Endpoint chỉ trả thông tin đơn tối thiểu; token không xuất hiện trong URL API. Mock confirm bị tắt trong production trừ khi đặt `ALLOW_MOCK_PAYMENTS=true`.
- Admin riêng: `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/logout`, `GET /api/v1/admin/auth/me`; xem/chuyển trạng thái đơn qua `/api/v1/admin/orders`. Mọi route Admin cần session cookie và quyền kiểm tra tại API.
- Admin đơn hàng: xem chi tiết qua `GET /api/v1/admin/orders/:orderId` (items, payments, shipment, timeline, ghi chú, khiếu nại, email logs); thêm ghi chú nội bộ qua `POST /api/v1/admin/orders/:orderId/notes`. Admin contact requests tại `GET /api/v1/admin/chatbot/contact-requests` và đổi trạng thái qua `PATCH /api/v1/admin/chatbot/contact-requests/:requestId`.
- Admin shipping demo: tạo vận đơn mock cho đơn đang `PACKING` qua `POST /api/v1/admin/orders/:orderId/shipment`; xem qua `GET /api/v1/admin/orders/:orderId/shipment`. Tạo vận đơn đồng thời chuyển đơn sang `SHIPPED`, ghi timeline/audit và xếp email thông báo.
- Health endpoints: `/api/v1/health/live` và `/api/v1/health/ready`.
- Lighting calculator dùng chung web và bot: `GET /api/v1/lighting/room-types`, `POST /api/v1/lighting/calculate`.
- Chatbot: `POST /api/v1/chat/messages`, `POST /api/v1/chat/session/reset`, gửi phản hồi qua `PATCH /api/v1/chat/messages/:messageId/feedback`. Phiên chat lưu bằng cookie HttpOnly; tra đơn khách cần `orderVerification` gồm mã đơn và 4 số cuối điện thoại, còn tên/số điện thoại liên hệ gửi riêng trong `contactDetails` để không đưa vào prompt AI.
- Admin chatbot: `GET/PUT /api/v1/admin/chatbot/settings`, `GET /api/v1/admin/chatbot/usage`, xem hội thoại tại `/api/v1/admin/chatbot/sessions`, xử lý yêu cầu liên hệ tại `/api/v1/admin/chatbot/contact-requests`.

## Chạy local

Yêu cầu Node 22+, pnpm 12+ và Docker.

```powershell
pnpm install # once after cloning
pnpm dev     # each time you start the app
```

If `.env` is missing, create it once with `Copy-Item .env.example .env` before starting.

API mặc định chạy tại `http://localhost:4000`; Mailpit tại `http://localhost:8025`.

Seed tạo admin từ `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD` trong `.env`. Đổi cả mật khẩu mẫu và `JWT_ACCESS_SECRET` trước khi đưa lên môi trường public. Checkout và VietQR hiện là demo, không kết nối ngân hàng thật.

Chatbot dùng Gemini khi `AI_PROVIDER=gemini` và `GEMINI_API_KEY` được cấu hình; mặc định `AI_PROVIDER=mock` chỉ lọc sản phẩm từ database. Ngân sách và chế độ demo chỉnh trong Admin. Các phần backend còn lại theo PRD gồm recommendations/ML, vận chuyển và các tích hợp giao diện.

## Xác thực khách hàng

- Đăng ký email/mật khẩu yêu cầu xác minh email trước khi đăng nhập; không tạo session khi đăng ký. Liên kết xác minh có hiệu lực 24 giờ, được xử lý tại `GET /api/v1/auth/verify-email?token=...`.
- Gửi lại liên kết qua `POST /api/v1/auth/resend-verification` với `{ email }`, giới hạn 3 lần/15 phút. Gửi thư xác minh qua Gmail SMTP khi đã cấu hình `GMAIL_USER` và `GMAIL_APP_PASSWORD`; nếu không, dùng `RESEND_API_KEY` và `EMAIL_FROM`. Khi cả hai chưa được cấu hình trong development, thư xác minh được gửi vào Mailpit tại `http://localhost:8025`. Production không dùng Mailpit và không log token xác minh.
- Trang `/account` hiển thị phương thức đăng nhập, cho phép đặt mật khẩu cho tài khoản chỉ dùng Google, đổi mật khẩu và gỡ liên kết Google khi đã có mật khẩu. Đổi mật khẩu sẽ thu hồi các session khác, giữ session hiện tại.
- Trang `/account/edit` cập nhật tên, SĐT liên hệ và một địa chỉ mặc định. Tài khoản Google mới được chuyển tới màn hình này và có thể bỏ qua. Checkout tự điền hồ sơ, cho phép đổi người nhận và chỉ lưu SĐT/địa chỉ mới khi khách bấm nút lưu sau khi tạo đơn. Xem [chi tiết luồng hồ sơ](docs/customer-profile-flow.md).
- Đăng nhập Google qua Firebase tự xác minh email Google đã được Firebase chứng thực. Nếu trùng tài khoản email/mật khẩu chưa xác minh, hệ thống liên kết Firebase và xóa mật khẩu chưa được xác minh; khách có thể đặt mật khẩu mới sau khi đăng nhập. Liên kết chủ động từ `/account` yêu cầu email Google trùng email tài khoản.
- Migration `20261114090000_email_verification` xác minh sẵn tài khoản Google-only cũ; các tài khoản có mật khẩu cũ cần xác minh email và các session chưa xác minh sẽ bị thu hồi. `pnpm dev` tự áp dụng migration; cũng có thể chạy `pnpm --filter @commerce/api db:deploy`.

### Gửi xác minh bằng Gmail

1. Bật **Xác minh 2 bước** tại <https://myaccount.google.com/security> cho Gmail gửi thư.
2. Mở <https://myaccount.google.com/apppasswords>, đặt tên ứng dụng `Konyappi Shop`, tạo mật khẩu ứng dụng 16 ký tự. Nếu không thấy tùy chọn này, kiểm tra đã bật Xác minh 2 bước; một số tài khoản cơ quan/trường học hoặc có chính sách bảo vệ không hỗ trợ mật khẩu ứng dụng.
3. Điền trực tiếp trong file `.env` (không gửi mật khẩu qua chat và không dùng mật khẩu đăng nhập Google thông thường):

   ```dotenv
   GMAIL_USER=dia-chi-gui-thu@gmail.com
   GMAIL_APP_PASSWORD=mat-khau-ung-dung-16-ky-tu
   ```

4. Khởi động lại API (`pnpm dev:api`, hoặc dừng và chạy lại `pnpm dev:all`), rồi nhấn **Gửi lại email xác minh** trên trang đăng nhập. Kiểm tra cả thư mục thư rác. Gmail gửi từ chính địa chỉ `GMAIL_USER`, không cần cấu hình Google OAuth Client cho việc gửi email.

Khi chạy trên máy khác hoặc triển khai public, đặt `API_BASE_URL` và `APP_BASE_URL` thành URL mà người nhận có thể truy cập; URL `localhost` chỉ mở được trên máy đang chạy project. Cấu hình Gmail này áp dụng cho thư xác minh tài khoản; email đơn hàng vẫn dùng Resend.

### Đăng nhập Google qua Firebase

Ứng dụng dùng Firebase Authentication cho nút đăng nhập/liên kết Google. Gmail SMTP vẫn chỉ dùng để gửi email xác minh tài khoản.

1. Tạo Firebase project tại <https://console.firebase.google.com/> rồi mở **Authentication → Sign-in method** và bật **Google**.
2. Mở **Project settings → General → Your apps**. Tạo ứng dụng Web nếu project chưa có, rồi chép `apiKey`, `authDomain`, `projectId` và `appId` vào `.env`:

   ```dotenv
   FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_API_KEY=your-web-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_APP_ID=your-web-app-id
   ```

3. Trong **Authentication → Settings → Authorized domains**, thêm `localhost` để chạy local và domain website khi triển khai.
4. Khởi động lại API và web. Backend xác minh Firebase ID token bằng khóa công khai của Firebase; không cần đặt Google OAuth Client Secret trong ứng dụng.

Nếu các biến trên để trống, nút Google sẽ bị vô hiệu hóa hoặc API trả về `FIREBASE_NOT_CONFIGURED`. Đăng nhập Google trên môi trường public cần HTTPS và domain đó phải có trong Authorized domains.
