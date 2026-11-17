# Tham khảo đăng nhập và đăng ký Shopee cho Konyappi

Tra cứu ngày 14/11/2026 từ trang đăng nhập và Trung tâm trợ giúp chính thức. Tài liệu này mô tả hành vi công khai; không xác nhận thuật toán chống gian lận, cách lưu mật khẩu hay kiến trúc session nội bộ của Shopee.

## Hành vi quan sát được

| Luồng | Shopee công bố | Hiện trạng Konyappi |
| --- | --- | --- |
| Đăng nhập mật khẩu | Email/số điện thoại/tên tài khoản và mật khẩu | Email và mật khẩu |
| Đăng ký số điện thoại | Nhập số → xác thực hình ảnh → OTP → đặt mật khẩu | Đăng ký email/mật khẩu, sau đó xác minh bằng liên kết email |
| Đăng nhập không mật khẩu | OTP qua số điện thoại; các kênh nhận có thể gồm SMS/Zalo/cuộc gọi | Chưa có |
| Đăng nhập bên thứ ba | Google/Facebook/Apple; có bước xác minh số điện thoại | Google qua Firebase; email được xác minh từ token hợp lệ |
| Quên mật khẩu | Xác minh bằng OTP hoặc liên kết email → đặt mật khẩu mới | Chưa có |
| QR trên web | Ứng dụng Shopee đã đăng nhập quét QR và xác nhận | Chưa có ứng dụng/quy trình phê duyệt |

Một số lựa chọn khác nhau giữa ứng dụng và website. Trang web đăng nhập được công cụ đọc trực tiếp hiển thị mật khẩu, SMS, Facebook và Google; hướng dẫn trợ giúp mô tả thêm Apple, sinh trắc học và QR.

## Đề xuất áp dụng cho Konyappi

### Phần có thể triển khai với hạ tầng hiện tại

1. Giữ nhận diện Konyappi; form đơn giản có email, mật khẩu, hiện/ẩn mật khẩu, Quên mật khẩu và Tiếp tục với Google.
2. Thêm quy trình quên mật khẩu qua email: phản hồi chung cho email tồn tại/không tồn tại, token có hạn và dùng một lần, đặt mật khẩu mới rồi thu hồi các phiên cũ.
3. Đăng ký email thể hiện rõ các bước tạo tài khoản, kiểm tra hộp thư, xác minh và đăng nhập; có gửi lại và thông báo lỗi rõ ràng.
4. Google xác thực thành công thì backend kiểm tra token và trạng thái tài khoản, tạo/liên kết rồi cấp cookie. Không yêu cầu xác minh lại email Google đã được chứng thực. Nếu tiếp quản tài khoản email chưa xác minh, vô hiệu mật khẩu chưa xác minh và thu hồi phiên cũ như quy tắc hiện tại.
5. Sửa trạng thái 401/cache để không chuyển trang lặp, cho phép logout hoàn tất khi phiên đã hết hạn, dịch đúng lỗi Firebase, phân biệt lỗi kết nối dịch vụ và token sai.
6. Xác định rõ ý nghĩa gỡ liên kết: chỉ bỏ liên kết hiện tại hay tắt phương thức đăng nhập đó đến khi người dùng chủ động liên kết lại.

### Phần cần tích hợp thêm

- **OTP SMS:** Firebase Phone Auth, reCAPTCHA, chuẩn hóa số điện thoại, chính sách khu vực SMS và Cloud Billing/Blaze. Backend hiện chỉ chấp nhận token Google có email đã xác minh; cần mở rộng riêng cho danh tính phone, không chỉ thêm một nút vào web. Firebase không cung cấp mặc định các kênh Zalo/cuộc gọi của Shopee. Tài liệu Firebase hiện ghi localhost không được dùng làm hosted domain cho phone auth, vì vậy cần môi trường kiểm thử được hỗ trợ hoặc emulator/số kiểm thử phù hợp.
- **QR:** phải có thiết bị đã đăng nhập phê duyệt yêu cầu của trình duyệt. Yêu cầu cần mã ngẫu nhiên, hạn ngắn, dùng một lần và ràng buộc với trình duyệt khởi tạo. Chỉ hiển thị mã QR chưa tạo thành tính năng đăng nhập an toàn.
- **Facebook/Apple:** cần cấu hình provider và ứng dụng tương ứng, xử lý liên kết/xung đột tài khoản.

Không thay đổi billing hoặc bật gửi SMS thật chỉ để làm bản xem thử. Có thể làm trước luồng email + Google + quên mật khẩu và kiểm thử hoàn chỉnh.

## Nguồn

- Trang đăng nhập Shopee: https://shopee.vn/buyer/login
- Đăng ký số điện thoại: https://help.shopee.vn/portal/4/article/79430
- Các cách đăng nhập, xác minh số điện thoại sau social login và QR: https://help.shopee.vn/portal/4/article/79436
- Đăng nhập Google/Facebook: https://help.shopee.vn/portal/4/article/79645
- Quên mật khẩu: https://help.shopee.vn/portal/4/article/79288-
- Firebase Phone Auth: https://firebase.google.com/docs/auth/web/phone-auth
- Firebase SMS billing: https://firebase.google.com/docs/auth/faq-and-troubleshooting
- Firebase Authentication limits: https://firebase.google.com/docs/auth/limits
