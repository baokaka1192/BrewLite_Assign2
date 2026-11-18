# Sơ đồ mô hình hóa BrewLite

Ba sơ đồ mô tả luồng đặt và thanh toán đơn hàng cùng các lớp domain của MVP. Tên endpoint và quy tắc nghiệp vụ theo [README](../../README.md), phạm vi theo [SRS và UC-01](../requirements/srs.md), actor theo [sơ đồ use-case](../requirements/usecase.puml). Thuộc tính và quan hệ lưu trữ đối chiếu với [schema Prisma](../../apps/api/prisma/schema.prisma).

| Sơ đồ | File nguồn | Ảnh SVG | Mục đích |
| ----- | ---------- | ------- | -------- |
| Activity | [activity-checkout.puml](activity-checkout.puml) | [activity-checkout.svg](activity-checkout.svg) | Luồng menu → chi tiết → giỏ → đăng nhập → đặt đơn → thanh toán → xác nhận, chia lane Khách hàng, Web, API; có nhánh hết hàng, chưa đăng nhập và thanh toán thất bại. |
| Sequence | [sequence-checkout.puml](sequence-checkout.puml) | [sequence-checkout.svg](sequence-checkout.svg) | UC-01 giữa Customer, Next.js UI, NestJS API, Database và Payment Service: thứ tự API, JWT/validate, transaction giữ kho, idempotency và kết quả thanh toán. |
| Class | [class-domain.puml](class-domain.puml) | [class-domain.svg](class-domain.svg) | Bảy lớp theo đề, thuộc tính chính, quan hệ/multiplicity trong schema, enum OrderStatus và VoucherType; ghi rõ ánh xạ khuyến mãi và điểm thưởng. |

## Cách render

Chạy từ thư mục gốc, cần cài PlantUML:

```bash
plantuml -tsvg docs/diagrams/activity-checkout.puml
plantuml -tsvg docs/diagrams/sequence-checkout.puml
plantuml -tsvg docs/diagrams/class-domain.puml
```

Mỗi lệnh tạo ảnh `.svg` cùng tên, cùng thư mục với nguồn `.puml`.

## Lưu ý khi đọc

- `Promotion` là tên theo đề, ánh xạ sang model `Voucher`; các thuộc tính trong lớp lấy từ `Voucher`. Schema không có bảng `Promotion`. `Order.voucherCode` chỉ là chuỗi, không có khóa ngoại tới `Voucher`; nét đứt thể hiện đối chiếu nghiệp vụ, không gán multiplicity lưu trữ.
- `LoyaltyTransaction` là lớp khái niệm theo đề, chưa có model/bảng riêng. Lớp để trống thuộc tính, không thêm khóa ngoại hoặc quan hệ lưu trữ giả định. Điểm thực tế nằm ở `User.loyaltyPoints` và `Order.pointsEarned`.
- Multiplicity nét liền theo schema: `Order.userId` nullable, còn `Order.items` có thể rỗng ở mức cấu trúc. UC-01 yêu cầu khách đã đăng nhập và ít nhất một dòng hàng hợp lệ. `Payment.status` và `Payment.method` là chuỗi, không phải enum Prisma.
- Transaction tạo đơn đồng thời giữ kho; báo giá không giữ kho. Thanh toán bị từ chối trả 402, đơn ở `PAYMENT_FAILED`, vẫn giữ kho và không cộng điểm. Khách có thể thử lại trên cùng đơn hoặc hủy hợp lệ; hủy không hoàn tiền. Cổng chỉ giả lập Ví/Thẻ.
- Gửi lại khi mất phản hồi phải giữ nguyên key và nội dung; kiểm tra đơn trước khi bắt đầu thao tác mới. Đổi thông tin thanh toán sau khi bị từ chối thì dùng key thanh toán mới. Gửi lại kết quả thành công không cộng điểm lần nữa.
- Các nhánh lỗi trong activity kết thúc lần thao tác đang mô tả, có hướng dẫn sửa và thử lại. Sequence đi sâu UC-01; bước phục vụ sau `PAID` được liệt kê trong class để giải thích enum, không mở rộng use-case thanh toán.

## Rà soát Task 2 (G1-B, 30/10/2026)

Đã đối chiếu cả ba nguồn PlantUML với UC-01 và các FR trong SRS, use-case (chỉ đọc), bảng API và trạng thái đơn ở README gốc, schema Prisma (chỉ đọc), và mục 4 của đề Assignment 2. Các dòng dưới đây là vị trí **sau sửa**.

| File/dòng | Lỗi hoặc thiếu sót tìm thấy | Cách sửa |
| --- | --- | --- |
| `activity-checkout.puml:28` | Chưa thể hiện chặn giỏ rỗng/không hợp lệ theo FR-03. | Thêm decision, báo sửa giỏ và kết thúc trước khi gửi nghiệp vụ. |
| `activity-checkout.puml:70` | Mọi lần POST tạo đơn đều được mô tả như transaction mới, kể cả gửi lại key; chưa phân biệt 200/201/422. | Thêm nhánh tra key theo người dùng, trả đơn cũ 200, khác nội dung 422; chỉ key mới tạo đơn/giữ kho, trả 201. |
| `activity-checkout.puml:93`, `sequence-checkout.puml:86` | Đơn cũ trả về sau gửi lại yêu cầu tạo đơn vẫn luôn dẫn tới gửi thanh toán, dù đã PAID/đang phục vụ/đã kết thúc. | Chỉ đi vào thanh toán khi PENDING/PAYMENT_FAILED; còn lại đọc và hiển thị trạng thái đã lưu. |
| `activity-checkout.puml:98` | Có tạo key thanh toán nhưng chưa ghi key vào request; kiểm tra JWT của thanh toán chưa rõ. | Ghi rõ Bearer + Idempotency-Key và kiểm tra JWT tại API. |
| `activity-checkout.puml:104` | Dọn giỏ trước bước đọc trạng thái xác nhận được mô tả trong cùng action. | Tách đọc đơn, nhận trạng thái, rồi dọn giỏ sau khi xác định thành công. |
| `sequence-checkout.puml:35` | Nhánh đăng nhập 401 vẫn có thể rơi xuống báo giá vì chỉ có opt. | Thêm break báo lỗi, giữ giỏ, chặn nghiệp vụ cần phiên khi chưa xác thực thành công. |
| `sequence-checkout.puml:50` | Lỗi báo giá chỉ nằm trong ghi chú, chưa có nhánh kết thúc trước tạo đơn. | Thêm break khi báo giá/JWT lỗi, hướng dẫn sửa giỏ/voucher hoặc đăng nhập lại. |
| `sequence-checkout.puml:138` | Thông báo cuối luôn gọi đơn là PAID, không bao quát đơn cũ đã tiến sang PREPARING/READY/COMPLETED hoặc CANCELLED. | Hiển thị trạng thái thực tế và chỉ hướng dẫn thử thanh toán lại khi PENDING/PAYMENT_FAILED. |
| `activity-checkout.puml:112` | Nhánh ghi FAILED/PAYMENT_FAILED kế thừa lane Khách hàng sau nhánh thành công, làm sai thành phần thực hiện. | Đặt lại lane API trước ghi nhận thanh toán thất bại; lane transaction tạo đơn cũng được đặt API rõ ràng. |
| `class-domain.puml` | Không có lỗi thuộc tính, quan hệ schema, multiplicity hoặc OrderStatus. | Giữ nguồn; render lại SVG để đồng bộ và kiểm chứng. |

Không tìm thấy endpoint/method sai hoặc thiếu các nhánh hết hàng, chưa đăng nhập, thanh toán thất bại bắt buộc của đề trong bản đầu vào. Sequence đã có đủ 5 lifeline, JWT/validate, transaction tạo đơn và giữ kho, alt thanh toán thành công/thất bại, idempotency và thông báo kết quả; các sửa đổi trên làm rõ điều kiện tiếp tục luồng.

### Bằng chứng kiểm tra

- `plantuml -tsvg docs/diagrams/activity-checkout.puml docs/diagrams/sequence-checkout.puml docs/diagrams/class-domain.puml`: exit 0, không có lỗi; đã tạo lại cả ba SVG. `plantuml -checkonly docs/diagrams/class-domain.puml` cũng exit 0.
- Đã kiểm tra từng cặp method/path xuất hiện trong sequence bằng ``grep -nF '| METHOD | `/path`' README.md`` (thay METHOD/path bằng từng giá trị thực); cả 8 lần đều exit 0. Bảng sau ghi dòng kết quả thực tế trong README gốc tại thời điểm rà soát.

| Endpoint trong sequence | Dòng README gốc |
| --- | --- |
| GET `/products` | 117 |
| GET `/products/:id` | 118 |
| POST `/auth/login` | 120 |
| POST `/orders` | 123 |
| POST `/orders/quote` | 124 |
| GET `/orders/me` | 125 |
| GET `/orders/:id` | 126 |
| POST `/payments` | 129 |

### Điểm lệch còn lại với đề và schema

- Đề yêu cầu thuộc tính chính cho tối thiểu bảy lớp, nhưng schema không có model `LoyaltyTransaction`; lớp này vẫn chỉ là khái niệm, không có thuộc tính/quan hệ lưu trữ riêng để khai báo. Điểm nằm ở hai thuộc tính thật `User.loyaltyPoints` và `Order.pointsEarned`. Chưa thể đáp ứng một lớp giao dịch điểm có dữ liệu riêng nếu không thay đổi schema; việc đó nằm ngoài phạm vi lần rà soát này.
- Tên `Promotion` theo đề ánh xạ sang `Voucher`; không có bảng Promotion. Liên hệ qua `Order.voucherCode` không phải FK, nên không gán multiplicity lưu trữ giả định.
- Schema cho phép Order không có User và không có dòng hàng ở mức cấu trúc; UC-01 yêu cầu JWT và ít nhất một dòng hợp lệ. Class ghi đúng mức schema, activity/sequence thể hiện ràng buộc nghiệp vụ. Payment.status/method là String, còn OrderStatus và VoucherType là enum thật.
- Không phát hiện mâu thuẫn còn lại với SRS/use-case trong phạm vi UC-01. Đây là kiểm tra tài liệu và render, không phải kết quả kiểm thử runtime của API.
