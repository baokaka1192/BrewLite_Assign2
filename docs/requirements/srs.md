# SRS rút gọn

Tài liệu đặc tả Task 1.2 và Task 1.3 của Assignment 2 BrewLite. Phạm vi và stakeholder nằm trong [Bối cảnh và phạm vi](context-and-scope.md). Các tiêu chí dưới đây là cơ sở viết test và nghiệm thu, không phải tuyên bố mọi yêu cầu đã được kiểm thử đạt.

## Quy ước

- **Must**: bắt buộc cho MVP; **Should**: nên có, có thể lùi khi cần; **Could**: tùy chọn; **Won’t**: không thực hiện trong MVP.
- API dùng tiền tố `/api`; bảng bên dưới ghi đường dẫn tương đối đúng như mục **Danh sách API** của [README](../../README.md).
- Giỏ hàng nằm ở giao diện; README không công bố API giỏ hàng. Không bổ sung endpoint mới trong SRS.
- Thanh toán là giả lập. Barista không có giao diện trong MVP; cập nhật trạng thái bằng API nhân viên là phần mở rộng.

## Yêu cầu chức năng

| Mã | Yêu cầu | MoSCoW | API liên quan | Tiêu chí chấp nhận |
| -- | ------- | ------ | ------------ | ------------------ |
| FR-01 | Xem menu và lọc theo loại | Must | GET `/products` | Không đăng nhập vẫn nhận danh sách có hình, tên, giá với HTTP 200; lọc coffee, tea, pastry chỉ hiện món thuộc loại được chọn; category sai trả 400. Giao diện phân biệt đang tải, danh sách rỗng và lỗi có thể thử lại. |
| FR-02 | Xem chi tiết và chọn tùy chọn sản phẩm | Must | GET `/products/:id` | ID có thật trả 200 và hiển thị giá, tình trạng hàng, size/topping phù hợp; ID không có trả 404 và thông báo rõ. Đồ uống chọn được size/topping được cung cấp, bánh không có tùy chọn; món hết hàng không được thêm mới từ giao diện. |
| FR-03 | Quản lý giỏ hàng | Must | Không có API riêng; xử lý trong `apps/web/src/store/cart.ts` | Thêm món kèm tùy chọn, sửa số lượng và xóa món cập nhật đúng dòng hàng và tiền tạm tính; các cấu hình size/topping khác nhau được phân biệt. Giỏ rỗng không thể gửi đặt đơn; số lượng gửi lên phải trong khoảng 1–20 cho mỗi dòng. |
| FR-04 | Đăng ký, đăng nhập và kiểm tra phiên | Must | POST `/auth/register`; POST `/auth/login`; GET `/auth/me` | Đăng ký email mới, mật khẩu hợp lệ trả 201 và token; email trùng trả 409, dữ liệu sai trả 400. Đăng nhập đúng trả 200, sai trả 401; API kiểm tra phiên không có token hợp lệ trả 401. Trang cần đăng nhập chuyển về trang đăng nhập; nhận 401 thì xóa phiên. |
| FR-05 | Lấy báo giá trước khi xác nhận | Must | POST `/orders/quote` | Khách đã đăng nhập gửi giỏ hợp lệ nhận 200 với subtotal, discount, total, voucher, pointsToEarn; thao tác không tạo đơn, không giữ kho hoặc ghi dữ liệu. Tổng dùng để xác nhận lấy từ máy chủ; không tin giá do trình duyệt cung cấp. |
| FR-06 | Tạo đơn và giữ tồn kho an toàn | Must | POST `/orders` | Bearer hợp lệ, giỏ hợp lệ và Idempotency-Key hợp lệ tạo đơn 201 ở PENDING; tổng tiền do máy chủ tính. Thiếu/sai key trả 400, chưa đăng nhập trả 401, sản phẩm không có trả 404. Không đủ hàng hoặc hết lượt thử xung đột trả 409, rollback toàn bộ; không có tồn kho âm hay đơn giữ kho một phần. |
| FR-07 | Chống tạo đơn trùng khi gửi lại | Must | POST `/orders` | Cùng người dùng, key và nội dung trả lại đơn cũ với 200, không giữ thêm kho. Cùng người dùng/key nhưng nội dung khác trả 422. Đối chiếu số đơn và tồn kho trước/sau hai lần gửi để xác nhận không phát sinh hiệu ứng phụ trùng. |
| FR-08 | Thanh toán Ví/Thẻ giả lập và thử lại | Must | POST `/payments` | Gửi Bearer, Idempotency-Key và orderId của mình; thành công trả 201, đơn thành PAID. Thẻ 12–19 chữ số kết thúc bằng 0000 bị từ chối với 402, đơn thành PAYMENT_FAILED; khách đổi phương thức để thử lại cùng đơn. Ví thành công trừ trường hợp tổng vượt giới hạn giả lập mô tả trong README. Gửi lại cùng yêu cầu/key không ghi nhận thanh toán thành công hoặc cộng điểm hai lần; cùng key nhưng nội dung khác trả 422, xung đột trả 409. Số tiền lấy từ đơn trong database. |
| FR-09 | Xem xác nhận, trạng thái và lịch sử đơn cá nhân | Must | GET `/orders/me`; GET `/orders/:id` | Lịch sử trả 200 với items, page, limit, total; page mặc định 1, limit mặc định 20 và tối đa 50. Khách mở được đơn của mình; ID không tồn tại hoặc thuộc người khác trả 404. Sau thanh toán hiển thị đúng PAID hoặc PAYMENT_FAILED từ máy chủ, không suy ra thành công chỉ từ thao tác bấm nút. |
| FR-10 | Quản lý trạng thái phục vụ qua API nhân viên | Should | PATCH `/orders/:id/status` | Khi bật và có khóa nhân viên đúng, chỉ nhận PREPARING, READY, COMPLETED theo chuỗi PAID → PREPARING → READY → COMPLETED. Chuyển sai trả 409; khóa sai trả 403; chưa bật trả 404. Không có giao diện barista trong MVP, không cho khách dùng token cá nhân để thay quyền nhân viên. |
| FR-11 | Hủy đơn theo trạng thái cho phép | Should | POST `/orders/:id/cancel` | Chủ đơn hủy được ở PENDING, PAYMENT_FAILED, PAID hoặc PREPARING và nhận 200; trả kho, voucher và điểm trong cùng transaction, điểm không âm. READY hoặc trạng thái cuối không thể hủy, trả 409. Giao diện phải nói rõ hủy không hoàn tiền, kể cả đơn đã thanh toán. |
| FR-12 | Áp dụng voucher và ghi nhận điểm thưởng | Should | POST `/orders/quote`; POST `/orders`; POST `/payments`; POST `/orders/:id/cancel` | Voucher không có, hết hạn, chưa đạt tiền tối thiểu hoặc hết lượt trả 400 với code tương ứng trong README. Thanh toán thành công cộng floor(tổng tiền / 10.000) điểm một lần; gửi lại thanh toán không cộng thêm, hủy thì thu hồi điểm theo quy tắc không âm. |
| FR-13 | Đăng nhập Google tùy cấu hình | Could | POST `/auth/google` | Khi bật, idToken hợp lệ trả 200 và tài khoản được liên kết/tạo theo email; token sai hoặc email chưa xác minh trả 401. Khi chưa bật trả 404 và giao diện ẩn nút Google. |
| FR-14 | Tích hợp thanh toán thật và hoàn tiền | Won’t | Không có endpoint được công bố cho nghiệp vụ thật | MVP chỉ gọi cổng giả lập; demo, giao diện và tài liệu không khẳng định có chuyển tiền thật hoặc hoàn tiền tự động. |

Số lượng, giới hạn dữ liệu, mã HTTP và công thức nghiệp vụ trong bảng lấy từ README; đây không phải ngưỡng hiệu năng tự đặt.

## Yêu cầu phi chức năng

| Mã | Nhóm và yêu cầu | MoSCoW | Tiêu chí chấp nhận và cách kiểm chứng |
| -- | -------------- | ------ | ------------------------------------ |
| NFR-01 | Hiệu năng: thời gian phản hồi API < 500ms với dữ liệu mẫu | Must | Nguồn: đề Assignment 1, mục 4.2. Chạy hệ thống và seed theo mục **Cách chạy trên máy (dev)** hoặc **Cách chạy bằng Docker (cả 3 dịch vụ)**, dùng đúng **Dữ liệu mẫu** trong README. Gửi yêu cầu hợp lệ tới các API trong SRS, đo bằng `curl -w '%{time_total}\n' -o /dev/null`, đổi giây sang mili giây; mỗi phản hồi đo được phải < 500ms, gồm cả độ trễ thanh toán giả lập, không trừ thời gian cổng. Lưu method/đường dẫn, mã HTTP, thời gian từng lần gọi, cấu hình máy, cách chạy, phiên bản, số lần gọi và mức đồng thời thực tế để tái lập; dùng tài khoản/thẻ giả, key mới cho thao tác mới, giỏ có hàng và bật cấu hình cho API tùy chọn cần đo. Đây là tiêu chí nghiệm thu, chưa có kết quả đo để tuyên bố đạt. |
| NFR-02 | Bảo mật: xác thực, phân quyền và kiểm tra đầu vào | Must | Rà soát xử lý đăng ký/đăng nhập và dữ liệu tài khoản thử để xác nhận mật khẩu được băm, không lưu bản rõ; kiểm tra thiếu/sai JWT trả 401 với nghiệp vụ khách hàng cần phiên; người dùng khác đọc đơn nhận 404. Dữ liệu email, mật khẩu, số lượng, size, topping và số thẻ sai bị từ chối; token khách không thay thế được khóa nhân viên. Kiểm tra API không dùng giá/tổng tiền do khách sửa để quyết toán đơn. |
| NFR-03 | Bảo mật: bảo vệ cấu hình và phiên | Must | Rà soát tài liệu, mã và log thử nghiệm không chứa bí mật thật hoặc số thẻ thật; cấu hình nhạy cảm lấy từ môi trường. Chưa xác nhận triển khai production; tiêu chí kiểm tra cấu hình là từ chối khóa ký JWT thiếu, quá ngắn hoặc là giá trị mẫu theo README. Token hiện lưu localStorage là hạn chế đã biết, chưa đạt cơ chế cookie httpOnly của bản thật. |
| NFR-04 | Tính khả dụng và dễ sử dụng: luồng mobile-first | Must | Kiểm tra trên trình duyệt web ở màn hình điện thoại và máy tính, ghi tên và phiên bản trình duyệt: menu, tùy chọn, giỏ, đăng nhập, thanh toán và lịch sử không che nút thao tác hoặc thông tin tổng tiền; mỗi trang dữ liệu có trạng thái đang tải, rỗng, lỗi phù hợp. Người thử thực hiện được kịch bản demo README và nhận thông báo rõ ở nhánh hết hàng, mất phiên, thanh toán thất bại. |
| NFR-05 | Tính sẵn sàng và phục hồi thao tác | Must | Mô phỏng mất mạng/mất phản hồi sau khi tạo đơn hoặc thanh toán, gửi lại cùng key và nội dung, rồi đối chiếu lịch sử, tồn kho và điểm: không có đơn hoặc thanh toán thành công trùng. Giao diện cho biết lỗi và cho phép thử lại; không tự hiển thị thanh toán thành công khi chưa có kết quả. Chưa cam kết tỷ lệ uptime vì đề không quy định và chưa có số liệu vận hành. |
| NFR-06 | Tính nhất quán khi đặt hàng đồng thời | Must | Với nhiều yêu cầu tranh cùng lượng hàng giới hạn, số đơn thành công không vượt lượng hàng ban đầu; các yêu cầu thất bại không để lại đơn hoặc trừ kho một phần. Gửi lại key không trừ kho thêm, hủy hợp lệ trả lại kho đúng một lần. Đây là điều kiện toàn vẹn dữ liệu, không phải mục tiêu thông lượng. |
| NFR-07 | Khả năng triển khai và tái tạo local | Must | Trên bản checkout mới, làm theo README để cài phụ thuộc, chạy migration/seed và Docker Compose cho web, API, database; mở web, xem menu rồi đặt/thanh toán bằng dữ liệu giả. Khởi động lại với volume giữ nguyên vẫn đọc được đơn đã tạo. Lặp seed không tạo bản ghi mẫu trùng; lưu ý seed có thể đặt lại giá/tồn kho theo README. |
| NFR-08 | Khả năng triển khai production | Should | Chưa thực hiện/xác nhận ở Task 1. Chỉ nghiệm thu khi có URL web HTTPS truy cập được, API hoạt động, database không public trực tiếp và cấu hình bí mật ngoài repository; thực hiện ở task triển khai của đề, không mô tả pipeline tại đây. |
| NFR-09 | PWA | Should | Chưa xác nhận đã thực hiện. Khi triển khai, kiểm tra trình duyệt nhận manifest và cho phép cài ứng dụng; không cam kết đặt đơn/thanh toán offline. Luồng online vẫn phải thỏa FR-01 đến FR-09. |

## Quy tắc nghiệp vụ

- Luồng bình thường: **PENDING → PAID → PREPARING → READY → COMPLETED**. Thanh toán bị từ chối: PENDING → PAYMENT_FAILED; thử lại thành công: PAYMENT_FAILED → PAID. README còn cho phép PAYMENT_FAILED → PENDING; đây không phải endpoint riêng hoặc thao tác trực tiếp của khách.
- PENDING, PAYMENT_FAILED, PAID, PREPARING có thể sang CANCELLED. COMPLETED và CANCELLED là trạng thái cuối. Mọi chuyển sai bị từ chối với 409.
- Tạo đơn giữ kho cùng transaction. Khóa lạc quan theo version; khi version đổi thì đọc lại và thử lại theo giới hạn README; không giải quyết được thì rollback. Món hết kho được đánh dấu không còn bán.
- Giao dịch PROCESSING quá thời gian quy định trong README được đánh dấu FAILED khi có lần thanh toán tiếp theo; không suy diễn có tác vụ nền tự xử lý. Khách phải kiểm tra đơn trước khi tạo yêu cầu mới khi kết quả chưa rõ.
- Hủy đơn trả lại kho, voucher và điểm; không hoàn tiền. Cổng thanh toán không nhận số tiền do khách tùy ý nhập.

## Sơ đồ use-case

Nguồn sơ đồ tổng quát: [usecase.puml](usecase.puml). Nhóm use-case trung tâm trong sơ đồ là **UC-01: Đặt và thanh toán đơn hàng**, bao gồm báo giá, tạo đơn/giữ kho và thanh toán giả lập; các thao tác xem menu, giỏ và xác thực là bước chuẩn bị, xem đơn là bước theo dõi.

Ảnh kết xuất: [usecase.svg](usecase.svg), tạo từ `usecase.puml` bằng lệnh `plantuml -tsvg docs/requirements/usecase.puml`.

Nhân viên chỉ liên kết với phần mở rộng cập nhật trạng thái qua API. Quản lý, giảng viên và nhóm phát triển là stakeholder, không được gán thêm use-case quản trị không có trong phạm vi hiện tại. Actor cổng thanh toán đại diện ranh giới tích hợp logic với bộ giả lập, không phải nhà cung cấp thật.

## UC-01: Đặt và thanh toán đơn hàng

| Mục | Đặc tả |
| --- | ------ |
| Mục tiêu | Khách tạo được một đơn hợp lệ, thanh toán giả lập và biết kết quả cuối cùng của lần thanh toán |
| Actor chính | Khách hàng |
| Actor hỗ trợ | Cổng thanh toán giả lập Ví/Thẻ |
| Trigger | Khách chọn thanh toán từ giỏ hàng |
| Tiền điều kiện | Hệ thống và database hoạt động; giỏ có ít nhất một món với tùy chọn hợp lệ; để gửi báo giá/tạo đơn, khách có phiên hợp lệ. Tồn kho và giá cần được máy chủ kiểm tra lại, không coi dữ liệu giỏ là bảo đảm còn hàng. |
| Hậu điều kiện thành công | Một đơn của khách ở PAID, tổng tiền lấy từ database, tồn kho được giữ đúng một lần, ghi nhận thanh toán thành công và điểm thưởng một lần; khách xem được xác nhận và lịch sử. |
| Hậu điều kiện thất bại | Nếu tạo đơn thất bại, không lưu đơn hoặc giữ kho một phần. Nếu thanh toán bị từ chối, đơn đã tạo còn ở PAYMENT_FAILED, tồn kho vẫn được giữ, không ghi nhận thanh toán thành công/điểm; khách có thể thử lại hoặc hủy nếu trạng thái cho phép. Mất phản hồi có thể chưa biết kết quả; cần đọc lại đơn. |
| Yêu cầu liên quan | FR-01, FR-02, FR-03 chuẩn bị giỏ; FR-04 xác thực; FR-05 báo giá; FR-06, FR-07 tạo đơn an toàn; FR-08 thanh toán; FR-09 theo dõi; FR-11 hủy và FR-12 voucher/điểm là mở rộng. NFR-01 đến NFR-07 áp dụng khi kiểm chứng. |

### Luồng chính

1. Khách xem menu, mở chi tiết, chọn size/topping và thêm món vào giỏ (FR-01, FR-02, FR-03).
2. Khách mở giỏ, kiểm tra số lượng và chuyển sang thanh toán. Hệ thống kiểm tra phiên đăng nhập (FR-03, FR-04).
3. Hệ thống gửi POST `/orders/quote`, hiển thị tiền hàng, giảm giá và tổng do máy chủ tính; khách xác nhận giỏ và chọn Ví hoặc Thẻ giả lập (FR-05, FR-08).
4. Hệ thống tạo key cho lần đặt đơn và gửi POST `/orders` với giỏ đã xác nhận. Máy chủ kiểm tra dữ liệu, tính lại tiền và giữ kho trong cùng transaction tạo đơn; trả orderId, trạng thái PENDING (FR-06, FR-07).
5. Hệ thống gửi POST `/payments` với orderId, phương thức và key của lần thanh toán. Máy chủ kiểm tra chủ đơn, trạng thái và tổng tiền trong database, rồi gọi cổng giả lập (FR-08).
6. Cổng trả thành công; máy chủ ghi nhận thanh toán, chuyển đơn sang PAID, cộng điểm một lần nếu áp dụng. Giao diện hiển thị xác nhận, chỉ dọn giỏ sau khi xác định thanh toán thành công (FR-08, FR-12).
7. Khách mở chi tiết hoặc lịch sử; hệ thống đọc GET `/orders/:id` hoặc GET `/orders/me` để hiển thị kết quả lưu trên máy chủ (FR-09). UC-01 kết thúc ở PAID, các trạng thái phục vụ tiếp theo thuộc FR-10.

### Luồng thay thế

- **A1 – Chưa đăng nhập / hết phiên, tại bước 2 hoặc 3:** chuyển khách sang đăng nhập/đăng ký, giữ khả năng quay lại luồng thanh toán. Chỉ gửi nghiệp vụ cần phiên sau khi xác thực thành công; đường dẫn quay lại phải là đường dẫn nội bộ (FR-04).
- **A2 – Có voucher, tại bước 3:** gửi mã cùng báo giá. Mã hợp lệ cập nhật giảm giá; không hợp lệ thì thông báo lỗi, cho sửa hoặc bỏ mã và báo giá lại, chưa tạo đơn (FR-05, FR-12).
- **A3 – Bị từ chối thanh toán, tại bước 5:** nhận 402 và PAYMENT_FAILED; hiển thị lỗi, giữ giỏ và orderId, không cộng điểm. Khách đổi phương thức/thông tin thẻ, dùng key mới cho nội dung thanh toán mới và thử lại trên cùng đơn; không tạo đơn khác (FR-08).
- **A4 – Khách hủy sau khi đã tạo đơn:** nếu còn được hủy, gửi POST `/orders/:id/cancel`; hệ thống trả kho, voucher và điểm rồi chuyển CANCELLED. Nếu đã thanh toán phải nhắc rõ không hoàn tiền; kết thúc luồng (FR-11).

### Luồng ngoại lệ

- **E1 – Giỏ hoặc tùy chọn không hợp lệ, tại bước 3–4:** thông báo dữ liệu sai để khách sửa; sản phẩm không tồn tại trả 404. Không chuyển sang thanh toán khi chưa tạo được đơn (FR-02, FR-03, FR-05, FR-06).
- **E2 – Hết hàng / xung đột kho, tại bước 4:** nhận 409, rollback toàn bộ; yêu cầu khách cập nhật giỏ và xác nhận lại. Báo giá thành công trước đó không bảo đảm việc giữ kho sẽ thành công (FR-06).
- **E3 – Mất phản hồi / gửi lại, tại bước 4–5:** gửi lại cùng key và cùng nội dung để lấy kết quả đã có; không tạo key mới chỉ vì chưa thấy phản hồi. Nếu nhận 422 do cùng key khác nội dung, kiểm tra đơn cũ trước khi tạo thao tác mới; dùng FR-09 để xác định trạng thái (FR-07, FR-08).
- **E4 – Thanh toán đang xử lý hoặc trạng thái không hợp lệ, tại bước 5:** nhận lỗi xung đột 409, đọc lại trạng thái đơn, không thông báo thành công hoặc tự tạo đơn mới. Giao dịch đang xử lý quá hạn được xử lý theo quy tắc README khi có lần thanh toán tiếp theo (FR-08, FR-09).
- **E5 – Mất mạng / máy chủ lỗi:** thông báo chưa nhận được kết quả, giữ dữ liệu cần thử lại; khi kết nối lại thực hiện E3 và kiểm tra đơn. Không kết luận thất bại tài chính chỉ từ lỗi mạng (FR-07, FR-08, FR-09; NFR-05).

## Nguồn và phần còn cần xác nhận

- [README](../../README.md): đối chiếu endpoint tại **Danh sách API**, quy tắc tại **Trạng thái đơn hàng**, **Tồn kho và đặt hàng đồng thời**, **Hạn chế đã biết** và kịch bản demo. Khi cần đọc mã, dùng `apps/api` và `apps/web`.
- [Sprint plan](../scrum/sprint-plan.md): dùng để nhận diện tính năng đã nằm trong kế hoạch; nhãn Done ở kế hoạch không được coi là kết quả kiểm thử của SRS này.
- Đề `Assignment2-BrewLite.pdf`, phiên bản 1.0, mục 1.1, 3.1–3.3 và phạm vi MVP tại 6.3, 7.1; bản đọc tại `/Users/brianle/Downloads/SWE/Assignment/Assignment2-BrewLite.pdf`.
- Đề Assignment 1 `BrewLite-CongNghePhanMem.pdf`, mục 4.2, quy định thời gian phản hồi API < 500ms với dữ liệu mẫu; bản đọc tại `/Users/brianle/Downloads/SWE/Assignment/BrewLite-CongNghePhanMem.pdf`. NFR-01 dùng dữ liệu seed trong README và cách đo nêu trên; chưa có kết quả đo, chưa chốt môi trường nghiệm thu tải hoặc cam kết uptime. Không bổ sung ngưỡng hiệu năng khác.
- Chưa có xác nhận trực tiếp stakeholder về các giả định; cần nhóm xử lý khác biệt kế hoạch ba sprint hiện tại so với hai sprint của Assignment 2, còn Assignment 1 gợi ý ba sprint tại mục 2.3.
- Task 1 có tài liệu phạm vi, SRS, sơ đồ use-case tổng quát (`.puml` và `.svg`) và đặc tả UC-01. PWA và production chưa được xác nhận hoàn thành; không tạo tài liệu Task 2, Task 3, pipeline hoặc ma trận truy vết trong lần này.
