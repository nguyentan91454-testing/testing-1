# PRD & Kiến trúc – Website TMĐT đồ gia dụng và trang trí tích hợp Chatbot AI và gợi ý sản phẩm

*Phiên bản 1.0 · 31/10/2026 · Đồ án tốt nghiệp cá nhân · Tổng hợp từ buổi phỏng vấn yêu cầu*

## 1. Tổng quan

### 1.1 Mục tiêu

Xây dựng website thương mại điện tử B2C bán đồ gia dụng và trang trí nhà cửa (chủ lực là đèn), tối ưu cho điện thoại, có hai điểm nhấn: **chatbot AI tư vấn không gian** (RAG + function calling) và **hệ thống gợi ý sản phẩm bằng machine learning** (hybrid content-based + collaborative).

### 1.2 Bối cảnh và ràng buộc

- Đây là **đồ án tốt nghiệp, không phải cửa hàng thật**: sản phẩm, giá, ảnh là dữ liệu minh họa; không nhận tiền thật. Giao diện có banner "Website đồ án, không bán hàng thật" và đơn hàng mang nhãn DEMO.
- Một người thực hiện, **4 tuần** (khoảng 3 tuần code, 1 tuần deploy, kiểm thử, báo cáo), có dùng AI agent hỗ trợ viết code.
- Triển khai online (VPS + Docker Compose), có người dùng thử thật.
- Pháp lý kinh doanh thật (đăng ký hộ kinh doanh, hóa đơn điện tử, thông báo website với Bộ Công Thương) **ngoài phạm vi** vì không kinh doanh; nếu chuyển thành cửa hàng thật phải xử lý trước khi mở bán.

### 1.3 Chỉ số thành công của đồ án

- Demo trơn tru luồng chính: duyệt → chat tư vấn → giỏ hàng → đặt hàng → thanh toán giả lập → xử lý đơn trong Admin.
- Chatbot trả lời đúng thông số, giá, tồn kho (lấy từ hàm, không bịa) và tra được đơn hàng an toàn.
- Gợi ý có **số liệu đánh giá offline** (Hit@K, NDCG@K, coverage) so với đường cơ sở, kèm CTR thực tế của người thử.
- LCP dưới 2,5 giây trên 4G cho trang chủ, danh mục, sản phẩm.

### 1.4 Ngoài phạm vi ở giai đoạn này

Trả góp, ví/thẻ, tích điểm, quà tặng kèm, flash sale, mua nhiều giảm nhiều, đổi trả trên hệ thống, review khách hàng, RBAC nhiều vai trò, đa kho, đa ngôn ngữ, hotspot "shop the look", Zalo OA, SMS, hóa đơn điện tử, đối soát COD, hàng loạt đơn.

## 2. Người dùng và hành trình

### 2.1 Tệp khách hàng

| Nhóm | Tỷ lệ | Đặc điểm | Hành vi mua |
| --- | --- | --- | --- |
| Gia đình trẻ mới nhận nhà | 50% | 24-38 tuổi, thu nhập từ 15 triệu/tháng, Hà Nội, TP.HCM, đô thị lớn | Mua cả bộ cho nhiều phòng, giỏ lớn, cần tư vấn trọn gói |
| Người trẻ tự cải tạo, chủ quán nhỏ | 50% | Như trên | Mua lẻ hoặc vài chục cái cùng phong cách, nhạy giá |

85% truy cập bằng điện thoại: **mobile-first**, cần ảnh thực tế, chatbot đóng vai chuyên viên tư vấn không gian.

### 2.2 Hành trình lý tưởng

Xem ảnh phối cảnh thực tế → chọn không gian/phong cách → nhập diện tích phòng, chiều cao trần → hệ thống tính lumen khuyến nghị và lọc → kiểm tra kích thước, màu ánh sáng → chatbot gợi ý bộ đèn phù hợp → đặt hàng (khách vãng lai hoặc Google) → VietQR hoặc COD theo ngưỡng.

### 2.3 Tham chiếu giao diện

Trực quan, giàu thông tin kỹ thuật như Lumens.com; tinh gọn, dễ dùng trên mobile như Make My Home/baya.

## 3. Phạm vi và thứ tự ưu tiên

Các mức ưu tiên là **thứ tự xây dựng**: làm P0 trước, rồi P1, rồi P2. Nếu trễ, lùi từ dưới lên.

| Mức | Hạng mục |
| --- | --- |
| **P0** | Catalog (mẫu, biến thể, thuộc tính), duyệt theo không gian/phong cách/danh mục, bộ lọc, giỏ hàng, checkout khách vãng lai + Google, đơn hàng và máy trạng thái, Admin tối thiểu, **chatbot RAG + function calling**, **gợi ý ML hybrid**, VietQR sinh mã với xác nhận giả lập, email giao dịch |
| **P1** | Công cụ lumen/chiều cao trần dùng chung web và bot, mã giảm giá, freeship tự động, ngưỡng COD/cọc, tra đơn qua chatbot, báo cáo Admin mức trung bình, SEO và analytics |
| **P2** | GHTK sandbox (tính phí, tạo vận đơn, theo dõi), combo dạng bundle, in phiếu giao hàng, khối "Khách hàng thực tế" bằng dữ liệu minh họa |
| **Hoãn** | Xem mục 1.4, ghi vào hướng phát triển |

**Điểm cắt dự phòng:** nếu cuối tuần 3 chatbot hoặc gợi ý chưa ổn định, dừng thêm tính năng P2 và dồn sức cho hai phần AI cùng kiểm thử.

## 4. Yêu cầu chức năng

### 4.1 Catalog và biến thể

- Mô hình **Product (mẫu) → Variant (tổ hợp)**: biến thể có SKU, giá, tồn kho, cân nặng, kích thước đóng gói, cờ dễ vỡ riêng. Tổ hợp không sản xuất được đánh dấu "không tồn tại", không tạo thừa.
- Quy mô: 25-30 mẫu lúc ra mắt (mục tiêu dữ liệu demo 30-40 mẫu có ảnh), khoảng 75% có biến thể: **màu vỏ** (đen/trắng/đồng), **kích thước**, **màu ánh sáng** (3000K/4000K/6500K hoặc 3 màu).
- **Thuộc tính kỹ thuật linh hoạt** (không cột cố định): công suất (W), lumen, nhiệt độ màu, loại đui, điện áp, chuẩn IP, chiều dài dây treo tối thiểu/tối đa, chiều cao tổng thể, bảo hành.
- Giá trị thuộc tính, phong cách, không gian lấy từ **danh mục cố định**, không gõ tự do.
- Đơn vị tiền: **số nguyên đồng VND**.

### 4.2 Khám phá và tìm kiếm

Thứ tự ưu tiên: (1) theo **không gian** (phòng khách, bàn ăn, phòng ngủ, quán cà phê...), (2) theo **phong cách** (Bắc Âu, Hiện đại, Indochine...), (3) **bộ lọc kỹ thuật** (màu ánh sáng, chiều cao trần, kích thước, tầm giá) và menu danh mục truyền thống thu gọn.

- Trang chủ mobile: thẻ "Theo không gian" lớn, hàng "Theo phong cách" thứ hai.
- Tìm kiếm từ khóa **không phân biệt dấu** (`unaccent` + `pg_trgm` hoặc full-text của PostgreSQL), xử lý chữ đ/Đ, chuẩn hóa Unicode NFC.
- Ảnh phối cảnh kèm danh sách "sản phẩm trong không gian này" gắn thủ công (thay cho hotspot).

### 4.3 Công cụ lumen và chiều cao trần (dùng chung)

- Người dùng nhập diện tích, loại phòng, chiều cao trần → dịch vụ `lighting` tính **lumen khuyến nghị** và lọc sản phẩm/bộ theo tổng lumen; loại đèn thả không đủ chiều dài dây hoặc quá thấp so với trần.
- **Một dịch vụ duy nhất** được gọi bởi giao diện web và chatbot để không lệch kết quả.
- Bảng hệ số lumen theo loại phòng nằm trong cấu hình, có thể chỉnh trong Admin.

### 4.4 Giỏ hàng và khuyến mãi

- Hai hình thức: **mã giảm giá** (% có trần giảm tối đa, hoặc số tiền, kèm giá trị đơn tối thiểu) và **freeship tự động** theo ngưỡng (ví dụ từ 1.000.000đ), cấu hình trong Admin.
- **Mỗi đơn một mã.** Freeship chạy độc lập và dùng chung với mã.
- Freeship có thể giới hạn theo vùng hoặc **trần trợ giá phí ship** (phần vượt khách trả) để không lỗ với hàng cồng kềnh.
- Mã chỉ áp dụng cho **tài khoản Google đã đăng nhập**. Ô nhập mã luôn hiển thị; khách vãng lai thấy thông báo "Đăng nhập để dùng mã" kèm nút Google.
- Chống lạm dụng: giới hạn lượt tổng, lượt theo tài khoản, theo số điện thoại, theo địa chỉ giao hàng; có ngày hết hạn; mã "khách mới" xác định theo lịch sử đơn của số điện thoại và địa chỉ.
- **Combo** là sản phẩm ảo (bundle) tham chiếu SKU thành phần, trừ tồn kho từng món, cho chọn biến thể từng món, giá chiết khấu định sẵn. Chatbot chỉ thêm món lẻ vào giỏ với giá lẻ; giá combo chỉ áp dụng cho bundle đã định nghĩa.
- Giá, tồn kho, khuyến mãi ở giỏ hàng và checkout **luôn đọc lại từ server**, không tin cache.

### 4.5 Checkout và thanh toán

- Hai cách đặt hàng: **khách vãng lai** (họ tên, số điện thoại, **email**, địa chỉ) và **đăng nhập Google**. Không bắt buộc đăng ký. Số điện thoại được chuẩn hóa (bỏ khoảng trắng, +84 thành 0).
- Chống đơn ảo: Cloudflare Turnstile/reCAPTCHA ẩn, rate limit theo IP và theo email.
- **VietQR:** sinh mã QR động theo đơn (đúng số tiền, đúng nội dung chuyển khoản). Ở đồ án, xác nhận thanh toán bằng **nút giả lập** hoặc webhook tự viết có chữ ký, xử lý idempotent. Không để người thử chuyển tiền thật.
- Thiết kế **payment provider** cắm thêm được (giao diện: tạo giao dịch, nhận kết quả, đối soát), có adapter giả lập.
- **COD có giới hạn (tất cả cấu hình trong Admin, không hardcode):**

| Giá trị đơn | Hình thức |
| --- | --- |
| Dưới 1.500.000đ | COD toàn phần |
| 1.500.000đ - 4.000.000đ | COD kèm cọc 30% qua VietQR, hoặc trả trước 100% |
| Trên 4.000.000đ | Bắt buộc trả trước 100% |

- Khách Google đã nhận hàng thành công từ 1 đơn: được COD đến 3 triệu (vẫn không COD toàn phần trên 4 triệu).
- Số điện thoại từng hoàn/bom hàng: bắt buộc trả trước.
- Vùng xa hoặc hàng cồng kềnh: cọc 50%.
- Đơn chờ cọc **giữ hàng 30 phút**, hết hạn tự hủy và nhả tồn kho (kết hợp "hết hạn lười" khi tính tồn kho khả dụng).
- Tiền thu hộ gửi cho GHTK = tổng đơn − tiền đã cọc/đã trả; đơn trả trước 100% thì thu hộ = 0.
- Xử lý lệch tiền: thiếu (thanh toán một phần), thừa hoặc sai nội dung (ghi nhận để xử lý tay, hàng đợi giao dịch chưa khớp thuộc hướng phát triển), chuyển sau hạn giữ hàng, webhook trùng.
- Đơn lớn vượt hạn mức chuyển khoản một lần: hướng dẫn chia nhỏ giao dịch.

### 4.6 Vận chuyển (GHTK)

- Tích hợp **GHTK ở chế độ sandbox**: tính phí, tạo vận đơn, theo dõi trạng thái. Làm theo hướng **shipping provider cắm thêm được**, có **adapter giả lập (mock)** để test và demo khi sandbox lỗi; nối GHTK thật sau khi luồng chạy đủ bằng adapter giả lập.
- Mỗi biến thể cần: cân nặng, kích thước đóng gói, cờ dễ vỡ, giá trị khai báo. Thiếu dữ liệu thì khóa nút tạo vận đơn và báo lý do.
- Địa chỉ lưu theo **tỉnh/thành, phường/xã, địa chỉ chi tiết** (chính quyền hai cấp), có lớp chuyển đổi sang định dạng GHTK yêu cầu và cho nhập tự do khi danh mục không khớp. Cần kiểm tra GHTK đang nhận định dạng địa chỉ nào.
- Ba số phí riêng trên mỗi đơn: **phí GHTK tính**, **phí khách trả**, **phần shop trợ giá**.
- Tạo vận đơn chạy bất đồng bộ qua hàng đợi có retry và khóa chống trùng (mỗi đơn một vận đơn). Webhook GHTK xác thực, idempotent, ánh xạ trạng thái GHTK sang trạng thái đơn nội bộ.
- Nếu API tính phí lỗi: dự phòng bằng **bảng phí tự nhập** theo vùng và khối lượng, không chặn checkout.
- Công cụ **giả lập sự kiện** trong Admin để đẩy đơn qua đủ vòng đời khi demo (đã lấy hàng, đang giao, giao thành công, hoàn).
- Một kho (`warehouse_id` vẫn có trong mô hình dữ liệu để mở rộng đa kho).

### 4.7 Đơn hàng

- Hai trục trạng thái độc lập: **trạng thái đơn** và **trạng thái thanh toán** (chi tiết ở mục 9).
- Mọi thay đổi trạng thái đi qua **một hàm duy nhất** kiểm tra chuyển trạng thái hợp lệ và ghi vào timeline.
- Tra đơn bằng mã đơn hoặc số điện thoại (đã chuẩn hóa). Lưu **ngày giao thành công** để tính bảo hành.
- Trang theo dõi đơn của khách mở bằng **liên kết có token ký, hết hạn** trong email, chỉ hiển thị thông tin đã che bớt.
- Chính sách: **không có luồng đổi trả** trên hệ thống. Có trang chính sách bằng văn bản; hàng vỡ hoặc lỗi xử lý thủ công qua Zalo/hotline. Admin có trạng thái "có khiếu nại" và **lý do hoàn/khiếu nại có cấu trúc** (khách từ chối nhận, không liên lạc được, hàng vỡ khi giao, sai sản phẩm, lỗi kỹ thuật). Dữ liệu này nuôi cơ chế hạn chế COD theo số điện thoại.
- Bảo hành: **12 tháng cho phần điện** (driver, nguồn, LED), tính từ ngày giao, xử lý qua Zalo/hotline theo số điện thoại mua hàng; phạm vi và loại trừ ghi rõ trong trang chính sách.

### 4.8 Email giao dịch

- Bốn loại: **xác nhận đơn, xác nhận thanh toán/cọc, vận đơn, giao thành công**. Email bắt buộc ở checkout khách vãng lai.
- Dịch vụ: Resend hoặc Brevo (không dùng SMTP Gmail), tên miền riêng có SPF, DKIM, DMARC.
- Gửi qua **hàng đợi** (`pg-boss`) có retry và khóa chống gửi trùng (`order_id + loại email`). Ghi từng email vào timeline đơn.
- Tiêu đề có nhãn **\[DEMO – đồ án tốt nghiệp\]**. Email chứa mã đơn, sản phẩm, tổng tiền, số đã cọc và số còn thu hộ, thông tin bảo hành, Zalo/hotline.
- Chống lạm dụng: rate limit theo IP và theo địa chỉ email, Turnstile, dòng "nếu bạn không đặt đơn này hãy bỏ qua".
- Dev và test dùng chế độ chặn gửi (Mailpit trong Docker Compose).

### 4.9 Chatbot AI tư vấn không gian

**Vai trò:** chuyên viên tư vấn hỗ trợ toàn phần: chọn sản phẩm, trả lời câu hỏi về sản phẩm, tra đơn hàng, giải đáp chính sách.

**Nguyên tắc:**

- **RAG** cho kiến thức không có cấu trúc (mô tả, hướng dẫn chọn đèn, chính sách bảo hành/vận chuyển/COD). **Function calling** cho dữ liệu cấu trúc và dữ liệu sống (giá, tồn kho, lọc sản phẩm, lumen, gợi ý, tra đơn).
- Giá, tồn kho, trạng thái đơn **chỉ lấy từ hàm**, tuyệt đối không từ trí nhớ hay đoạn RAG.
- Các hàm dùng chung service với web, kiểm tra tham số ở server bằng Zod; lỗi trả về có nội dung để mô hình tự sửa.
- Bot hỏi ngược khi thiếu thông tin (diện tích, chiều cao trần, phong cách, ngân sách).
- Bot **chỉ đọc**, không hủy hay sửa đơn. Khi không chắc hoặc khách yêu cầu: hiện Zalo/hotline và có thể ghi `contact_requests` vào Admin.
- Giải thích lý do gợi ý dựa trên thuộc tính thật do service gợi ý trả về.

**Hàm (tool) tối thiểu:**

| Hàm | Mục đích |
| --- | --- |
| `search_products` | Lọc theo không gian, phong cách, màu sáng, tầm giá, kích thước |
| `get_product_details` | Thông số, biến thể, giá, tồn kho |
| `calculate_lighting` | Lumen khuyến nghị và kiểm tra chiều cao trần |
| `recommend_products` | Gọi service gợi ý hybrid |
| `get_order_status` | Mã đơn + 4 số cuối SĐT, hoặc đơn của tài khoản Google; chỉ trả thông tin tối thiểu |
| `search_policies` | RAG chính sách |
| `create_contact_request` | Ghi yêu cầu liên hệ |

**Bảo vệ:** chỉ gọi danh sách hàm cố định; nội dung RAG và DB coi là dữ liệu chứ không phải mệnh lệnh; từ chối chủ đề ngoài phạm vi; chặn prompt injection; giới hạn số lần thử tra đơn theo IP/phiên; lọc dữ liệu cá nhân trước khi gửi LLM; xử lý phản hồi rỗng/bị chặn và lỗi 429.

**Mô hình:** Google Gemini, hạng Flash bản **ổn định** cho hội thoại; embedding đa ngôn ngữ của Google (chọn trước số chiều vector). Tên mô hình và tham số nằm trong cấu hình, bọc sau lớp `chat(messages, tools)`. Chạy **gói trả phí** với ngân sách khoảng 5-10 USD/tháng (kiểm tra giá và hạn mức hiện hành).

**Kiểm soát chi phí:**

| Lớp giới hạn | Giá trị gợi ý |
| --- | --- |
| Tin nhắn mỗi phiên | 20-30 |
| Tin nhắn mỗi IP mỗi ngày | 60-100 |
| Độ dài tin nhắn khách | khoảng 500 ký tự |
| Token đầu ra tối đa mỗi lượt | khoảng 600-800 |
| Vòng gọi hàm mỗi tin nhắn | tối đa 4 |
| Lịch sử gửi lên mô hình | 10 lượt gần nhất, tóm tắt phần cũ |

Cầu dao ở tầng ứng dụng: ghi token mỗi lần gọi, trần chi tiêu ước tính theo ngày và tháng trong Admin; chạm trần thì chuyển **chế độ giới hạn** (chỉ lọc sản phẩm, không LLM). Có công tắc "Chế độ demo" tạm nâng trần cho ngày bảo vệ. Few-shot (4-6 ví dụ, lưu trong file cấu hình) viết bằng tiếng Việt tự nhiên, gồm ca khó: yêu cầu mơ hồ, hết hàng, hỏi thứ không có trong catalog, đòi giảm giá, viết tắt và thiếu dấu. Ghi log hội thoại (tin nhắn, hàm gọi, kết quả, token, thời gian, thích/không thích) với dữ liệu cá nhân đã che.

### 4.10 Gợi ý sản phẩm bằng machine learning (mức B – hybrid)

**Bài toán theo vị trí:** trang sản phẩm ("Sản phẩm tương tự" content-based, "Thường mua cùng" collaborative); giỏ hàng ("Hoàn thiện không gian"); trang chủ/danh mục (theo phong cách và không gian đã xem trong phiên); chatbot (hàm `recommend_products`, **cùng một service** với web).

**Thành phần:**

1. **Content-based:** embedding mẫu sản phẩm (mô tả, phong cách, không gian, thông số chính) lưu trong `pgvector`, tìm láng giềng gần.
2. **Collaborative:** item-item (đồng xuất hiện chuẩn hóa) là mô hình chính; ALS hoặc LightFM làm bản so sánh nếu còn thời gian.
3. **Hybrid:** chuẩn hóa điểm mỗi nguồn về cùng thang rồi trộn có trọng số cấu hình được; chọn trọng số dựa trên đánh giá offline. Sản phẩm thiếu tín hiệu collaborative tự động dùng 100% content-based.
4. **Luật nghiệp vụ lọc ứng viên trước khi xếp hạng:** loại hết hàng; loại đèn thả không hợp chiều cao trần; đúng đui bóng, điện áp, công suất tối đa; không gợi ý thứ đã có trong giỏ; tầm giá hợp lý theo giỏ.
5. **Cá nhân hóa theo phiên** (cookie ẩn danh): vector sở thích tạm thời từ sản phẩm vừa xem/thêm giỏ.
6. Giảm thiên lệch độ phổ biến; có nhánh dự phòng (cùng bộ sưu tập, cùng phong cách) khi bảng gợi ý trống hoặc lỗi.

**Dữ liệu huấn luyện:** hành vi **mô phỏng theo persona** đúng tệp khách (gia đình mua cả bộ nhiều phòng; chủ quán mua số lượng một phong cách; người tự cải tạo mua lẻ theo ngân sách), có nhiễu và hành vi lệch persona, cộng dữ liệu thật của người thử khi có. Ghi rõ trong báo cáo: kết quả chứng minh quy trình đúng, không chứng minh hiệu quả ngoài đời.

**Vận hành:** huấn luyện offline bằng Python trong container chạy theo lệnh (hoặc lịch đêm trong worker); kết quả ghi vào PostgreSQL (`item_similarity`, `item_embeddings`); Next.js chỉ đọc. Cố định random seed; mỗi lần chạy ghi `model_runs` (thuật toán, tham số, số liệu); chỉ kích hoạt mô hình khi số liệu không tệ hơn bản đang chạy.

**Đánh giá:** tách dữ liệu **theo thời gian/phiên**, đo Hit@K, NDCG@K, coverage, độ đa dạng, so với đường cơ sở (ngẫu nhiên, phổ biến nhất). Ghi `recommendation_events` (vị trí, sản phẩm, thuật toán, có bấm, có thêm giỏ) để tính CTR thực tế.

### 4.11 Admin (một vai trò)

- Một vai trò **admin toàn quyền**, xác định bằng danh sách email cho phép hoặc bảng `admin_users` riêng, tách hẳn khỏi đăng nhập Google của khách. Cột `role` và hàm `requireRole('admin')` có sẵn để mở rộng sau.
- Kiểm tra quyền ở **server** cho mọi API và Server Action quản trị; rate limit đăng nhập; cân nhắc bắt buộc Google/2FA cho admin.
- **Audit log** thao tác (đổi giá, đổi trạng thái đơn, sửa ngưỡng COD...). Timeline đơn là nguồn dữ liệu chung.
- Chức năng: CRUD sản phẩm/biến thể/thuộc tính/ảnh (kèm nhập CSV); quản lý mã giảm giá; cấu hình (ngưỡng COD và tỷ lệ cọc, ngưỡng freeship, bảng phí ship dự phòng, thông tin kho, hệ số lumen, trần chi tiêu AI, chế độ demo); **quản lý đơn mức trung bình**: danh sách và lọc, đổi trạng thái, in phiếu giao hàng (mã đơn, sản phẩm, bảo hành, Zalo/hotline), tạo vận đơn GHTK từ trang chi tiết (nút khóa nếu thiếu điều kiện), xem trạng thái vận chuyển, ghi chú nội bộ có dấu thời gian và người ghi, lý do hoàn/khiếu nại; danh sách yêu cầu liên hệ từ chatbot.
- **Điều kiện tạo vận đơn:** đơn đã xác nhận, đủ điều kiện thanh toán/cọc, địa chỉ hợp lệ, biến thể đủ cân nặng và kích thước, chưa có vận đơn. Chi tiết đơn hiển thị rõ tổng đơn, đã cọc, còn thu hộ.
- **Báo cáo mức trung bình:** số đơn và doanh thu theo ngày/tuần/tháng, đơn theo trạng thái, top sản phẩm bán chạy, tỷ lệ COD so với trả trước, tỷ lệ hoàn theo lý do, hiệu quả mã giảm giá. Cần lưu mã giảm và phương thức thanh toán trên từng đơn.
- Tài khoản admin demo với dữ liệu giả cho buổi bảo vệ.

### 4.12 Nội dung tĩnh, SEO, analytics

- **Chỉ tiếng Việt** (`lang="vi"`, phông hỗ trợ đủ dấu, định dạng `1.250.000 ₫`, `dd/mm/yyyy`); gom chuỗi giao diện vào một nơi. Trang tĩnh viết bằng Markdown/MDX trong repo: `/chinh-sach-bao-hanh`, `/chinh-sach-van-chuyen-cod`, `/chinh-sach-quyen-rieng-tu`, `/ghi-cong-hinh-anh`, `/gioi-thieu-do-an`. Nạp các trang này vào RAG và nhúng lại khi đổi.
- **SEO trung bình:** metadata, sitemap, slug tiếng Việt không dấu ổn định, canonical cho biến thể và bộ lọc, JSON-LD `Product`, Open Graph (ảnh khoảng 1200×630). Cờ môi trường mặc định **`noindex`** và `robots.txt` chặn `/admin`, `/api` vì dữ liệu là minh họa.
- **Analytics:** Umami tự host trong Docker Compose (không cookie, không dữ liệu cá nhân). Sự kiện: `view_product`, `add_to_cart`, `begin_checkout`, `place_order`, `use_lumen_calculator`, `apply_filter`, `chat_open`, `chat_message`, `chat_add_to_cart`. Lưu `chat_session_id` vào giỏ và đơn khi sản phẩm thêm từ bot. Số liệu đơn lấy từ DB, không chỉ từ script trình duyệt.
- **Ảnh:** nguồn ảnh miễn phí bản quyền (Unsplash, Pexels...), tải về tự lưu trữ, tối ưu WebP/AVIF ở bước seed; mỗi ảnh lưu `source_url`, `author`, `license` và hiển thị ở trang ghi công. Ảnh đại diện cho mẫu, biến thể màu hiển thị bằng swatch kèm ghi chú "ảnh minh họa". Mục tiêu khoảng 30-40 sản phẩm, mỗi sản phẩm 2-3 ảnh, cộng 12-15 ảnh phối cảnh, kèm alt text mô tả (không gian, phong cách, màu, đèn nổi bật) cũng dùng làm ngữ liệu RAG.
- **Nhập dữ liệu:** CSV nhiều file (`products`, `variants`, `attributes`, `images`, danh mục) + seed script chạy lại được (khóa SKU), sinh biến thể từ tập giá trị, validation theo dòng bằng Zod, kiểm tra file ảnh tồn tại, tạo embedding ở bước cuối (lưu mã băm nội dung để chỉ nhúng lại phần đổi), kèm đơn hàng mẫu đủ trạng thái và mã giảm giá demo (đánh dấu dữ liệu giả).

## 5. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| --- | --- |
| Hiệu năng | LCP dưới 2,5 giây trên 4G; trang danh mục/sản phẩm render phía server có cache (ISR hoặc cache theo thẻ); giá và tồn kho ở giỏ/checkout luôn đọc lại từ server; widget chatbot **nạp lười**; script analytics `async/defer`; ảnh tối ưu sẵn (WebP/AVIF, nhiều kích cỡ, lưu rộng/cao để tránh CLS) |
| Mobile-first | Thiết kế điện thoại trước; thanh "Mua ngay" cố định dưới; checkout tối đa 2-3 bước; tự điền địa chỉ |
| Khả năng chịu tải | Vài chục người dùng thử cùng lúc; không yêu cầu chịu tải lớn |
| Độ tin cậy | Webhook trả 200 nhanh rồi xử lý; xử lý idempotent; việc nền có retry; sao lưu `pg_dump` mỗi ngày sang nơi khác máy chủ và đã thử khôi phục ít nhất một lần |
| Bảo mật | Xem mục 10 |
| Quyền riêng tư | Có trang quyền riêng tư và ô đồng ý ở form; gợi ý người thử dùng dữ liệu giả; lọc dữ liệu cá nhân trước khi gửi LLM; tự xóa dữ liệu thử định kỳ hoặc sau buổi bảo vệ; analytics ẩn danh (Nghị định 13/2023 về bảo vệ dữ liệu cá nhân) |
| Khả năng quan sát | Log lỗi (Sentry gói miễn phí), log chatbot, log email, audit log, Uptime Kuma tùy chọn; xoay vòng log Docker (`max-size`, `max-file`) |
| Khả năng mở rộng | Payment/shipping provider cắm thêm; `warehouse_id`, `role`, trạng thái `RETURN_REQUESTED`/`REFUNDED` có sẵn; bảng đánh giá gắn đơn đã giao chừa cho giai đoạn 2 |
| Dự phòng demo | Chạy cùng bộ container trên laptop làm phương án dự phòng; video demo quay sẵn; warm-up trước khi demo |

## 6. Kiến trúc hệ thống

### 6.1 Tổng thể

Kiến trúc **monolith** một codebase Next.js (giao diện, API, Server Actions, chatbot) cộng một tiến trình **worker** cùng codebase và một **container ML** chạy theo lệnh. Tất cả chạy bằng Docker Compose trên một VPS.

```
Khách (mobile/desktop)
   │ HTTPS
[Cloudflare: CDN, chống bot]
   │
[proxy: Caddy/Nginx — TLS, rate limit]  ← chỉ proxy mở cổng 80/443
   │
[app: Next.js standalone] ──► [Gemini API: chat + embedding]
   │        │ 
   │        ├──► [VietQR: sinh QR; mock webhook]
   │        ├──► [GHTK sandbox / adapter mock]
   │        └──► [Email: Resend/Brevo]
   ▼
[db: PostgreSQL + pgvector]  ◄── [worker: pg-boss] (hết hạn giữ hàng, retry vận đơn, gửi email, dọn dữ liệu demo)
   ▲
[ml: Python, chạy theo lệnh/lịch] (item-item, embedding, đánh giá offline)

[umami: analytics]   [mailpit: chỉ ở dev]
```

### 6.2 Module nghiệp vụ trong monolith

Logic nằm trong các module riêng, **giao diện web, Admin và tool của chatbot đều gọi chung** các service này (cách duy nhất để bot và web không báo hai mức giá khác nhau):

| Module | Trách nhiệm |
| --- | --- |
| `catalog` | Sản phẩm, biến thể, thuộc tính, danh mục, bundle, ảnh |
| `search` | Lọc, tìm kiếm không dấu, truy vấn vector |
| `lighting` | Tính lumen, kiểm tra chiều cao trần |
| `pricing` | Giá, mã giảm, freeship, ngưỡng COD/cọc, tiền thu hộ (hàm thuần, có test) |
| `cart` | Giỏ hàng, giữ chỗ tồn kho, tồn kho khả dụng (hết hạn lười) |
| `orders` | Máy trạng thái, timeline, lý do hoàn/khiếu nại |
| `payments` | Provider VietQR + mock, xử lý webhook idempotent |
| `shipping` | Provider GHTK + mock, bảng phí dự phòng, webhook |
| `notifications` | Email qua hàng đợi |
| `chatbot` | Prompt, few-shot, RAG, tool registry, giới hạn và cầu dao chi phí, log |
| `recommendations` | Đọc bảng gợi ý, trộn hybrid, luật lọc, ghi sự kiện |
| `admin` | CRUD, cấu hình, báo cáo, audit |
| `auth` | Google cho khách, danh sách admin riêng |

### 6.3 Luồng chính

1. **Đặt hàng:** giỏ hàng → server tính lại giá/khuyến mãi → chọn phương thức theo ngưỡng → tạo đơn và giữ chỗ tồn kho → (nếu cần cọc) sinh QR, hẹn hết hạn 30 phút → xác nhận thanh toán (giả lập/webhook, idempotent) → cập nhật trạng thái thanh toán → email xác nhận (qua hàng đợi).
2. **Xử lý đơn:** Admin xác nhận → đóng gói → tạo vận đơn GHTK (hoặc mock) với tiền thu hộ đúng → webhook trạng thái → giao thành công (ghi ngày giao, bắt đầu bảo hành) → email.
3. **Chat tư vấn:** tin nhắn → kiểm tra giới hạn/cầu dao → LLM (system prompt + few-shot + ngữ cảnh RAG) → gọi hàm đã đăng ký (kiểm tra tham số ở server) → kết quả vào lại LLM → trả lời streaming → ghi log.
4. **Gợi ý:** worker/ML huấn luyện offline → ghi bảng → service gợi ý đọc, trộn, lọc luật, trả kết quả kèm lý do có cấu trúc → ghi `recommendation_events`.

## 7. Tech stack

| Lớp | Lựa chọn | Ghi chú |
| --- | --- | --- |
| Framework | **Next.js (TypeScript) full-stack** | Cố định phiên bản; agent hay viết theo cú pháp cũ |
| UI | Tailwind + shadcn/ui, `next/image` | Mobile-first |
| CSDL | **PostgreSQL + pgvector**, `unaccent`, `pg_trgm` | Qua pooler nếu cần; không mở cổng ra ngoài |
| ORM | Drizzle (hoặc Prisma) | Drizzle hỗ trợ cột vector trực tiếp |
| Kiểm tra dữ liệu | Zod | Mọi API, Server Action, tham số tool |
| Đăng nhập | Auth.js hoặc Better Auth (Google) | Consent screen chuyển sang production |
| Việc nền | `pg-boss` | Hàng đợi trong PostgreSQL, không cần Redis |
| AI | Google Gemini (Flash ổn định) + embedding đa ngôn ngữ; SDK của Google hoặc Vercel AI SDK | Streaming, tool calling |
| ML | Python (`implicit`/item-item, tùy chọn LightFM), pandas, scikit-learn | Container chạy theo lệnh |
| Email | Resend hoặc Brevo, React Email/MJML | SPF/DKIM/DMARC |
| Thanh toán | VietQR (sinh mã) + provider mock | Cắm thêm được |
| Vận chuyển | GHTK sandbox + provider mock | Cắm thêm được |
| Hạ tầng | VPS (khoảng 2 vCPU, 4 GB RAM, SSD 40 GB trở lên, đặt ở VN/Singapore), Docker Compose, Caddy/Nginx, Cloudflare | Kiểm tra lại giá và cấu hình thực tế |
| CI/CD | GitHub Actions build image → GHCR → VPS `pull` và `compose up`; migration là bước riêng | Không build trên VPS nhỏ |
| Quan sát | Sentry, Umami, Uptime Kuma (tùy chọn) |  |
| Bảo vệ bot | Cloudflare Turnstile hoặc reCAPTCHA | Phiên chat mới và đặt hàng |

**Thông số Docker Compose:** chỉ `proxy` mở cổng 80/443; `db` và `worker` chỉ nằm trong mạng nội bộ (không khai báo `ports` cho Postgres, vì Docker có thể bỏ qua luật UFW); Next.js build chế độ `output: 'standalone'`; bí mật nằm trong `.env` trên máy chủ, không vào Git hay image.

## 8. Gợi ý schema cơ sở dữ liệu

Quy ước: khóa chính UUID hoặc bigint; tiền là **số nguyên VND** (`*_vnd`); thời gian `timestamptz`; mọi bảng có `created_at`, `updated_at`; số điện thoại lưu dạng chuẩn hóa (bắt đầu bằng 0).

### 8.1 Catalog

| Bảng | Cột chính |
| --- | --- |
| `products` | id, slug, name, description, collection\_id, warranty\_months, is\_active, content\_hash |
| `variants` | id, product\_id, sku (unique), price\_vnd, stock\_qty, weight\_g, pack\_l/w/h\_mm, is\_fragile, declared\_value\_vnd, warehouse\_id, is\_available |
| `attribute_definitions` | id, key (watt, lumen, color\_temp, socket, voltage, ip\_rating, cord\_min\_cm, cord\_max\_cm, total\_height\_cm...), type, unit, allowed\_values |
| `product_attributes` / `variant_attributes` | owner\_id, attribute\_id, value |
| `option_types` / `variant_options` | màu vỏ, kích thước, màu ánh sáng; liên kết variant với giá trị |
| `categories`, `spaces`, `styles`, `collections` | id, slug, name, thứ tự, ảnh; bảng liên kết `product_categories`, `product_spaces`, `product_styles` |
| `images` | id, product\_id, variant\_id (null được), url, width, height, kind (product/scene), alt, sort, source\_url, author, license |
| `scene_products` | image\_id, product\_id (thay cho hotspot) |
| `bundles`, `bundle_items` | bundle\_id, product\_id/variant\_id (hoặc cho chọn biến thể), qty, discount\_vnd |
| `lighting_rules` | room\_type, lumen\_per\_m2, ghi chú |

### 8.2 Người dùng, giỏ hàng, đơn hàng

| Bảng | Cột chính |
| --- | --- |
| `users` | id, google\_sub, email, name, avatar (khách đã đăng nhập) |
| `admin_users` | id, email, role (`admin`), is\_active |
| `carts`, `cart_items` | cart\_id, session\_id, user\_id (null được), variant\_id/bundle\_id, qty, chat\_session\_id, reserved\_until |
| `orders` | id, code (mã đơn công khai), user\_id (null được), customer\_name, phone, email, address (tỉnh, phường/xã, chi tiết), subtotal\_vnd, discount\_vnd, shipping\_fee\_gross\_vnd, shipping\_fee\_customer\_vnd, shipping\_subsidy\_vnd, total\_vnd, deposit\_required\_vnd, paid\_vnd, cod\_amount\_vnd, coupon\_id, payment\_method, order\_status, payment\_status, delivered\_at, is\_demo, note, tracking\_token\_hash |
| `order_items` | order\_id, variant\_id, sku, tên và giá tại thời điểm đặt (snapshot), qty, bundle\_id |
| `order_events` | order\_id, type, from\_status, to\_status, actor (system/admin/webhook), payload, created\_at (timeline + audit chung) |
| `order_complaints` | order\_id, reason\_code, note, created\_by |
| `payments` | order\_id, provider, type (deposit/full/cod), amount\_vnd, status, provider\_txn\_id (unique), raw\_payload |
| `shipments` | order\_id (unique), provider, tracking\_code, status, fee\_gross\_vnd, cod\_amount\_vnd, raw\_payload |
| `coupons`, `coupon_redemptions` | code, type, value, max\_discount, min\_order, starts/ends, total\_limit, per\_user\_limit; redemption: coupon\_id, order\_id, user\_id, phone, address\_hash |
| `customer_risk` | phone, delivered\_count, returned\_count, boom\_count, last\_event\_at |
| `settings` | key, value (JSON): ngưỡng COD, tỷ lệ cọc, freeship, bảng phí dự phòng, trần chi tiêu AI, chế độ demo |

### 8.3 AI, gợi ý, vận hành

| Bảng | Cột chính |
| --- | --- |
| `content_chunks` | source (product/policy), source\_id, text, embedding vector(N), content\_hash |
| `product_embeddings` | product\_id, embedding vector(N), content\_hash |
| `chat_sessions`, `chat_messages` | session\_id, role, content (đã che dữ liệu cá nhân), tool\_calls, tokens\_in/out, latency, feedback |
| `ai_usage` | day, tokens, est\_cost\_usd (cho cầu dao chi phí) |
| `contact_requests` | name, phone, message, status |
| `interaction_events` | session\_id, user\_id (null), type (view, add\_to\_cart, purchase, filter), product\_id, context, ts (cho ML và analytics) |
| `item_similarity` | product\_id, similar\_id, score, source (content/cf/hybrid), model\_run\_id |
| `model_runs` | id, algorithm, params, data\_version, metrics (hit@k, ndcg@k, coverage), is\_active |
| `recommendation_events` | session\_id, placement, product\_id, algorithm, shown\_at, clicked, added\_to\_cart |
| `email_logs` | order\_id, type, to\_hash, status, provider\_id, error |
| `audit_logs` | admin\_id, action, entity, before, after, ts |

Chỉ mục gợi ý: `variants(sku)`, `orders(code)`, `orders(phone)`, `payments(provider_txn_id)`, GIN trên cột tìm kiếm không dấu, HNSW/IVFFlat trên cột vector (kiểm tra theo quy mô), `interaction_events(session_id, ts)`.

## 9. Máy trạng thái đơn hàng

Hai trục độc lập, chuyển trạng thái chỉ qua một hàm duy nhất kiểm tra điều kiện và ghi `order_events`.

**Trạng thái đơn:** `PENDING` → `CONFIRMED` → `PACKING` → `SHIPPED` → `DELIVERED`; nhánh `CANCELLED`, `RETURNED`, `COMPLAINT`. Chừa sẵn `RETURN_REQUESTED`, `REFUNDED` cho giai đoạn 2.

**Trạng thái thanh toán:** `UNPAID`, `DEPOSIT_PENDING`, `DEPOSIT_PAID`, `PARTIALLY_PAID`, `PAID`, `COD_PENDING`, `COD_COLLECTED`, `EXPIRED`.

**Quy tắc bắt buộc (cần test):**

| Quy tắc | Nội dung |
| --- | --- |
| Cọc trước khi giao | Không chuyển `SHIPPED` nếu đơn cần cọc mà chưa `DEPOSIT_PAID` hoặc `PAID` |
| Hết hạn giữ hàng | Đơn `DEPOSIT_PENDING` quá 30 phút tự `CANCELLED`/`EXPIRED`, nhả tồn kho |
| Tạo vận đơn | Chỉ khi `CONFIRMED`, đủ điều kiện thanh toán, địa chỉ hợp lệ, biến thể đủ cân nặng/kích thước, chưa có vận đơn |
| Tiền thu hộ | `cod_amount = total − paid`; đơn đã `PAID` thì bằng 0 |
| Ngày giao | `DELIVERED` ghi `delivered_at` (mốc bảo hành 12 tháng) |
| Hoàn/bom hàng | Chuyển `RETURNED` yêu cầu `reason_code`, cập nhật `customer_risk` |
| Webhook trùng | Bỏ qua nếu `provider_txn_id` hoặc sự kiện đã xử lý |
| Hủy | Chỉ trước `SHIPPED`; nhả tồn kho |

## 10. Bảo mật và checklist

| # | Hạng mục | Kiểm tra |
| --- | --- | --- |
| 1 | Quyền admin ở server | Mọi API/Server Action quản trị gọi `requireRole('admin')`; khách Google không bao giờ thành admin |
| 2 | Bí mật | Khóa Gemini, GHTK, OAuth, webhook secret chỉ ở biến môi trường server; không có trong Git, image, hay bundle client |
| 3 | Webhook | Xác thực chữ ký, idempotent, trả 200 nhanh, không gọi chuỗi API ngoài trong lúc đối tác chờ |
| 4 | Tiền | Tính lại giá, mã giảm, phí ở server; không tin số từ client; kiểm tra bằng test |
| 5 | Chống lạm dụng mã | Giới hạn lượt theo tài khoản, SĐT, địa chỉ; hết hạn |
| 6 | Chống đơn ảo | Turnstile, rate limit theo IP và email, rate limit đăng nhập |
| 7 | Chatbot | Danh sách hàm cố định, Zod, tra đơn cần mã + 4 số cuối SĐT hoặc đăng nhập, che dữ liệu, bot chỉ đọc, giới hạn lượt, cầu dao chi phí, chống prompt injection |
| 8 | Dữ liệu cá nhân | HTTPS, che SĐT/địa chỉ ở log và gửi LLM, trang quyền riêng tư, xóa dữ liệu thử |
| 9 | Hạ tầng | Không mở cổng DB; SSH bằng khóa, tắt mật khẩu, fail2ban, người dùng không phải root, tự cập nhật bản vá |
| 10 | Sao lưu | `pg_dump` hằng ngày sang nơi khác, đã thử khôi phục |
| 11 | Liên kết theo dõi đơn | Token ký, hết hạn, gắn với một đơn, chỉ lộ thông tin đã che |
| 12 | Email | SPF/DKIM/DMARC, rate limit theo địa chỉ nhận, nhãn DEMO |
| 13 | Tránh hiểu nhầm | Banner đồ án, không nhận tiền thật, `noindex`, chặn `/admin` và `/api` trong `robots.txt` |
| 14 | Phụ thuộc | Cố định phiên bản, rà soát cú pháp agent sinh ra |

## 11. Kế hoạch 4 tuần và module giao cho agent

| Tuần | Mục tiêu | Đầu ra |
| --- | --- | --- |
| 1 | Nền tảng, dữ liệu | Repo, Docker Compose, schema, seed CSV (30-40 sản phẩm có ảnh), persona và dữ liệu hành vi mô phỏng, trang danh mục/sản phẩm, duyệt theo không gian/phong cách. **Chọn và tải ảnh song song, xong trong tuần này** |
| 2 | Bán hàng | Giỏ hàng, checkout (vãng lai + Google), đơn hàng và máy trạng thái, VietQR giả lập, Admin tối thiểu, email giao dịch, **test tự động cho quy tắc tiền** |
| 3 | AI | Chatbot RAG + function calling, công cụ lumen, mô hình gợi ý hybrid (huấn luyện offline trước khi tích hợp bot), mã giảm giá, ngưỡng COD/cọc, tra đơn qua bot |
| 4 | Hoàn thiện | Deploy, chống spam và cầu dao chi phí AI, đánh giá offline (Hit@K, NDCG@K, coverage), GHTK (nếu kịp), kiểm thử tay theo kịch bản demo, báo cáo, slide, video demo dự phòng |

**Danh sách việc theo thứ tự cho agent** (mỗi mục làm riêng, có tiêu chí nghiệm thu ở mục 12):

1. Khởi tạo repo, Docker Compose, CI build image, file `AGENTS.md` (mục 15).
2. Schema + migration + seed từ CSV (idempotent, validation theo dòng).
3. Module `catalog`, `search`, trang danh mục/sản phẩm mobile-first.
4. Module `pricing` (hàm thuần) **kèm test trước**, rồi `cart`.
5. Module `orders` (máy trạng thái), `payments` (VietQR + mock), checkout.
6. Admin tối thiểu (CRUD, đơn, cấu hình), `notifications` (email qua hàng đợi).
7. Module `lighting`, `chatbot` (tool registry, RAG, giới hạn, cầu dao, log).
8. Container ML (item-item + embedding + đánh giá offline), module `recommendations`, `recommendation_events`.
9. Mã giảm giá, freeship, ngưỡng COD/cọc, hết hạn giữ hàng (worker).
10. `shipping` (adapter mock → GHTK sandbox), webhook, nút tạo vận đơn trong Admin.
11. SEO, analytics, trang tĩnh, banner đồ án, `noindex`.
12. Deploy, sao lưu, bảo mật theo checklist mục 10.

## 12. Tiêu chí nghiệm thu

| Hạng mục | Tiêu chí |
| --- | --- |
| Duyệt và lọc | Duyệt theo không gian/phong cách/danh mục; lọc theo màu sáng, tầm giá, kích thước; tìm "den tha" ra "đèn thả" |
| Lumen/chiều cao trần | Nhập diện tích, loại phòng, trần → hiện lumen khuyến nghị; đèn thả không đủ dây hoặc quá thấp bị loại; web và bot cho cùng kết quả |
| Giá và khuyến mãi | Giá sau mã, freeship, tiền thu hộ khớp test; mỗi đơn một mã; khách vãng lai thấy gợi ý đăng nhập khi nhập mã |
| Checkout | Đặt được với khách vãng lai (có email) và Google; ngưỡng COD/cọc đúng bảng; đơn chờ cọc tự hết hạn sau 30 phút và nhả tồn kho |
| Thanh toán | QR đúng số tiền và nội dung; xác nhận giả lập chuyển trạng thái đúng; xác nhận trùng không ghi nhận hai lần |
| Đơn hàng | Mọi chuyển trạng thái qua một hàm và có trong timeline; không `SHIPPED` khi chưa đủ điều kiện thanh toán |
| Vận chuyển | Tạo vận đơn (GHTK sandbox hoặc mock) với tiền thu hộ đúng; bấm hai lần không tạo trùng; mô phỏng được đủ vòng đời |
| Email | Đủ bốn loại, qua hàng đợi, không gửi trùng, có nhãn DEMO, tới được hộp thư Gmail/Outlook |
| Chatbot | Trả lời đúng thông số, giá, tồn kho từ hàm; hỏi ngược khi thiếu thông tin; tra đơn chỉ với mã + 4 số cuối SĐT hoặc đăng nhập; từ chối chủ đề ngoài phạm vi; hiện Zalo/hotline khi không chắc; chạm trần thì chuyển chế độ giới hạn |
| Gợi ý ML | Có ô gợi ý ở trang sản phẩm, giỏ hàng, trang chủ và qua bot; luật lọc luôn đúng (hết hàng, trần, đui bóng); có `model_runs` và số liệu Hit@K, NDCG@K, coverage so với đường cơ sở |
| Admin | Đăng nhập admin tách biệt; mọi API quản trị kiểm tra quyền server; có audit log; báo cáo mức trung bình hiển thị đủ chỉ số |
| Hiệu năng | LCP dưới 2,5 giây trên 4G cho trang chủ, danh mục, sản phẩm (đo thực tế) |
| Bảo mật | Qua checklist mục 10 |
| Demo | Chạy trọn kịch bản: duyệt → chat → giỏ → đặt → thanh toán giả lập → xử lý đơn (kể cả khi sandbox lỗi) |

Kiểm thử ở mức tối giản: kiểm thử tay theo kịch bản demo, cộng **khoảng 10-15 test tự động cho quy tắc tiền và máy trạng thái** (giá, mã giảm, freeship, ngưỡng COD/cọc, tiền thu hộ, hết hạn giữ hàng, chuyển trạng thái hợp lệ).

## 13. Rủi ro chính và cách giảm

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Phạm vi lớn so với 4 tuần | Cao | Thứ tự P0 → P1 → P2; lùi từ dưới lên; điểm cắt cuối tuần 3 |
| Thiếu dữ liệu hành vi cho ML | Cao | Persona mô phỏng + content-based + luật; trình bày hạn chế trung thực |
| Tự chấm điểm trên dữ liệu tự sinh | Trung bình | Tách theo thời gian, thêm nhiễu, đường cơ sở, báo cáo hạn chế |
| Chatbot bịa giá/thông số | Cao | Giá và tồn kho chỉ từ hàm; RAG cho kiến thức; Zod; bộ câu hỏi thử tay |
| Cháy ngân sách AI | Cao | Giới hạn theo phiên/IP, cầu dao chi phí, trần ở nhà cung cấp, chế độ giới hạn |
| Lộ dữ liệu qua tra đơn | Cao | Mã đơn + 4 số cuối SĐT hoặc đăng nhập; trả thông tin tối thiểu; giới hạn thử |
| Agent viết sai logic tiền/trạng thái | Cao | Test trước, một hàm chuyển trạng thái, review tay |
| Ảnh stock không khớp biến thể/thông số | Trung bình | Ảnh theo mẫu, swatch màu, đặt thông số nhất quán với hình dáng, ghi chú "ảnh minh họa" |
| Sandbox GHTK lỗi, địa chỉ hai cấp | Trung bình | Adapter mock, công cụ giả lập sự kiện, lớp chuyển đổi địa chỉ |
| VPS là một điểm lỗi duy nhất | Trung bình | Chạy được trên laptop, video demo, sao lưu đã thử khôi phục |
| Lạm dụng email/đơn ảo | Trung bình | Turnstile, rate limit theo IP và email, nhãn DEMO |
| Hiểu nhầm là cửa hàng thật | Trung bình | Banner, không nhận tiền thật, `noindex`, trang giới thiệu đồ án |
| Gói miễn phí dùng dữ liệu để huấn luyện | Trung bình | Dùng gói trả phí khi mở cho người ngoài; kiểm tra điều khoản hiện hành; che dữ liệu cá nhân |

## 14. Hướng phát triển (giai đoạn 2)

- **Thanh toán:** trả góp (đơn lớn của gia đình mới nhận nhà), ví điện tử và thẻ qua cổng chính thức, hàng đợi giao dịch chưa khớp, đối soát COD, nối webhook VietQR/ngân hàng thật.
- **Pháp lý và vận hành thật:** đăng ký hộ kinh doanh hoặc doanh nghiệp, thông báo website với Bộ Công Thương, hóa đơn điện tử, kê khai thuế, đa kho, hàng loạt đơn, thêm GHN/Viettel Post.
- **Hậu mãi:** luồng đổi trả và hoàn tiền (`RETURN_REQUESTED`, `REFUNDED`), đánh giá có ảnh gắn đơn đã giao, trang tra cứu bảo hành.
- **Marketing:** tích điểm/hạng thành viên, flash sale, mua nhiều giảm nhiều, Zalo OA (chạy chatbot trên Zalo), Facebook/TikTok Pixel.
- **Trải nghiệm:** hotspot "shop the look" trên ảnh phối cảnh dựng riêng, so sánh sản phẩm, wishlist, đa ngôn ngữ.
- **Quản trị:** RBAC nhiều vai trò (`staff`, `editor`, chỉ xem), thống kê riêng cho chatbot và phễu chuyển đổi.
- **AI/ML:** học xếp hạng với đặc trưng ngữ cảnh, thử nghiệm A/B giữa thuật toán, cá nhân hóa theo tài khoản, chatbot đa phương thức (ảnh phòng của khách).
- **B2B/Marketplace** (nếu mở rộng): `seller_id`, tách đơn theo người bán, đối soát; chừa chỗ trong thiết kế.

## 15. Quy tắc bắt buộc cho agent (chép vào `AGENTS.md`)

1. Tiền luôn là **số nguyên VND**, không dùng số thực. Tính toán giá, mã giảm, freeship, ngưỡng COD/cọc, tiền thu hộ chỉ ở module `pricing` (hàm thuần, có test).
2. Mọi API và Server Action quản trị phải gọi `requireRole('admin')` ở **server**. Không dựa vào việc ẩn nút trên giao diện.
3. Mọi thay đổi trạng thái đơn đi qua **một hàm duy nhất** kiểm tra chuyển trạng thái hợp lệ và ghi `order_events`.
4. Webhook phải xác thực chữ ký, xử lý **idempotent** theo mã giao dịch/sự kiện, trả 200 nhanh.
5. Khóa API và token chỉ ở biến môi trường phía server; không đưa vào client, Git hay image.
6. Giá, tồn kho, trạng thái đơn trong chatbot **chỉ lấy từ hàm**; web, Admin và bot dùng chung service.
7. Mọi dữ liệu vào (API, Server Action, tham số tool của bot) kiểm tra bằng Zod ở server.
8. Tồn kho khả dụng bỏ qua giữ chỗ đã hết hạn (hết hạn lười); worker chỉ dọn dẹp.
9. Việc chậm hoặc gọi bên ngoài (email, tạo vận đơn, nhúng embedding) chạy qua hàng đợi có retry và khóa chống trùng, không chạy trong luồng đặt hàng.
10. Không mở cổng PostgreSQL ra ngoài; chuỗi kết nối đúng loại (pooler nếu dùng); migration là bước riêng.
11. Giữ kiểu giao diện mobile-first; ảnh qua `next/image` hoặc đã tối ưu sẵn; widget chatbot nạp lười.
12. Cố định phiên bản thư viện; không viết theo cú pháp cũ của Next.js; nếu không chắc API, đọc tài liệu phiên bản đang dùng.
13. Viết test cho `pricing` và máy trạng thái **trước** khi viết giao diện liên quan.
14. Không lưu hay gửi số điện thoại, địa chỉ vào log, analytics hoặc LLM ở dạng nguyên bản.
15. Mặc định `noindex`; mọi đơn và email mang nhãn DEMO.
