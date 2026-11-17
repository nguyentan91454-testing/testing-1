# Hồ sơ và luồng đăng nhập sau cập nhật

## Luồng tài khoản

- Google qua Firebase tạo tài khoản mới: email được xác minh bởi Firebase, tạo phiên đăng nhập và trả `isNewAccount: true`. Web mở `/account/edit?welcome=true`; tên, email và ảnh được điền sẵn. Người dùng có thể lưu hoặc bỏ qua để về trang chủ.
- Google cho tài khoản đã tồn tại hoặc liên kết theo email: `isNewAccount: false`; chuyển tới đường dẫn `next` nội bộ hợp lệ hoặc trang chủ. Đăng nhập lại giữ tên và thông tin liên hệ người dùng đã sửa, cập nhật ảnh từ Google.
- Đăng ký email/mật khẩu vẫn gửi thư xác minh; chưa xác minh thì chưa được đăng nhập. Tài khoản Google chưa đặt mật khẩu vẫn phải dùng Google; sau khi đặt mật khẩu có thể đăng nhập email mà không xác minh lại.
- `/account` hiển thị hồ sơ, địa chỉ mặc định và phương thức đăng nhập; liên kết **Chỉnh sửa hồ sơ** mở `/account/edit`.

## Dữ liệu và API

Migration `20261114170000_user_profile` thêm bốn cột nullable vào `users`: `phone`, `province`, `ward`, `address_detail`. Không thay đổi dữ liệu tài khoản cũ.

Đây là một địa chỉ mặc định trong hồ sơ. SĐT là thông tin liên hệ tùy chọn, không duy nhất giữa các tài khoản và không được xác minh bằng OTP; không phải danh tính đăng nhập.

`PATCH /api/v1/auth/profile` yêu cầu phiên khách hàng hợp lệ và chỉ nhận:

| Trường | Điều kiện |
| --- | --- |
| name | 2–120 ký tự sau trim; không được xóa |
| phone | 9–24 ký tự, ít nhất 9 chữ số; chấp nhận + và dấu phân cách phổ biến |
| province, ward | 2–100 ký tự |
| addressDetail | 5–500 ký tự |

Các trường đều có thể bỏ qua để giữ giá trị hiện có. Trường tùy chọn có thể xóa bằng `null` hoặc chuỗi trống. Body trống và trường ngoài danh sách (email, trạng thái, mật khẩu, ID…) bị từ chối. Chỉ cập nhật tài khoản của phiên đang đăng nhập.

`/auth/me`, đăng nhập mật khẩu, đăng nhập Firebase và cập nhật hồ sơ đều trả cùng bộ trường công khai; không trả mật khẩu hoặc định danh Firebase.

## Checkout

- Điền sẵn tên, email, số điện thoại và toàn bộ địa chỉ từ hồ sơ một lần. Giữ nguyên các ô người dùng đã nhập hoặc chủ động xóa; truy vấn lại hồ sơ không ghi đè biểu mẫu.
- Thông báo thông tin còn thiếu và bắt buộc người nhận có tên, email, số điện thoại, địa chỉ hợp lệ trước khi tạo đơn.
- Cho phép dùng người nhận, SĐT và địa chỉ khác hồ sơ mà không tự động cập nhật tài khoản.
- Sau khi tạo đơn thành công, người đã đăng nhập có nút lưu riêng **SĐT và địa chỉ làm mặc định**. Không thay tên hoặc email tài khoản. Lỗi lưu hồ sơ không hủy đơn và không can thiệp thanh toán VietQR mô phỏng.

## Kiểm tra

- Bộ kiểm thử API bao gồm phân biệt tài khoản Google mới/cũ/liên kết, giữ tên đã sửa, không lộ thông tin đăng nhập, cập nhật từng trường, xóa thông tin tùy chọn, giới hạn độ dài, từ chối phiên không hợp lệ và chặn sửa trường ngoài danh sách.
- Đã kiểm tra API với PostgreSQL thật qua proxy Vite: đăng nhập, cập nhật/đọc/xóa trường, hai tài khoản dùng cùng SĐT liên hệ, chặn sửa email và từ chối phiên đã đăng xuất. Tài khoản thử và phiên thử được xóa sau kiểm tra; không gửi thư.
- Typecheck và build cả API/web thành công. Công cụ trình duyệt không kết nối được trong phiên triển khai nên chưa kiểm tra trực quan hoặc chạy lại popup Google thật.

Kiểm tra thủ công: đăng nhập Google bằng email chưa có trong DB → bỏ qua hoặc lưu ở màn hình chào mừng → sửa hồ sơ → đăng xuất và đăng nhập lại để xác nhận tên đã lưu → checkout, đổi SĐT/người nhận → tạo đơn → chỉ lưu địa chỉ khi chủ động chọn nút lưu. Thử thêm email đăng ký chưa xác minh và tài khoản Google chưa có mật khẩu để xác nhận các chặn đăng nhập cũ.
