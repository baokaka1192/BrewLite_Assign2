# ADR-002: API là một khối NestJS chia module theo nghiệp vụ

- Trạng thái: Đã áp dụng
- Ngày: 2026-10-30

## Bối cảnh

Đề yêu cầu backend NestJS theo module/domain. Tạo đơn, giữ kho, áp voucher, thanh toán và cộng điểm phải nhất quán với nhau, nhiều bước nằm trong cùng một transaction database.

## Quyết định

API là một ứng dụng NestJS duy nhất (modular monolith), chia module trong `apps/api/src/modules`: `products`, `auth`, `users`, `orders`, `payments`, `vouchers`. Truy cập database chỉ qua `PrismaService`. Quy tắc dùng chung (idempotency, guard nhân viên, decorator người dùng) nằm ở `src/common`.

## Lý do

- Tạo đơn và giữ kho cần transaction trong một database. Tách thành nhiều service sẽ cần giao dịch phân tán, quá phức tạp cho MVP.
- Module NestJS cho ranh giới rõ (mỗi module khai báo `imports`, ví dụ `orders` và `payments` dùng `AuthModule`) mà vẫn triển khai một container.
- Máy trạng thái đơn (`order-state.ts`) và tính giá voucher (`voucher-pricing.ts`) là hàm thuần, test đơn vị không cần database.

## Hệ quả

- Ưu: một image, một bước deploy, debug dễ.
- Hạn chế: không scale riêng từng phần. Lỗi trong một module có thể làm sập cả API.
- Trade-off: chọn đơn giản và nhất quán dữ liệu thay vì khả năng mở rộng độc lập. Với tải của bài tập, một container là đủ.
