# Definition of Done (DoD)

Tài liệu định nghĩa "Hoàn thành" (Definition of Done) ở cấp độ kho mã nguồn BrewLite, chuẩn hóa tiêu chí nghiệm thu công việc theo yêu cầu của Assignment 2 (Task 4.1 và Task 4.2).

DoD này kế thừa tiêu chí cốt lõi tại [docs/scrum/definition-of-done.md](../scrum/definition-of-done.md), kết hợp các yêu cầu bắt buộc tại Mục 10 của đề bài Assignment 1 và các tiêu chí mở rộng từ đề bài Assignment 2 (yêu cầu quản lý tài liệu qua commit/PR, tích hợp liên tục CI, kiểm thử toàn diện và tài liệu hướng dẫn bàn giao).

## 1. Tiêu chí Definition of Done cấp độ Repository

Một task hoặc Pull Request chỉ được coi là hoàn thành (Done) khi thỏa mãn đầy đủ các tiêu chí kiểm chứng được dưới đây:

### 1.1. Mã nguồn và tính toàn vẹn khi biên dịch (Code & Build)
- Mã nguồn chạy bình thường trên môi trường cục bộ, không phát sinh lỗi biên dịch hoặc lỗi cú pháp.
- Đáp ứng đầy đủ các tiêu chí chấp nhận (Acceptance Criteria) của Task hoặc User Story tương ứng.
- **Kiểm chứng thực tế**:
  - Backend (`apps/api`): Lệnh `npm run build` hoàn thành không có lỗi.
  - Frontend (`apps/web`): Lệnh `npx tsc --noEmit` và `npm run build` hoàn thành không có cảnh báo nghiêm trọng hay lỗi kiểu dữ liệu.

### 1.2. Quy trình mã nguồn và đánh giá (Git & Review)
- Mỗi thay đổi phải xuất phát từ một nhánh riêng biệt theo đúng chiến lược nhánh trong [branching-and-pr.md](branching-and-pr.md).
- Thông điệp commit ngắn gọn, rõ nghĩa và tuân thủ quy chuẩn trong [commit-convention.md](commit-convention.md).
- Mọi thay đổi vào nhánh `main` phải thông qua Pull Request có mô tả đầy đủ theo mẫu [.github/pull_request_template.md](../../.github/pull_request_template.md).
- Phải được ít nhất một thành viên khác trong nhóm xem xét (code review) và phê duyệt trên giao diện Pull Request trước khi hợp nhất.

### 1.3. Quản lý tài liệu có kiểm soát phiên bản (Documentation Version Control)
- Theo quy định Task 4.2 của Assignment 2, toàn bộ tài liệu tạo phẩm (SRS, Bối cảnh phạm vi, Sơ đồ hoạt động/trình tự/lớp, Kiến trúc hệ thống, Tài liệu quy trình) phải nằm trong thư mục `docs/`.
- Mọi chỉnh sửa, cập nhật hoặc bổ sung tài liệu kỹ thuật phải đi qua commit/Pull Request có lịch sử thay đổi minh bạch và nêu rõ lý do thay đổi.

### 1.4. Tích hợp liên tục (Continuous Integration - CI)
- Pipeline CI (được định nghĩa tại [.github/workflows/ci.yml](../../.github/workflows/ci.yml)) phải được kích hoạt tự động trên mỗi Pull Request hướng về `main`.
- Trạng thái kiểm tra phải đạt "CI xanh" (Green) trên toàn bộ các công việc:
  - Cài đặt gói phụ thuộc (`Install`).
  - Kiểm tra chuẩn viết mã (`Lint`).
  - Kiểm tra kiểu tĩnh (`Type Check`).
  - Kiểm thử đơn vị tự động (`Unit Test`).
  - Đóng gói ứng dụng (`Build`).
- Pull Request không được phép merge nếu bất kỳ bước nào trong pipeline CI thất bại.

### 1.5. Kiểm thử tự động (Automated Testing)
- Các chức năng mới hoặc thay đổi nghiệp vụ quan trọng phải có bài kiểm thử tương ứng:
  - Kiểm thử đơn vị (Unit Test) cho nghiệp vụ backend (tính tiền, máy trạng thái, kiểm tra voucher, giữ và hoàn kho).
  - Kiểm thử đơn vị cho logic frontend (store giỏ hàng, xác thực tài khoản, kiểm tra dữ liệu form).
  - Kiểm thử luồng tích hợp (Integration Test) cho các luồng nghiệp vụ nhạy cảm như tạo đơn và thanh toán.
- Toàn bộ bộ test hiện có phải vượt qua 100%:
  - Backend: `npm test` vượt qua toàn bộ test suites.
  - Frontend: `npm test` vượt qua toàn bộ file test.

### 1.6. Kiểm tra dữ liệu đầu vào và xử lý trạng thái giao diện (Validation & UI States)
- Phía API: Tất cả endpoint nhận dữ liệu phải kiểm tra tính hợp lệ bằng DTO và `ValidationPipe` (ngăn chặn các trường không khai báo, xác thực định dạng UUID/chuỗi/số). Các tham số nhạy cảm như `Idempotency-Key` phải được kiểm tra định dạng; vi phạm trạng thái phải trả mã HTTP phù hợp (400, 401, 403, 404, 409, 422).
- Phía UI: Giao diện phải xử lý đầy đủ ba trạng thái:
  - Trạng thái đang tải (Loading state / skeleton).
  - Trạng thái rỗng không có dữ liệu (Empty state).
  - Trạng thái phát sinh lỗi (Error state với thông báo rõ ràng và nút thử lại nếu khả thi).
  - Phản hồi từ chối thanh toán không làm mất giỏ hàng của khách; lỗi 401 tự động chuyển hướng và xóa phiên làm việc.

### 1.7. Hướng dẫn vận hành và tính bàn giao (README & Handover)
- Tài liệu [README.md](../../README.md) phải được cập nhật tương ứng với các thay đổi:
  - Hướng dẫn cấu hình biến môi trường (`.env.example`).
  - Cách khởi chạy dịch vụ qua Docker Compose và môi trường cục bộ.
  - Hướng dẫn thực thi lệnh kiểm thử và kịch bản demo kiểm chứng chức năng.
  - Không chứa bí mật (secret key), mật khẩu hoặc thông tin nhạy cảm trong mã nguồn và tài liệu.

## 2. Bảng đối chiếu trạng thái hiện tại của Repo

| Hạng mục kiểm tra | Tiêu chuẩn nghiệm thu | Minh chứng / Trạng thái thực tế |
|---|---|---|
| **Build mã nguồn** | Không lỗi build cả 2 app | Đạt. `apps/api` (`npm run build`) và `apps/web` (`npm run build`) biên dịch thành công. |
| **Kiểm thử tự động** | Pass toàn bộ test suites | Đạt. Toàn bộ unit test backend và frontend vượt qua 100% trong môi trường kiểm thử. |
| **Validate API & UI** | Chặt chẽ ở cả 2 phía | Đạt. Backend có `ValidationPipe`, guard, state machine; frontend có skeleton, error view, safe navigation. |
| **Tài liệu README** | Đầy đủ hướng dẫn chạy | Đạt. README chi tiết bằng tiếng Việt, hướng dẫn Docker Compose, seed và kịch bản chạy thử. |
| **Quy trình Git & Review**| PR có review đồng đội | Chưa đạt. Lịch sử repo chưa ghi nhận bằng chứng phê duyệt Pull Request chéo từ đồng đội. |
| **CI tự động GitHub** | Chạy xanh trên GitHub Actions | Chưa thực hiện chạy thật. File cấu hình `.github/workflows/ci.yml` đã sẵn sàng nhưng chưa kích hoạt trên GitHub. |
| **Bảo vệ nhánh main** | Khóa merge nếu CI đỏ | Chưa thực hiện. Cần nhóm cài đặt thủ công Branch Protection Rule trên GitHub. |
