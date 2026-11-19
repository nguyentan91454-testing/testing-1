# Hình ảnh trong bản demo

## Nguyên nhân và cách sửa

- Database ban đầu có 33 sản phẩm nhưng không có bản ghi trong bảng images. Seed hiện bổ sung ảnh không gian minh họa cho các sản phẩm mẫu chưa có ảnh.
- Banner trước đây tải trực tiếp từ Unsplash. Bảy ảnh không gian hiện nằm trong apps/web/public/images/scenes và được Vite phục vụ cùng website; trình duyệt không cần truy cập Unsplash để xem chúng.
- Ảnh Google có lúc trả HTTP 429. Trang hồ sơ, trang sửa hồ sơ và menu dùng chung CustomerAvatar: thử API nội bộ, sau đó thử URL Google không gửi referrer, cuối cùng hiện biểu tượng tài khoản nếu vẫn lỗi.
- Trang `/account/edit` có thể nhận ảnh JPEG, PNG hoặc WebP tối đa 5 MB. API lưu file trong `apps/api/uploads/avatars` (thư mục bị bỏ qua khỏi Git), chỉ cho chủ tài khoản đọc ảnh, kiểm tra chữ ký file và xóa ảnh cũ sau khi thay ảnh. Nút xóa ảnh cập nhật hồ sơ ngay.

GET /api/v1/auth/avatar yêu cầu đăng nhập và chỉ đọc URL ảnh của tài khoản trong phiên. Loader chỉ cho phép HTTPS thuộc googleusercontent.com, không theo redirect, giới hạn 512 KiB và 8 giây, chỉ nhận ảnh raster. Cache tối đa 32 ảnh trong bộ nhớ, gộp các lần tải đồng thời, giữ ảnh đã tải khi Google lỗi. Phản hồi trình duyệt có Cache-Control: private, no-store để tránh dùng ảnh của phiên trước.

## Phạm vi ảnh catalog

Ảnh mới thêm là **ảnh không gian minh họa**, không phải ảnh chụp từng sản phẩm. Bản ghi dùng kind=scene và nhãn thẻ sản phẩm nêu rõ điều này. Có thể thay bằng ảnh sản phẩm gốc trong Admin khi có tư liệu. Seed không ghi đè ảnh đã có và không tạo bản ghi trùng khi chạy lại.

Nguồn và giấy phép từng ảnh local được lưu tại apps/web/public/images/scenes/sources.json. Metadata catalog lưu sourceUrl và Unsplash License; không suy đoán tên tác giả.

## Công cụ

- Tải lại bộ ảnh không gian nếu thiếu file: node scripts/sync-demo-images.mjs.
- Chỉ bổ sung ảnh cho các SKU demo HA-*, HD-* và ba SKU đèn ban đầu, không chạy lại toàn bộ seed: pnpm --filter @commerce/api exec tsx prisma/seed-images.ts.
- pnpm dev cũng bổ sung ảnh còn thiếu qua seed thông thường.

Đã kiểm tra cả 7 file local trả HTTP 200 với dữ liệu JPEG, 33/33 sản phẩm có URL ảnh tải được, API avatar trả PNG thành công qua phiên thử và lần tải lặp lại. Tài khoản thử được xóa sau kiểm tra.
