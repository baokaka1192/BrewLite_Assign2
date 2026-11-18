# ADR-001: Một repository cho web, API và tài liệu

- Trạng thái: Đã áp dụng
- Ngày: 2026-10-30

## Bối cảnh

Đề Assignment 2 yêu cầu cấu trúc `apps/web`, `apps/api`, `docs` trong một repository, và mọi thay đổi yêu cầu, sơ đồ, kiến trúc phải đi qua commit hoặc pull request. Nhóm nhỏ, web và API thay đổi cùng nhau theo từng task (ví dụ thêm endpoint thì sửa cả hai phía).

## Quyết định

Dùng một repository (monorepo) không có công cụ quản lý workspace. Mỗi app có `package.json` và `package-lock.json` riêng. File `package.json` ở gốc chỉ chứa script gọi vào từng app bằng `npm --prefix apps/api` và `npm --prefix apps/web`.

## Lý do

- Một pull request chứa trọn thay đổi của cả web, API và tài liệu, dễ review và dễ truy vết.
- Không cần thêm Nx hay Turborepo cho hai app. Ít công cụ hơn, ít cấu hình CI hơn.
- Lock file tách riêng giúp image Docker của mỗi app chỉ cài đúng dependency của nó.

## Hệ quả

- Ưu: một nơi clone, một README, một pipeline CI.
- Hạn chế: phải chạy `npm install` hai lần (`npm run install:all`). Không chia sẻ code TypeScript giữa web và API; kiểu dữ liệu đơn hàng được khai báo lại ở `apps/web/src/types`.
- Trade-off: chấp nhận khai báo kiểu trùng lặp để giữ hai app độc lập. Nếu số app tăng, cân nhắc npm workspaces.
