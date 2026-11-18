# Kiến trúc BrewLite

Tài liệu Task 3 của Assignment 2: mô tả kiến trúc theo C4 (ngữ cảnh, container, thành phần), các quyết định kiến trúc (ADR) và sơ đồ triển khai. Phạm vi yêu cầu theo [SRS](../requirements/srs.md), luồng nghiệp vụ theo [sơ đồ Task 2](../diagrams/README.md).

Trạng thái: kiến trúc ở mức code và Docker Compose **đã chạy được trên máy**. Phần production trên Render **chưa triển khai**, sơ đồ triển khai là thiết kế mục tiêu cho Task 5.

## Mức 1: Ngữ cảnh hệ thống

| Thành phần | Vai trò |
| ---------- | ------- |
| Khách hàng | Dùng trình duyệt trên điện thoại hoặc máy tính: xem menu, đặt đơn, thanh toán, theo dõi đơn. |
| Nhân viên quầy | Đổi trạng thái đơn qua `PATCH /api/orders/:id/status` với header `X-Staff-Key`. Chưa có giao diện riêng, nằm ngoài MVP. |
| BrewLite | Hệ thống gồm web, API và database. |
| Cổng thanh toán | Giả lập bên trong API (`MockPaymentGateway`), không gọi dịch vụ bên ngoài. |
| Google Identity | Tùy chọn. Chỉ bật khi đặt `GOOGLE_CLIENT_ID`; để trống thì `POST /api/auth/google` trả 404. |

## Mức 2: Container

```
Trình duyệt ──HTTPS/JSON──▶ web (Next.js 14) ··· tải trang, JS, ảnh
     │
     └──────HTTPS/JSON (Bearer JWT)──▶ api (NestJS 10, tiền tố /api) ──Prisma/TCP──▶ db (PostgreSQL 16)
```

| Container | Thư mục | Công nghệ | Ghi chú |
| --------- | ------- | --------- | ------- |
| web | `apps/web` | Next.js 14 App Router, React 18, Tailwind CSS, Zustand | Build `output: 'standalone'`, chạy `node server.js` cổng 3000. Trình duyệt gọi thẳng API qua `NEXT_PUBLIC_API_URL`, giá trị này gắn vào bản build. |
| api | `apps/api` | NestJS 10, Passport JWT, class-validator, Prisma 6 | REST JSON, tiền tố `/api`, cổng 4000. Khởi động chạy `prisma migrate deploy`, seed rồi `node dist/main`. |
| db | volume `db-data` | PostgreSQL 16 | Dữ liệu bền vững qua volume. Database `brewlite_test` chỉ dùng cho test e2e. |

Web không gọi database. Mọi truy cập dữ liệu đi qua API.

## Mức 3: Thành phần trong API

API là một khối (modular monolith), chia module theo nghiệp vụ trong `apps/api/src/modules`:

| Module | File chính | Trách nhiệm | Phụ thuộc |
| ------ | ---------- | ----------- | --------- |
| `products` | `products.controller.ts`, `products.service.ts` | `GET /products`, `GET /products/:id` | Prisma |
| `auth` | `auth.controller.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `google-token-verifier.ts` | Đăng ký, đăng nhập, Google, `GET /auth/me`, phát và kiểm JWT | `users`, Prisma |
| `users` | `users.service.ts` | Đọc và tạo người dùng | Prisma |
| `orders` | `orders.controller.ts`, `orders.service.ts`, `order-state.ts` | Báo giá, tạo đơn (giữ kho trong transaction), lịch sử, hủy, máy trạng thái | `auth`, `vouchers`, `common/idempotency.ts` |
| `payments` | `payments.controller.ts`, `payments.service.ts`, `mock-payment.gateway.ts` | `POST /payments` idempotent, chuyển `PAID` hoặc `PAYMENT_FAILED`, cộng điểm | `auth`, Prisma |
| `vouchers` | `voucher-pricing.ts` | Tính giảm giá theo voucher (hàm thuần, không có controller) | Không |

Phần dùng chung:
- `src/prisma`: `PrismaService` là điểm truy cập database duy nhất.
- `src/config/configuration.ts`: đọc biến môi trường. Khi `NODE_ENV=production`, chặn khởi động nếu `JWT_SECRET` thiếu, dưới 32 ký tự hoặc là giá trị mẫu.
- `src/common`: `idempotency.ts`, `guards/staff-key.guard.ts`, `decorators/current-user.decorator.ts`.
- `main.ts`: `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`, `transform`), CORS theo `CORS_ORIGIN`.

Thư mục `modules/promotions` đang trống. Khuyến mãi thực tế nằm ở `vouchers`.

## Mức 3: Thành phần trong web

| Thư mục | Vai trò |
| ------- | ------- |
| `src/app` | Các trang: `menu`, `cart`, `checkout`, `login`, `register`, `orders` |
| `src/features` | Logic theo tính năng: auth, cart, checkout, menu, orders |
| `src/store` | Zustand: giỏ hàng (`cart.ts`), phiên đăng nhập (`auth.ts`), thông báo (`toast.ts`) |
| `src/lib/api.ts` | Gọi API, gắn Bearer token, xử lý 401 |
| `src/components` | Khối giao diện dùng lại |

## Các mối quan tâm xuyên suốt

| Mối quan tâm | Hiện trạng | Còn thiếu |
| ------------ | ---------- | --------- |
| Health check | `GET /api/health` trả `{ status: 'ok', uptime }` | Chưa kiểm tra kết nối database |
| Logging | Log mặc định của NestJS ra stdout | Chưa có log có cấu trúc hay request id |
| Quản lý cấu hình | Biến môi trường qua `ConfigModule`; mẫu trong `.env.example` | Secret production phải đặt trên nền tảng, không nằm trong repository |
| Migration | 8 migration Prisma trong `apps/api/prisma/migrations`, chạy bằng `migrate deploy` | Production nên tách bước migration khỏi lúc khởi động, xem [ADR-003](adr/003-postgresql-prisma-migrations.md) |
| Bảo mật | Mật khẩu băm bcrypt, JWT, validate đầu vào, kiểm tra secret production | Token lưu localStorage (rủi ro XSS, đã nêu trong README) |
| PWA | Chưa thực hiện | Manifest và service worker, dự kiến ở Task 5 |

## Quyết định kiến trúc

| ADR | Quyết định | Trạng thái |
| --- | ---------- | ---------- |
| [001](adr/001-monorepo.md) | Một repository chứa `apps/web`, `apps/api`, `docs` | Đã áp dụng |
| [002](adr/002-modular-monolith-nestjs.md) | API là một khối NestJS chia module theo nghiệp vụ | Đã áp dụng |
| [003](adr/003-postgresql-prisma-migrations.md) | PostgreSQL qua Prisma, thay đổi schema bằng migration | Đã áp dụng, phần tách migration production chưa thực hiện |
| [004](adr/004-mock-payment-idempotency.md) | Thanh toán giả lập trong API, idempotent theo `Idempotency-Key` | Đã áp dụng |
| [005](adr/005-deploy-render.md) | Triển khai production lên Render bằng Docker image | Đề xuất, chưa triển khai |

## Sơ đồ triển khai

- Nguồn: [deployment.puml](deployment.puml)
- Ảnh: [deployment.svg](deployment.svg)

Sơ đồ thể hiện ba ranh giới: máy local (Docker Compose), CI (GitHub Actions) và production (Render). Phần production là thiết kế mục tiêu theo [ADR-005](adr/005-deploy-render.md), chưa có URL thật.

Render lại ảnh từ thư mục gốc:

```bash
plantuml -tsvg docs/architecture/deployment.puml
```

### Truy vết container tới mã nguồn

| Node trong sơ đồ | Thành phần | Mã nguồn |
| ---------------- | ---------- | -------- |
| `web` (Render Web Service) | Container web | `apps/web`, `apps/web/Dockerfile` |
| `api` (Render Web Service) | Container api | `apps/api`, `apps/api/Dockerfile`, `apps/api/src/main.ts` |
| `brewlite-db` (Render Postgres) | Container db | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations` |
| Health check `/api/health` | `AppController.health` | `apps/api/src/app.controller.ts` |
| Cổng thanh toán giả lập | `MockPaymentGateway` | `apps/api/src/modules/payments/mock-payment.gateway.ts` |
| Secret và biến môi trường | `configuration.ts` | `apps/api/src/config/configuration.ts`, `.env.example` |
| Pipeline CI/CD | Workflow | `.github/workflows/` (chưa có, làm ở Task 4 và 5) |
