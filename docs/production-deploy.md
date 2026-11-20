# Triển khai production

## Điều kiện bắt buộc

- PostgreSQL 16 có extension `vector` và Redis 7.
- API và web chạy sau HTTPS.
- `APP_BASE_URL` là URL công khai của web, `API_BASE_URL` là URL công khai của API.
- `API_CORS_ORIGINS` chỉ chứa origin của web production.
- `JWT_ACCESS_SECRET` là chuỗi ngẫu nhiên tối thiểu 32 ký tự.
- `ADMIN_BOOTSTRAP_PASSWORD` đã được đổi khỏi giá trị mẫu.
- Cấu hình một nhà cung cấp email giao dịch bằng `RESEND_API_KEY` hoặc Gmail SMTP với `GMAIL_USER` và `GMAIL_APP_PASSWORD`.
- Firebase production đã thêm domain web vào Authorized domains nếu dùng đăng nhập Google.

## Luồng khách hàng production hiện có

Khách có thể xem catalog, thêm sản phẩm vào giỏ khách, đăng nhập để hợp nhất giỏ, nhập địa chỉ, đặt COD, nhận email xác nhận, theo dõi đơn bằng mã đơn và số điện thoại, rồi nhận email khi đơn được giao hoặc hủy. Checkout kiểm tra lại giá và tồn kho trong transaction, dùng idempotency key để retry an toàn.

Khi `NODE_ENV=production`, mã VietQR giả lập và nút xác nhận thanh toán giả lập bị vô hiệu hóa. COD vẫn hoạt động. Đơn có chính sách bắt buộc trả trước sẽ bị từ chối cho tới khi tích hợp cổng thanh toán thật.

Quản trị viên cần nhập tên hãng vận chuyển và mã vận đơn thật khi chuyển đơn từ `PACKING` sang `SHIPPED`. Môi trường development vẫn có thể tạo vận đơn mock để kiểm thử.

## Biến môi trường production tối thiểu

```dotenv
NODE_ENV=production
API_PORT=4000
API_CORS_ORIGINS=https://shop.example.com
DATABASE_URL=postgresql://user:password@db.example.com:5432/ecommerce?schema=public
REDIS_URL=redis://redis.example.com:6379
JWT_ACCESS_SECRET=generate-a-random-secret-at-least-32-characters
ADMIN_BOOTSTRAP_EMAIL=admin@shop.example.com
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-password
ALLOW_MOCK_PAYMENTS=false
APP_BASE_URL=https://shop.example.com
API_BASE_URL=https://api.shop.example.com
RESEND_API_KEY=re_...
EMAIL_FROM=Shop <orders@shop.example.com>
```

Không đưa `.env` vào git. Chạy migration bằng `pnpm --filter @commerce/api db:deploy`, sau đó chạy seed một lần để tạo catalog và tài khoản quản trị.

## Kiểm tra sau deploy

```powershell
Invoke-RestMethod https://api.shop.example.com/api/v1/health/live
Invoke-RestMethod https://api.shop.example.com/api/v1/health/ready
```

Tạo một đơn COD giá trị nhỏ, kiểm tra email xác nhận, tra cứu đơn bằng mã và số điện thoại, rồi chuyển đơn qua `CONFIRMED`, `PACKING`, `SHIPPED`. Kiểm tra tồn kho sau khi hủy một đơn trước khi giao.
