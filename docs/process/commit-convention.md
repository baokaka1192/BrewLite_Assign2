# Quy ước Commit

Tài liệu chuẩn hóa thông điệp commit (commit convention) cho toàn bộ thành viên dự án BrewLite theo yêu cầu của Assignment 2 (Task 4.1). Quy ước này được rút trích trực tiếp từ lịch sử Git thực tế của repository, đảm bảo tính nhất quán, ngắn gọn và dễ theo dõi.

## 1. Cấu trúc thông điệp commit

Mỗi thông điệp commit bao gồm tiền tố loại hành động (type), theo sau bởi dấu hai chấm, dấu cách và mô tả ngắn bằng tiếng Việt có dấu:

`<type>: <mô tả ngắn bằng tiếng Việt có dấu>`

### Quy tắc định dạng:
- **Ngôn ngữ**: Toàn bộ mô tả commit viết bằng tiếng Việt có dấu, chữ thường ở đầu mô tả (trừ danh từ riêng hoặc mã hàm/công nghệ như Docker, JWT, Prisma, README), không có dấu chấm ở cuối dòng.
- **Tính nguyên tử**: Một commit chỉ giải quyết một mục tiêu duy nhất. Tránh gộp nhiều thay đổi không liên quan vào cùng một commit.
- **Độ dài**: Dòng thông điệp ngắn gọn, súc tích (thường dưới 72 ký tự).

## 2. Phân loại commit và ví dụ thực tế

Dưới đây là các loại commit chuẩn đang được sử dụng trong dự án, kèm ví dụ trích dẫn nguyên văn từ lịch sử commit thật (`git log --oneline`):

### 2.1. `feat:` (Tính năng mới hoặc mở rộng giao diện/nghiệp vụ)
Sử dụng khi thêm mới một chức năng, giao diện màn hình, endpoint API hoặc cơ chế nghiệp vụ.
- `feat: thêm bảng voucher, điểm thưởng và seed mã giảm giá`
- `feat: thêm trang thanh toán và logic kiểm tra đơn hàng`
- `feat: thêm backend đăng nhập Google`
- `feat: thêm state machine đơn hàng và guard staff key`
- `feat: thêm animation thanh toán và xác nhận đơn hàng`

### 2.2. `fix:` (Sửa lỗi)
Sử dụng khi khắc phục các lỗi phát sinh trong mã nguồn hoặc sai lệch hiển thị giao diện.
- `fix: sửa vòng focus dùng màu primary đạt tương phản 3:1`
- `fix: mặc định tông màu sáng, không theo giao diện tối của hệ điều hành`

### 2.3. `test:` (Kiểm thử)
Sử dụng khi viết thêm, cập nhật hoặc tối ưu hóa các bài kiểm thử đơn vị (unit test), kiểm thử tích hợp hoặc kịch bản kiểm thử luồng (e2e test).
- `test: thêm test voucher, điểm thưởng và chạy e2e tuần tự`
- `test: thêm e2e kiểm tra đồng thời tồn kho và cập nhật README`
- `test: thêm unit test cho giữ và hoàn tồn kho đơn hàng`
- `test: thêm unit và e2e test cho API thanh toán`
- `test: thêm unit test và e2e test cho API đơn hàng`

### 2.4. `docs:` (Tài liệu)
Sử dụng khi viết mới hoặc chỉnh sửa tài liệu đặc tả, hướng dẫn chạy dự án, ghi chú quy trình.
- `docs: viết lại README bằng tiếng Việt dễ hiểu`
- `docs: cập nhật Definition of Done, trạng thái task và burndown`
- `docs: viết lại README với hướng dẫn chạy và kiểm thử`
- `docs: cập nhật README về API đơn hàng và biến môi trường`
- `docs: thêm tài liệu công nghệ phần mềm BrewLite`

### 2.5. `chore:` (Công việc hỗ trợ hạ tầng, cấu hình)
Sử dụng khi cập nhật cấu hình dự án, bổ sung biến môi trường mẫu, Dockerfile, metadata hoặc gói thư viện phụ thuộc.
- `chore: thêm STAFF_API_KEY vào compose và file env mẫu`
- `chore: cập nhật Dockerfile, docker-compose và biến môi trường mẫu`
- `chore: thêm thư viện JWT, cột name và kiểm tra secret production`
- `chore: thêm Docker Postgres và cập nhật hướng dẫn chạy`
- `chore: thêm metadata, favicon và ảnh chia sẻ cho các trang`

### 2.6. `refactor:` (Tái cấu trúc mã nguồn)
Sử dụng khi thay đổi cấu trúc mã nguồn để tối ưu hóa hoặc dọn dẹp mà không làm thay đổi hành vi nghiệp vụ bên ngoài.
- `refactor: bỏ MotionProvider lồng trong trang chủ`
- `refactor: chuyển products service sang Prisma và cập nhật test`

### 2.7. `style:` (Định dạng giao diện, phong cách mã nguồn)
Sử dụng khi căn chỉnh giao diện, khoảng cách, font, màu sắc thuần túy mà không ảnh hưởng đến logic xử lý.
- `style: cập nhật form, giỏ hàng, thanh toán và badge đơn`

## 3. Thống kê tần suất trong lịch sử Git

Lịch sử phát triển tính đến hiện tại có sự phân bổ commit tập trung vào các nhóm tính năng và kiểm thử như sau:
- `feat:`: 59 commits (chiếm đa số, bao trọn các chức năng MVP và tính năng nâng cao).
- `test:`: 6 commits (các đợt bổ sung unit test và e2e test cho API, đơn hàng, thanh toán, kho).
- `docs:`: 6 commits (tài liệu README, DoD, burndown, đặc tả).
- `chore:`: 6 commits (Docker, JWT, Postgres, env).
- `refactor:`: 2 commits (chuyển đổi Prisma, tối ưu Provider).
- `fix:`: 2 commits (sửa lỗi tương phản màu, giao diện sáng/tối).
- `style:`: 1 commit (tinh chỉnh hình ảnh form, thẻ đơn hàng).
