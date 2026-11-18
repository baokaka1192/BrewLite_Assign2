# BrewLite

Ứng dụng đặt cà phê không dùng tiền mặt, bài tập lớn môn Công nghệ phần mềm (Đại học Sài Gòn, 2026-2027).
Công nghệ: **Next.js 14** (frontend), **NestJS 10** (backend), **PostgreSQL**, Docker Compose.

## Cấu trúc thư mục

```
brewlite/
├── apps/
│   ├── backend/                    API REST bằng NestJS  (http://localhost:4000/api)
│   │   ├── src/
│   │   │   ├── main.ts             khởi động: tiền tố /api, CORS, ValidationPipe
│   │   │   ├── app.module.ts       module gốc
│   │   │   ├── config/             cấu hình biến môi trường có kiểu
│   │   │   ├── prisma/             PrismaModule và PrismaService dùng chung
│   │   │   ├── common/             dùng chung: decorator, filter, guard, interceptor, pipe
│   │   │   └── modules/            mỗi tính năng một thư mục (controller, service, dto, entity)
│   │   │       ├── auth/           Task 7   đăng ký, đăng nhập, JWT
│   │   │       ├── users/          Task 7
│   │   │       ├── products/       Task 2   GET /products
│   │   │       ├── orders/         Task 6, 9, 10  máy trạng thái, lịch sử đơn
│   │   │       ├── payments/       Task 8, 10     cổng thanh toán giả lập, idempotency
│   │   │       └── promotions/     Task 10  voucher, điểm tích lũy
│   │   ├── prisma/                 schema, migration, seed.ts (Prisma và PostgreSQL)
│   │   └── test/                   test e2e
│   └── frontend/                   Next.js App Router  (http://localhost:3000)
│       ├── public/images/          ảnh cho trang chủ
│       └── src/
│           ├── app/                route: layout, trang chủ, menu, sau này là giỏ hàng, thanh toán, đơn hàng
│           ├── components/
│           │   ├── ui/             thành phần cơ bản (Button kiểu shadcn)
│           │   ├── layout/         Navbar, Footer
│           │   ├── landing/        mỗi mục của trang chủ một file
│           │   └── shared/         Reveal, AmberRule, Chip, ImageFrame, MotionProvider
│           ├── features/           mã theo từng nghiệp vụ: menu, giỏ hàng, đăng nhập, thanh toán, đơn hàng
│           ├── content/            nội dung chữ của trang chủ (sửa chữ ở đây, không sửa trong component)
│           ├── lib/                client gọi API, tiện ích, formatVND
│           ├── hooks/ store/ types/
├── docs/scrum/                     kế hoạch sprint, Definition of Done
├── docker-compose.yml              db, backend, frontend
├── .env.example
└── package.json                    các script hỗ trợ
```

Quy tắc chung: **route đặt trong `app/`, thành phần giao diện trong `components/`, mã nghiệp vụ của một tính năng trong `features/` (frontend) hoặc `modules/` (backend).**

## Chạy trên máy

```bash
cp .env.example .env
npm run install:all
npm run dev:backend      # http://localhost:4000/api  -> { "message": "Hello from BrewLite API" }
npm run dev:frontend     # http://localhost:3000
```

Frontend gọi API tại `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:4000/api`). Nếu backend chạy ở nơi khác, ghi đè biến này trong `apps/frontend/.env.local`.

## Cơ sở dữ liệu (PostgreSQL và Prisma)

Backend lưu dữ liệu vào PostgreSQL qua Prisma. Schema nằm ở `apps/backend/prisma/schema.prisma`.

Hai cơ sở dữ liệu cùng nằm trong một container Postgres của compose:

| Biến môi trường | Cơ sở dữ liệu | Dùng cho |
| --------------- | ------------- | -------- |
| `DATABASE_URL` | `brewlite` | server dev, `prisma migrate`, `prisma db seed` |
| `DATABASE_URL_TEST` | `brewlite_test` | chỉ dùng cho test e2e (tự migrate và seed) |

```bash
cp .env.example .env                       # gốc (compose) và
cp apps/backend/.env.example apps/backend/.env   # backend (Prisma CLI đọc file này)

docker compose up -d db                    # Postgres 16 ở localhost:5432, chờ healthcheck
cd apps/backend
npm install
npx prisma migrate dev                     # tạo và áp dụng migration ở máy dev (chỉ dùng khi phát triển)
npx prisma migrate deploy                  # áp dụng các migration có sẵn (CI hoặc database mới)
npm run prisma:seed                        # thêm 10 sản phẩm mẫu (chạy lại không bị trùng)
```

`brewlite_test` được tạo bởi `docker/postgres/init/01-create-test-db.sql`, file này chỉ chạy lần đầu khi volume `db-data` được tạo.
Nếu volume đã có từ trước, tạo database này một lần bằng tay:

```bash
docker compose exec db psql -U brewlite -d brewlite -c "CREATE DATABASE brewlite_test OWNER brewlite;"
```

Đặt lại database dev (xóa toàn bộ dữ liệu): `cd apps/backend && npx prisma migrate reset`.

## Kiểm thử

```bash
cd apps/backend
npm test            # unit test, PrismaService được mock (không cần database)
npm run test:e2e    # cần container db; tự migrate và seed brewlite_test trong beforeAll
npm run build       # chạy prisma generate rồi nest build
```

`npm test`, `npm run build` và `npm run test:e2e` đều chạy `prisma generate` trước, nên Prisma client luôn khớp với schema.

## Các endpoint API

| Phương thức | Đường dẫn | Mô tả |
| ----------- | --------- | ----- |
| GET | `/api/products` | Danh sách sản phẩm. Tùy chọn `?category=coffee\|tea\|pastry` (giá trị khác trả 400). |
| GET | `/api/products/:id` | Lấy một sản phẩm, trả 404 nếu không tồn tại. |
| POST | `/api/auth/register` | Đăng ký `{email, password (8-72 ký tự), name?}`. Email được chuyển về chữ thường. Trả 201 với `{user, accessToken}`; 400 khi dữ liệu sai, 409 khi email đã đăng ký. |
| POST | `/api/auth/login` | Đăng nhập với `{email, password}`. Trả 200 với `{user, accessToken}`; 401 với cùng một thông báo cho cả email không tồn tại lẫn sai mật khẩu. |
| GET | `/api/auth/me` | Thông tin người dùng hiện tại. Cần `Authorization: Bearer <accessToken>`, nếu không trả 401. |
| POST | `/api/orders` | Tạo đơn PENDING từ giỏ hàng `{items:[{productId, size?, toppingIds?, qty}], note?}`. Cần `Authorization: Bearer <accessToken>` và `userId` của đơn lấy từ token (không còn nhận đơn khách vãng lai). Tổng tiền tính ở server. Trả 201 với id và tổng tiền của đơn; 400 khi dữ liệu sai, 401 khi thiếu token hợp lệ, 404 khi sản phẩm không tồn tại, 409 khi số lượng vượt tồn kho. |
| POST | `/api/payments` | Thanh toán giả lập cho một đơn `{orderId, method: "WALLET"\|"CARD", cardNumber?}` (với CARD bắt buộc có cardNumber, 12-19 chữ số). Cần `Authorization: Bearer <accessToken>`. Số tiền luôn là tổng tiền của đơn trong database. Trả 201 với `{payment, order:{id,status}}` và đơn chuyển sang PAID. Trả 402 với `{reason, payment, order}` và đơn chuyển sang PAYMENT_FAILED khi cổng giả lập từ chối (thẻ CARD kết thúc bằng 0000, hoặc WALLET trên 5.000.000). Được thử lại từ trạng thái PAYMENT_FAILED. 400 khi dữ liệu sai, 401 khi thiếu token hợp lệ, 404 khi đơn không thuộc người dùng, 409 khi đơn không ở trạng thái PENDING hoặc PAYMENT_FAILED. Header `Idempotency-Key` là tùy chọn (hiện chỉ lưu lại; cách xử lý lặp lại làm ở Task 10). |

Biến môi trường cho xác thực (đặt trong `apps/backend/.env`):

| Biến | Mặc định | Ghi chú |
| ---- | -------- | ------- |
| `JWT_SECRET` | `dev-secret` khi không phải production | Bắt buộc khi `NODE_ENV=production`; thiếu thì backend không khởi động. |
| `JWT_EXPIRES_IN` | `1d` | Thời hạn token, truyền cho `jsonwebtoken` (ví dụ `1h`, `7d`). |

Ảnh menu: lấy từ Unsplash, ghi nguồn tại [apps/frontend/public/images/menu/CREDITS.md](apps/frontend/public/images/menu/CREDITS.md).

## Chạy bằng Docker

```bash
cp .env.example .env
docker compose up --build
```

## Hệ thống thiết kế

Màu sắc, phông chữ và token nằm trong `apps/frontend/src/app/globals.css` và `tailwind.config.ts`
(Playfair Display và DM Sans, tông espresso, amber, kem). Ảnh trang chủ hiện là ảnh tạm, sẽ thay khi
thêm file vào `public/images` và truyền vào `src` của `ImageFrame`.

## Quy trình Git

Mỗi task một nhánh (`feat/task-02-products-api`), commit nhỏ, review trước khi merge vào `main`.
