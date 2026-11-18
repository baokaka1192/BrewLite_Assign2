# ADR-005: Triển khai production lên Render bằng Docker image

- Trạng thái: Đề xuất, chưa triển khai
- Ngày: 2026-10-30

## Bối cảnh

Đề yêu cầu một phiên bản production truy cập được qua HTTPS, database không public trực tiếp, secret không nằm trong repository hay log CI, có health check, cách rollback, và image gắn tag theo commit SHA hoặc phiên bản. Repo đã có `apps/api/Dockerfile` và `apps/web/Dockerfile` chạy được trong Docker Compose.

## Các phương án

| Phương án | Ưu | Hạn chế |
| --------- | -- | ------- |
| Render | Chạy Docker image, có Postgres được quản lý, HTTPS tự động trên tên miền `onrender.com`, mạng riêng giữa các dịch vụ cùng region | Gói miễn phí có thể ngủ khi không dùng, khởi động lại chậm |
| Railway hoặc Fly.io | Tương tự, cũng chạy Docker | Nhóm chưa có tài khoản, cấu hình khác nhau |
| VPS tự quản | Toàn quyền | Phải tự lo HTTPS, sao lưu database, bảo mật máy |

## Quyết định

Dùng Render, gồm:

- `web`: Web Service chạy image từ `apps/web/Dockerfile`, cổng 3000.
- `api`: Web Service chạy image từ `apps/api/Dockerfile`, cổng 4000, health check path `/api/health`.
- `brewlite-db`: Render Postgres. API kết nối qua địa chỉ nội bộ. Chặn kết nối từ bên ngoài bằng danh sách IP được phép để trống.
- Image build trong GitHub Actions, gắn tag bằng commit SHA, đẩy lên GitHub Container Registry (GHCR). Pipeline gọi deploy hook của Render với image đó.
- Secret (`JWT_SECRET`, `DATABASE_URL`, `STAFF_API_KEY`, `GOOGLE_CLIENT_ID`, URL deploy hook) đặt trong biến môi trường của Render và GitHub Actions secrets, không commit.

## Lý do

- Dùng lại nguyên Dockerfile đang chạy ở local, không viết cấu hình riêng cho nền tảng.
- Image gắn tag SHA giúp rollback bằng cách deploy lại tag cũ.
- Postgres được quản lý thì không phải tự sao lưu và vá lỗi máy chủ database.

## Hệ quả

- `NEXT_PUBLIC_API_URL` gắn vào bản build web, nên phải build image web với URL production của API. Đổi URL API thì build lại web.
- `CORS_ORIGIN` của API phải là URL production của web.
- Phải tách bước migration và bỏ seed khỏi lệnh khởi động production trước khi deploy (xem [ADR-003](003-postgresql-prisma-migrations.md)).
- Gói miễn phí có thể ngủ, nên lần gọi đầu sau thời gian nghỉ có thể vượt ngưỡng `< 500ms` của NFR-01. Đo NFR-01 phải ghi rõ đã làm nóng dịch vụ hay chưa.
- Chưa có CDN riêng. Tài nguyên tĩnh của Next.js do container web phục vụ.
- Việc cần người trong nhóm làm: tạo tài khoản Render, tạo các dịch vụ, đặt secret, lấy URL HTTPS. Chưa có bước nào trong số này được thực hiện.
