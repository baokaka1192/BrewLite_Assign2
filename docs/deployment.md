# Triển khai BrewLite

Hướng dẫn chạy local, test, build, deploy và rollback. Kiến trúc và lý do chọn nền tảng xem [docs/architecture](architecture/README.md), nhất là [ADR-003](architecture/adr/003-postgresql-prisma-migrations.md) và [ADR-005](architecture/adr/005-deploy-render.md).

Trạng thái: chạy local và test **đã kiểm chứng**. Pipeline CD và production trên Render **đã có cấu hình nhưng chưa chạy thật**, chưa có URL production.

## Chạy local

Xem [README](../README.md) mục **Cách chạy trên máy (dev)** và **Cách chạy bằng Docker (cả 3 dịch vụ)**. Tóm tắt:

```bash
cp .env.example .env
docker compose up --build        # web :3000, api :4000/api, db :5432
```

## Test

| Lệnh (từ thư mục gốc) | Phạm vi | Cần gì |
| --------------------- | ------- | ------ |
| `npm --prefix apps/api test` | Test đơn vị backend | Không cần database |
| `npm --prefix apps/api run test:e2e` | Test e2e backend trong tiến trình | Container `db` và database `brewlite_test` |
| `npm --prefix apps/web test` | Test đơn vị frontend | Không |
| `npm run test:system` | Test tích hợp và e2e qua HTTP trong [tests/](../tests/README.md) | API đang chạy, mặc định `http://localhost:4000/api` |
| `npm --prefix apps/api run lint`, `npm --prefix apps/web run lint` | Lint | Không |

## Build

```bash
npm run build                                   # build cả api và web
docker build --build-arg APP_VERSION=$(git rev-parse HEAD) -t brewlite-api apps/api
docker build --build-arg NEXT_PUBLIC_API_URL=<URL API> -t brewlite-web apps/web
```

`APP_VERSION` được trả về trong `GET /api/health` (mặc định `dev`). `NEXT_PUBLIC_API_URL` gắn vào bản build web, đổi URL API thì phải build lại web.

## Pipeline

| Workflow | Khi nào chạy | Các bước |
| -------- | ------------ | -------- |
| [ci.yml](../.github/workflows/ci.yml) | Pull request và push vào `main` | api: Install → Lint → Unit Test → Build. web: Install → Lint → Type Check → Unit Test → Build |
| [cd.yml](../.github/workflows/cd.yml) | Push vào `main`, hoặc chạy tay | Quality gate (gọi lại `ci.yml`) → build image tag bằng commit SHA → push lên GHCR → gọi deploy hook Render → smoke test → tự rollback nếu smoke test lỗi |

Smoke test chờ tới khi `GET /api/health` báo đúng commit SHA vừa deploy (tối đa 10 phút), rồi gọi `GET /api/products` và trang `/menu` của web. Nhờ kiểm tra phiên bản, bản cũ còn chạy không làm smoke test đạt nhầm.

## Cài đặt production lần đầu (việc nhóm phải làm)

Chưa bước nào dưới đây được thực hiện.

1. **Render Postgres**: tạo database `brewlite-db` cùng region với các dịch vụ. Để trống danh sách IP được phép truy cập từ ngoài, API chỉ dùng địa chỉ nội bộ (Internal Database URL).
2. **Web Service `api`**: chọn deploy từ image có sẵn trong registry (`ghcr.io/<owner>/brewlite-api`). Nếu package GHCR để private, thêm registry credential trên Render.
   - Health check path: `/api/health`.
   - Docker command: `sh -c "npx prisma migrate deploy && node dist/main"`. Lệnh này chạy migration trước khi API nhận request và **không chạy seed**. Lệnh mặc định của image có seed, mà seed đặt lại tồn kho và giá, nên không dùng cho production.
   - Biến môi trường: `DATABASE_URL` (Internal Database URL), `JWT_SECRET` (chuỗi ngẫu nhiên từ 32 ký tự), `CORS_ORIGIN` (URL web production), `STAFF_API_KEY` (nếu bật API nhân viên), `GOOGLE_CLIENT_ID` (nếu bật Google). API tự từ chối khởi động nếu `JWT_SECRET` yếu.
3. **Web Service `web`**: deploy từ image `ghcr.io/<owner>/brewlite-web`, cổng 3000.
4. **Dữ liệu mẫu lần đầu**: database production trống nên menu chưa có món. Chạy seed đúng một lần, ví dụ đổi tạm Docker command của `api` thành `sh -c "npx prisma migrate deploy && node seed-dist/prisma/seed.js && node dist/main"`, deploy, rồi đổi lại lệnh ở bước 2.
5. **GitHub** (Settings > Secrets and variables > Actions):
   - Secrets: `RENDER_DEPLOY_HOOK_API`, `RENDER_DEPLOY_HOOK_WEB` (Deploy Hook URL của từng dịch vụ trên Render).
   - Variables: `PRODUCTION_API_URL` (ví dụ `https://<api>.onrender.com/api`), `PRODUCTION_WEB_URL` (ví dụ `https://<web>.onrender.com`).
   - Thiếu một trong các giá trị trên thì job deploy dừng với thông báo rõ ràng, không deploy dở dang.
6. Bật bảo vệ nhánh `main`: bắt buộc job `API` và `Web` của CI đạt trước khi merge.

## Migration an toàn

- Migration chỉ chạy bằng `prisma migrate deploy` (áp migration mới, không reset dữ liệu).
- Viết migration theo hướng tương thích ngược (thêm cột cho phép null hoặc có mặc định, không xóa cột đang dùng trong cùng bản), để bản API cũ vẫn chạy được nếu phải rollback.
- Migration lỗi làm container mới không khởi động, health check không đạt. Cần kiểm tra lại trên Render khi triển khai thật xem bản cũ có được giữ lại trong trường hợp này hay không.

## Rollback

| Tình huống | Cách làm |
| ---------- | -------- |
| Smoke test lỗi sau khi push vào `main` | `cd.yml` tự deploy lại image của commit trước (`github.event.before`). Chỉ được nếu image của commit đó đã build thành công trước đây |
| Phát hiện lỗi sau khi deploy | Actions > CD > Run workflow, nhập `image_tag` là commit SHA của bản tốt. Job chỉ deploy image đó, không build lại |
| Migration làm hỏng dữ liệu | Prisma không có migration ngược tự động. Khôi phục từ bản sao lưu của Render Postgres rồi deploy lại image cũ |

Rollback chỉ đổi image, không hạ schema database.

## Giám sát

- Health check: `GET /api/health` trả `{ status, uptime, version }`. Chưa kiểm tra kết nối database.
- Log: API và web ghi ra stdout, xem trong mục Logs của từng dịch vụ trên Render.
