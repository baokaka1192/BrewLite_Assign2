# ADR-003: PostgreSQL qua Prisma, thay đổi schema bằng migration

- Trạng thái: Đã áp dụng (phần tách migration trên production chưa thực hiện)
- Ngày: 2026-10-30

## Bối cảnh

Đề yêu cầu PostgreSQL và cơ chế migration. Nghiệp vụ cần transaction và kiểm soát đồng thời: đặt nhiều đơn cùng lúc không được bán quá tồn kho, thanh toán không được trừ tiền hai lần.

## Quyết định

- Dùng PostgreSQL 16 và Prisma 6. Schema nằm ở `apps/api/prisma/schema.prisma`.
- Mọi thay đổi schema tạo migration bằng `npx prisma migrate dev`, commit thư mục `apps/api/prisma/migrations`. Môi trường chạy thật chỉ dùng `npx prisma migrate deploy`.
- Không sửa migration đã commit. Sửa sai bằng migration mới.
- Production (Task 5): chạy `prisma migrate deploy` thành một bước riêng trước khi bật bản mới, không chạy seed tự động.

## Lý do

- Prisma sinh kiểu TypeScript từ schema, giảm lỗi khi truy vấn.
- `migrate deploy` chỉ áp migration mới, an toàn khi chạy lại.
- Transaction của PostgreSQL đảm bảo giữ kho và tạo đơn cùng thành công hoặc cùng thất bại. Test `orders-stock.e2e-spec.ts` kiểm tra 20 đơn đồng thời cho 5 sản phẩm.

## Hệ quả

- Ưu: lịch sử schema có trong Git, dựng lại database bằng một lệnh.
- Hạn chế hiện tại: image API chạy migration và seed mỗi lần khởi động (`apps/api/Dockerfile`). Theo README, seed đặt lại tồn kho và giá về giá trị mẫu. Chấp nhận được cho dev và demo, **không an toàn cho production**.
- Việc cần làm ở Task 5: tách migration thành bước riêng trong pipeline và bỏ seed khỏi lệnh khởi động production. Thay đổi này sửa `apps/api/Dockerfile`, chưa thực hiện.
- Rollback: Prisma không có migration ngược tự động. Migration phải tương thích ngược để bản API cũ vẫn chạy được trên schema mới; rollback là deploy lại image cũ, không hạ schema.
