# Chiến lược nhánh và Pull Request

Tài liệu quy định chiến lược phân nhánh (branching strategy), quy trình mở và duyệt Pull Request (PR), cùng cơ chế kiểm soát chất lượng tích hợp cho kho mã nguồn BrewLite theo yêu cầu của Assignment 2 (Task 4.1).

## 1. Nguyên tắc cốt lõi

Quy trình quản lý mã nguồn bám sát quy định tại mục **Quy trình Git** của [README](../../README.md):
- Nhánh `main` là nhánh chính, đại diện cho phiên bản ổn định nhất và **luôn luôn phải chạy được** (build thành công, vượt qua toàn bộ unit test, không có lỗi cú pháp hoặc gãy kiểu dữ liệu).
- **Mỗi task một nhánh**: Không phát triển trực tiếp trên `main`. Mọi tính năng, sửa lỗi hoặc cập nhật tài liệu đều được thực hiện trên nhánh riêng tách ra từ `main`.
- **Commit nhỏ, nguyên tử**: Mỗi commit giải quyết một phần việc rõ ràng, kèm thông điệp chuẩn hóa theo [Quy ước commit](commit-convention.md).
- **Gộp qua Pull Request**: Mọi thay đổi đưa vào `main` bắt buộc phải thông qua Pull Request, không merge trực tiếp qua lệnh push vào nhánh chính.

## 2. Quy ước đặt tên nhánh

Tên nhánh phản ánh đúng mục đích và mã task cụ thể được phân công trong [Kế hoạch Sprint](../scrum/sprint-plan.md). Cấu trúc đặt tên chuẩn:

`<tiền-tố>/<mã-task>-<mô-tả-ngắn>` hoặc `<tiền-tố>/<mô-tả-tính-năng>`

Các tiền tố nhánh được sử dụng:
- `feat/`: Dành cho tính năng mới hoặc nâng cấp giao diện, API.
- `fix/`: Dành cho sửa lỗi phát sinh.
- `chore/`: Dành cho cấu hình hạ tầng, Docker, tài liệu tổng hợp, dọn dẹp dự án.
- `docs/`: Dành cho tạo và cập nhật tài liệu dự án.

### Các tên nhánh thực tế trong kế hoạch Sprint
Dưới đây là các tên nhánh thực tế được quy định trong [docs/scrum/sprint-plan.md](../scrum/sprint-plan.md) và [README.md](../../README.md):
- `feat/task-02-products-api`: Hiện thực API lấy danh sách sản phẩm.
- `feat/task-02c-prisma-postgres`: Tích hợp Prisma ORM và cơ sở dữ liệu PostgreSQL cho sản phẩm.
- `feat/task-03-menu-page`: Hiện thực giao diện trang thực đơn trên Next.js.
- `feat/task-04-product-detail`: Hiện thực màn hình chi tiết sản phẩm và tùy chọn món.
- `feat/task-05-cart`: Hiện thực quản lý giỏ hàng phía frontend.
- `feat/task-06-orders-api`: Hiện thực API tạo đơn hàng mới.
- `feat/task-07-auth-jwt`: Hiện thực xác thực người dùng bằng JWT.
- `feat/task-08-payments`: Hiện thực API thanh toán giả lập.
- `feat/task-09a-orders-me-docker`: Hiện thực endpoint lịch sử đơn cá nhân và đóng gói Docker.
- `feat/task-09b-frontend-auth`: Hiện thực giao diện đăng ký, đăng nhập và bảo vệ trang.
- `feat/task-09b2-checkout-orders`: Hoàn thiện trang thanh toán, xác nhận và lịch sử đơn hàng.
- `feat/task-10a-state-machine-idempotency`: Hiện thực máy trạng thái đơn hàng và cơ chế chống trùng lặp Idempotency-Key.
- `feat/task-10b-stock-concurrency`: Xử lý khóa tồn kho đồng thời và hoàn kho khi hủy đơn.
- `feat/task-10c-vouchers-loyalty`: Tích hợp voucher giảm giá và tích lũy điểm thưởng.
- `chore/final-readme-dod`: Rà soát hoàn thiện tài liệu README, Definition of Done và nghiệm thu.

## 3. Quy trình vòng đời Pull Request

Mỗi thay đổi phải tuân thủ nghiêm ngặt 5 bước sau:

```
[Nhánh main] ──(Tạo nhánh mới)──> [feat/task-xx] ──(Commit nhỏ)──> [Mở PR vào main]
                                                                        │
[Gộp vào main] <──(Merged)── [Duyệt bởi Reviewer] <──(CI xanh)─────────┘
```

1. **Khởi tạo nhánh**:
   - Cập nhật nhánh `main` mới nhất: `git checkout main && git pull origin main`.
   - Tạo nhánh tính năng mới: `git checkout -b feat/task-xx-...`.
2. **Phát triển và kiểm thử cục bộ**:
   - Viết mã và commit thường xuyên theo chuẩn `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
   - Chạy kiểm thử cục bộ trước khi đẩy mã:
     - Backend (`apps/api`): `npm run lint`, `npm test`, `npm run build`.
     - Frontend (`apps/web`): `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
3. **Mở Pull Request**:
   - Đẩy nhánh lên remote: `git push -u origin feat/task-xx-...`.
   - Mở PR hướng về nhánh `main`.
   - Điền đầy đủ thông tin theo mẫu template có sẵn tại [.github/pull_request_template.md](../../.github/pull_request_template.md): mô tả thay đổi, mã Task/FR liên quan, cách kiểm tra và tích chọn các mục kiểm tra chấp nhận.
4. **Kiểm tra tự động (CI)**:
   - Hệ thống CI sẽ tự động kích hoạt để chạy các bước kiểm tra: Cài đặt phụ thuộc (Install), Kiểm tra cú pháp (Lint), Kiểm tra kiểu dữ liệu (Type Check phía Web), Kiểm thử đơn vị (Unit Test) và Biên dịch mã nguồn (Build).
   - PR chỉ đủ điều kiện xem xét hợp nhất khi CI báo trạng thái thành công (CI xanh).
5. **Đánh giá mã nguồn (Code Review)**:
   - Ít nhất một thành viên trong nhóm phải xem xét nội dung diff, đối chiếu tiêu chí chấp nhận và xác nhận phê duyệt (Approve) trên giao diện PR.
   - Không tự ý gộp PR của chính mình khi chưa có xác nhận từ đồng đội.
6. **Hợp nhất (Merge)**:
   - Sau khi CI xanh và có review chấp thuận, thực hiện gộp nhánh vào `main` (khuyến khích dùng Squash and Merge hoặc Merge Commit tùy theo quy định của đợt bàn giao để giữ lịch sử sạch).
   - Xóa nhánh tính năng trên remote sau khi đã hợp nhất thành công.

## 4. Tự động hóa CI và trạng thái bảo vệ nhánh

### Tích hợp liên tục (Continuous Integration)
Dự án được cấu hình quy trình CI tự động qua workflow GitHub Actions tại [.github/workflows/ci.yml](../../.github/workflows/ci.yml). Theo kế hoạch:
- Workflow kích hoạt khi có sự kiện `push` hoặc `pull_request` vào nhánh `main`.
- Chạy song song 2 công việc (jobs):
  - Job `api`: Chạy trong thư mục `apps/api` gồm 4 bước: `Install` (`npm ci`) → `Lint` (`npm run lint`) → `Unit Test` (`npm test`) → `Build` (`npm run build`).
  - Job `web`: Chạy trong thư mục `apps/web` gồm 5 bước: `Install` (`npm ci`) → `Lint` (`npm run lint`) → `Type Check` (`npx tsc --noEmit`) → `Unit Test` (`npm test`) → `Build` (`npm run build`).

> [!IMPORTANT]
> **Trạng thái thực tế trong kho mã nguồn**:
> File cấu hình workflow [.github/workflows/ci.yml](../../.github/workflows/ci.yml) đã được soạn thảo trong kho mã nguồn nhưng **chưa được kích hoạt chạy thực tế trên GitHub Actions**.
> Quy tắc bảo vệ nhánh `main` (Branch Protection Rule – yêu cầu bắt buộc CI xanh và ít nhất 1 người phê duyệt trước khi merge) cần phải được thiết lập thủ công trên giao diện cài đặt Repository của GitHub, hiện tại **chưa thực hiện**. Nhóm phát triển cần phân công kích hoạt cấu hình này trên GitHub trước thời điểm nghiệm thu Sprint 1.

## 5. Quy tắc xử lý xung đột (Merge Conflict)

Khi nhánh `main` có commit mới dẫn đến xung đột với nhánh đang phát triển:
1. Tuyệt đối không giải quyết xung đột trực tiếp trên giao diện web của GitHub nếu xung đột phức tạp liên quan đến logic hoặc schema database.
2. Kéo mã nguồn mới nhất từ `main` về máy cục bộ:
   ```sh
   git checkout main
   git pull origin main
   git checkout <ten-nhanh-tinh-nang>
   ```
3. Thực hiện rebase hoặc merge `main` vào nhánh tính năng:
   ```sh
   git merge main
   ```
4. Mở các file bị xung đột, phân tích nguyên nhân và giải quyết xung đột bằng tay:
   - Đảm bảo giữ đúng logic nghiệp vụ của cả hai bên.
   - Nếu xung đột liên quan đến schema database (`apps/api/prisma/schema.prisma`) hoặc file migration, phải phối hợp trực tiếp với tác giả commit trước đó để đối chiếu tính nhất quán.
5. Chạy lại toàn bộ kiểm thử và build để đảm bảo không gãy ứng dụng:
   ```sh
   cd apps/api && npm test && npm run build
   cd ../web && npm test && npm run build
   ```
6. Commit thay đổi giải quyết xung đột và đẩy lại lên nhánh tính năng để CI chạy lại từ đầu.
