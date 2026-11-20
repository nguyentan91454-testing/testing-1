# Lưu trữ hình ảnh

## Nguyên nhân và cách sửa

- Database ban đầu có 33 sản phẩm nhưng không có bản ghi trong bảng images. Seed hiện bổ sung ảnh không gian minh họa cho các sản phẩm mẫu chưa có ảnh.
- Bảy ảnh catalog dùng lại cho scene và banner nằm trong `apps/web/public/images/scenes`. Khi đặt `R2_PUBLIC_BASE_URL`, API trả URL R2 cho các đường dẫn ảnh local của catalog, giỏ hàng, bộ lọc không gian/phong cách và chatbot. Bản build web dùng cùng biến để tải scene và banner.
- Ảnh Google có lúc trả HTTP 429. Trang hồ sơ, trang sửa hồ sơ và menu dùng chung CustomerAvatar: thử API nội bộ, sau đó thử URL Google không gửi referrer, cuối cùng hiện biểu tượng tài khoản nếu vẫn lỗi.
- Trang `/account/edit` nhận JPEG, PNG hoặc WebP tối đa 5 MB và kiểm tra chữ ký file. Khi API có đủ thông tin R2, ảnh tải lên được lưu vào bucket riêng tư. Nếu thiếu cấu hình, API dùng `apps/api/uploads/avatars` như trước.

`GET /api/v1/auth/avatar` yêu cầu đăng nhập. Với ảnh R2, endpoint trả redirect tới presigned URL có hạn 900 giây. Nếu R2 lỗi hoặc chưa có object, API thử bản local trước khi trả lỗi ảnh. Khi trình duyệt tải ảnh private thất bại, giao diện thử cấp lại URL một lần rồi hiện biểu tượng tài khoản. Đường dẫn Google tiếp tục dùng proxy ảnh hiện tại.

## Phạm vi ảnh catalog

Ảnh mới thêm là **ảnh không gian minh họa**, không phải ảnh chụp từng sản phẩm. Bản ghi dùng kind=scene và nhãn thẻ sản phẩm nêu rõ điều này. Có thể thay bằng ảnh sản phẩm gốc trong Admin khi có tư liệu. Seed không ghi đè ảnh đã có và không tạo bản ghi trùng khi chạy lại.

Nguồn và giấy phép từng ảnh local được lưu tại apps/web/public/images/scenes/sources.json. Metadata catalog lưu sourceUrl và Unsplash License; không suy đoán tên tác giả.

## Chuyển ảnh lên Cloudflare R2

- `konyappi-shop` là bucket public cho ảnh catalog. Bật **Public Development URL** và dùng URL thực có dạng `https://pub-....r2.dev`. Khi đưa vào production chính thức, có thể đổi sang Custom Domain bằng cách cập nhật `R2_PUBLIC_BASE_URL` rồi khởi động lại API và build lại web.
- `konyappi-shop-private` là bucket riêng tư cho ảnh đại diện. Giữ **Public Development URL** tắt và không gắn domain public cho bucket này.
- Cấu hình `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` phía API hoặc trong `.env` local, với token Object Read & Write cho hai bucket. Giữ Access Key và Secret Key trong biến môi trường/secret manager, không commit chúng hoặc đưa vào biến `VITE_*`.

1. Điền thông tin R2 trong `.env` ở thư mục gốc. Để trống `R2_PUBLIC_BASE_URL` trong lúc upload catalog lần đầu.

   ```powershell
   node scripts/upload-catalog-to-r2.mjs
   node scripts/migrate-avatars-to-r2.mjs
   ```

2. Sau khi upload catalog thành công, điền Public Development URL thực vào `R2_PUBLIC_BASE_URL` rồi chạy lại `node scripts/upload-catalog-to-r2.mjs`. Lần chạy này kiểm tra URL công khai và Content-Type từng ảnh bằng HEAD trước khi bạn bật cấu hình trên API và bản build web. Key catalog có dạng `scenes/<filename>` và cache một năm, nên dùng tên file mới nếu thay nội dung.
3. Khởi động lại API và Vite hoặc build lại web. Mở trang chủ, sản phẩm và giỏ hàng, kiểm tra request ảnh trả 200 từ Public Development URL. Đăng nhập, mở `/account/edit`, đổi rồi xóa ảnh thử. Trong Network, kiểm tra endpoint avatar trả redirect `no-store`, URL có hạn 900 giây, và ảnh xuất hiện trước khi xóa. Trong dashboard R2, kiểm tra object private đã bị xóa.

Hai script bỏ qua object đã có, báo lỗi nếu checksum đã lưu khác với file local, và giữ nguyên các file local. Script catalog đọc ảnh có trong `apps/web/public/images` và không tải lại ảnh ngoài đang được liên kết trong catalog. Script avatar giữ nguyên tên file UUID làm key và không sửa database. Đường dẫn catalog trong database vẫn có thể dùng với ảnh local khi bỏ cấu hình public.

## Công cụ

- Tải lại bộ ảnh không gian nếu thiếu file: node scripts/sync-demo-images.mjs.
- Chỉ bổ sung ảnh cho các SKU demo HA-*, HD-* và ba SKU đèn ban đầu, không chạy lại toàn bộ seed: pnpm --filter @commerce/api exec tsx prisma/seed-images.ts.
- pnpm dev cũng bổ sung ảnh còn thiếu qua seed thông thường.
