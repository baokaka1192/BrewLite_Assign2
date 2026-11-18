# Bối cảnh và phạm vi

BrewLite là ứng dụng đặt cà phê không dùng tiền mặt trong bài tập môn Công nghệ phần mềm, Đại học Sài Gòn, năm học 2026–2027. Tài liệu này đáp ứng Task 1.1 của Assignment 2: xác định vấn đề, các bên liên quan và ranh giới sản phẩm trước khi mô hình hóa.

## Vấn đề cần giải quyết

Khách hàng cần xem món còn bán, chọn size và topping, kiểm tra giỏ hàng, đặt và thanh toán đơn rồi xem lại trạng thái. Cửa hàng cần tránh nhận đơn vượt tồn kho và tránh tạo đơn hoặc ghi nhận thanh toán trùng khi khách gửi lại yêu cầu.

Luồng tối thiểu: **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**. Thanh toán trong bài tập dùng cổng giả lập, không chuyển tiền thật.

## Stakeholder

| Bên liên quan | Mục tiêu | Kỳ vọng và cách đối chiếu |
| ------------- | -------- | ----------------------- |
| Khách hàng | Chọn đúng món, biết tổng tiền và kết quả thanh toán | Xem menu, tùy chọn, giỏ hàng, đặt đơn, thanh toán Ví/Thẻ giả lập; chỉ xem được đơn của mình và có thể thử lại khi thanh toán thất bại |
| Nhân viên quầy | Biết đơn đã thanh toán và tiến độ phục vụ | Có quy tắc trạng thái rõ ràng; API đổi trạng thái là phần mở rộng, chưa có giao diện barista trong MVP |
| Quản lý cửa hàng / Product Owner | Ưu tiên yêu cầu, nghiệm thu và hạn chế sai tiền, trùng đơn, bán vượt kho | Máy chủ tính giá, giữ kho khi tạo đơn, trả kho khi hủy; báo cáo doanh thu và giao diện quản trị không thuộc MVP |
| Giảng viên / khách hàng nghiệm thu | Đánh giá phạm vi và yêu cầu có thể kiểm chứng | Có SRS, sơ đồ use-case, đặc tả luồng đặt và thanh toán; phân biệt yêu cầu, giới hạn hiện có và phần chưa thực hiện |
| Nhóm phát triển | Có cơ sở triển khai và kiểm thử thống nhất | Mã FR/NFR, ưu tiên MoSCoW, tiêu chí chấp nhận rõ; dùng Next.js, NestJS, PostgreSQL và Docker theo đề |
| Đơn vị thanh toán | Nhận yêu cầu hợp lệ, trả kết quả nhất quán | Đóng vai trò qua cổng giả lập Ví/Thẻ, có nhánh thành công và từ chối; chưa tích hợp nhà cung cấp thật |

Các mục tiêu trên được tổng hợp từ đề và README, chưa phải biên bản phỏng vấn hay xác nhận riêng của stakeholder.

## Trong phạm vi MVP (in-scope)

| Mã | Nội dung |
| -- | -------- |
| PV-01 | Menu theo loại, chi tiết sản phẩm, tình trạng còn hàng, chọn size và topping hợp lệ. |
| PV-02 | Giỏ hàng: thêm, sửa số lượng, xóa món và hiển thị tiền tạm tính. |
| PV-03 | Đăng ký, đăng nhập bằng email/mật khẩu, JWT và kiểm tra phiên; đặt đơn yêu cầu đăng nhập. |
| PV-04 | Báo giá từ máy chủ, tạo đơn, giữ tồn kho trong transaction và chống tạo trùng theo người dùng/key. |
| PV-05 | Thanh toán Ví/Thẻ giả lập, xác nhận kết quả và thử lại khi bị từ chối. |
| PV-06 | Xem chi tiết, trạng thái và lịch sử đơn của chính khách hàng; xử lý dữ liệu sai, hết hàng và mất phiên. |
| PV-07 | Chạy local bằng Docker Compose, dùng migration và seed để tái tạo dữ liệu theo README. |

## Phạm vi mở rộng

| Hạng mục | Ưu tiên | Giới hạn |
| -------- | ------- | -------- |
| Voucher và điểm thưởng | Should | README đã mô tả nghiệp vụ; bổ trợ luồng đặt đơn, không thay đổi tổng tiền từ phía trình duyệt |
| Hủy đơn | Should | Theo trạng thái cho phép; trả kho, voucher, điểm nhưng không hoàn tiền |
| Cập nhật trạng thái phục vụ qua API nhân viên | Should | Chỉ bật khi có cấu hình quyền nhân viên; không bao gồm giao diện barista |
| Đăng nhập Google | Could | Tùy cấu hình; không bắt buộc cho luồng MVP |
| PWA | Should | Định hướng của đề; chưa thực hiện hoặc xác nhận khả năng cài đặt hay chạy offline, không tuyên bố đã hoàn thành |
| Production và CI/CD | Should | Là đầu ra các task sau của đề; chưa thực hiện hoặc xác nhận trong phạm vi tài liệu Task 1 này |

## Ngoài phạm vi MVP (out-of-scope)

| Mã | Nội dung |
| -- | -------- |
| NPV-01 | Cổng thanh toán thật, lưu thông tin thẻ thật, chuyển tiền và hoàn tiền tự động. |
| NPV-02 | Giao diện barista, màn hình quản trị menu/tồn kho, phân ca và báo cáo doanh thu. |
| NPV-03 | Giao hàng, định vị tài xế, quản lý nhiều chi nhánh và đồng bộ với POS bên ngoài. |
| NPV-04 | Đặt hoặc thanh toán đơn khi offline; PWA là Should, chưa thực hiện hoặc xác nhận và không cam kết hỗ trợ nghiệp vụ offline. |

Task 1 chỉ tạo tài liệu yêu cầu và use-case. Activity, sequence, class, kiến trúc, triển khai pipeline và ma trận truy vết được để cho các task tương ứng, không thực hiện tại đây.

## Giả định

| Mã | Nội dung |
| -- | -------- |
| GĐ-01 | Khách hàng có trình duyệt và kết nối mạng; dữ liệu mẫu được seed trước khi demo. |
| GĐ-02 | Khách chưa đăng nhập có thể xem menu và chọn món; cần tài khoản hợp lệ để đặt và thanh toán. |
| GĐ-03 | Giá, tồn kho, voucher và tổng tiền trên máy chủ là căn cứ cuối cùng. Giá trong giỏ chỉ là tạm tính. |
| GĐ-04 | Cổng thanh toán giả lập đủ để kiểm chứng thành công, từ chối và thử lại; không đại diện cho quy trình đối soát tài chính thật. |
| GĐ-05 | Luồng giao nhận tại quầy do con người thực hiện; ứng dụng chỉ ghi nhận trạng thái khi có API được cấp quyền. |

## Ràng buộc

| Mã | Nội dung |
| -- | -------- |
| RB-01 | Giữ Next.js ở `apps/web`, NestJS ở `apps/api`, PostgreSQL làm nơi lưu dữ liệu; dùng Docker cho môi trường local theo README. |
| RB-02 | Chỉ dùng các endpoint đã công bố trong mục **Danh sách API** của README. Không suy diễn rằng đã có API quản trị hoặc tích hợp thanh toán thật. |
| RB-03 | Luồng trạng thái và giữ/trả kho phải theo các mục **Trạng thái đơn hàng**, **Tồn kho và đặt hàng đồng thời** của README. |
| RB-04 | Không ghi bí mật hoặc giá trị cấu hình nhạy cảm vào tài liệu; tài khoản và thẻ dùng khi thử nghiệm phải là dữ liệu giả. |
| RB-05 | Đề Assignment 1, mục 4.2, yêu cầu thời gian phản hồi API < 500ms với dữ liệu mẫu là seed trong README; đo bằng `curl` theo NFR-01 trong [SRS](srs.md), gồm cả độ trễ cổng giả lập. Chưa có kết quả đo hoặc cam kết uptime; không bổ sung ngưỡng hiệu năng khác. |
| RB-06 | Kế hoạch hiện có trong `docs/scrum/sprint-plan.md` chia ba sprint; đề Assignment 2 yêu cầu hai sprint triển khai. Assignment 1 gợi ý ba sprint tại mục 2.3. Đây là khác biệt nguồn cần nhóm chốt ở phần kế hoạch, không tự sửa hoặc coi đã khớp trong Task 1. |

## Rủi ro ban đầu

| Rủi ro | Ảnh hưởng | Hướng xử lý |
| ------ | --------- | ---------- |
| Hai khách đặt món cuối cùng cùng lúc | Bán vượt kho hoặc đơn giữ kho dở dang | Giữ kho cùng transaction tạo đơn, khóa lạc quan và rollback toàn bộ khi xung đột không giải quyết được |
| Khách bấm lại hoặc mất phản hồi sau khi gửi | Tạo đơn, giao dịch hoặc điểm thưởng trùng | Dùng Idempotency-Key đúng phạm vi người dùng; gửi lại cùng nội dung/key, kiểm tra đơn trước khi tạo mới |
| Giá hoặc tồn kho thay đổi sau khi thêm vào giỏ | Tổng tiền hoặc món không còn hợp lệ | Báo giá và kiểm tra lại khi tạo đơn, hiển thị lỗi để khách sửa giỏ |
| Thanh toán bị từ chối hoặc bị gián đoạn | Khách không rõ đã thanh toán chưa | Hiển thị trạng thái đơn, giữ khả năng thử lại và xử lý giao dịch đang chạy theo README |
| Token lưu trong localStorage | Script độc hại có thể đọc phiên đăng nhập | Ghi nhận hạn chế XSS của bản bài tập; tránh nội dung không tin cậy, xem xét cookie httpOnly cho bản thật |
| Hủy đơn đã thanh toán không hoàn tiền | Khách hiểu sai kết quả hủy | Thông báo rõ trước khi hủy; không quảng bá hỗ trợ hoàn tiền |
| Chưa đo hiệu năng và chưa xác nhận stakeholder | Chưa đủ bằng chứng kết luận đạt yêu cầu | Đo với seed trong README và đối chiếu ngưỡng tại NFR-01; ghi môi trường, kết quả và phần giả định cần xác nhận |
| Mục tiêu production/PWA bị hiểu là đã hoàn thành | Báo cáo sai mức độ sẵn sàng | Ghi là Should hoặc chưa thực hiện, chỉ xác nhận khi có minh chứng |

## Nguồn

- [README](../../README.md): Danh sách API, Trạng thái đơn hàng, Tồn kho và đặt hàng đồng thời, Hạn chế đã biết.
- Đề Assignment 1 `BrewLite-CongNghePhanMem.pdf`, mục 3.2, 4.1–4.2, 6 và 9: stakeholder, yêu cầu, công nghệ và quản lý trạng thái; bản đọc tại `/Users/brianle/Downloads/SWE/Assignment/BrewLite-CongNghePhanMem.pdf`.
- [Sprint plan](../scrum/sprint-plan.md): phạm vi các sprint và trạng thái công việc hiện có, không thay thế tiêu chí nghiệm thu Assignment 2.
- Đề `Assignment2-BrewLite.pdf`, phiên bản 1.0, mục 1.1 và 3.1–3.3; bản được đọc tại `/Users/brianle/Downloads/SWE/Assignment/Assignment2-BrewLite.pdf`.
