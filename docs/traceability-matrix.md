# Ma trận truy vết

Liên kết mỗi yêu cầu trong [SRS](requirements/srs.md) với use-case, sơ đồ, mã nguồn/API và test. Mẫu theo mục 8.1 của đề Assignment 2.

Quy ước cột:
- **Use-case**: tên trong [sơ đồ use-case](requirements/usecase.puml). UC-01 là use-case đã đặc tả đầy đủ trong SRS.
- **Thiết kế/Sơ đồ**: `Activity` = [activity-checkout](diagrams/activity-checkout.puml), `Sequence` = [sequence-checkout](diagrams/sequence-checkout.puml), `Class` = [class-domain](diagrams/class-domain.puml), `Deployment` = [deployment](architecture/deployment.puml), `ADR-xxx` = [quyết định kiến trúc](architecture/README.md#quyết-định-kiến-trúc).
- **Test**: đường dẫn file test, có thể kèm tên test. Đường dẫn tính từ thư mục gốc. Test trong `tests/` cần API đang chạy (xem [tests/README.md](../tests/README.md)).

## Yêu cầu chức năng

| Mã yêu cầu | Use-case | Thiết kế/Sơ đồ | Code/API | Test |
| ---------- | -------- | -------------- | -------- | ---- |
| FR-01 | Xem menu | Activity, Class (Product) | `GET /products`; `apps/api/src/modules/products/products.controller.ts`; `apps/web/src/app/menu` | `apps/api/test/products.e2e-spec.ts` (GET /api/products returns 200 with a list; ?category=foo returns 400); `apps/api/src/modules/products/products.service.spec.ts`; `tests/e2e/checkout-flow.test.mjs` |
| FR-02 | Xem chi tiết, chọn size/topping | Activity, Class (Product) | `GET /products/:id`; `apps/web/src/app/menu/[id]`; `apps/web/src/lib/price.ts` | `apps/api/test/products.e2e-spec.ts` (items expose price, sizes and toppings; unknown-id returns 404); `apps/web/src/lib/price.test.ts`; `tests/e2e/checkout-flow.test.mjs` |
| FR-03 | Quản lý giỏ hàng | Activity | Không có API; `apps/web/src/store/cart.ts` | `apps/web/src/store/cart.test.ts` |
| FR-04 | Đăng ký / đăng nhập, kiểm tra phiên | Activity, Sequence, Class (User) | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; `apps/api/src/modules/auth`; `apps/web/src/store/auth.ts` | `apps/api/test/auth.e2e-spec.ts`; `apps/api/src/modules/auth/auth.service.spec.ts`; `apps/web/src/store/auth.test.ts`; `apps/web/src/lib/auth-validation.test.ts`; `tests/e2e/checkout-flow.test.mjs` |
| FR-05 | UC-01: Xem báo giá | Sequence, Activity | `POST /orders/quote`; `apps/api/src/modules/orders/orders.service.ts` | `apps/api/test/vouchers-loyalty.e2e-spec.ts` (quote returns the priced total without writing an order...); `tests/e2e/checkout-flow.test.mjs` |
| FR-06 | UC-01: Tạo đơn và giữ kho | Sequence, Activity, Class (Order, OrderItem), ADR-002, ADR-003 | `POST /orders`; `apps/api/src/modules/orders/orders.service.ts` | `apps/api/test/orders.e2e-spec.ts` (returns 201 with PENDING status...; reserves stock); `apps/api/test/orders-stock.e2e-spec.ts`; `tests/e2e/checkout-flow.test.mjs` |
| FR-07 | UC-01: Chống tạo trùng | Sequence, ADR-004 | `POST /orders` với `Idempotency-Key`; `apps/api/src/common/idempotency.ts` | `apps/api/test/orders.e2e-spec.ts` (the same key twice creates ONE order...; the same key with a different body returns 422...); `tests/integration/orders-payments.test.mjs` |
| FR-08 | UC-01: Thanh toán giả lập, cho phép thử lại | Sequence, Activity, Class (Payment), ADR-004 | `POST /payments`; `apps/api/src/modules/payments/payments.service.ts`, `mock-payment.gateway.ts` | `apps/api/test/payments.e2e-spec.ts`; `apps/api/src/modules/payments/payments.service.spec.ts`; `apps/web/src/features/checkout/payment-errors.test.ts`; `tests/integration/orders-payments.test.mjs`; `tests/e2e/checkout-flow.test.mjs` |
| FR-09 | Xem xác nhận, lịch sử và trạng thái đơn | Sequence, Activity | `GET /orders/me`, `GET /orders/:id`; `apps/web/src/app/orders` | `apps/api/test/orders.e2e-spec.ts` (order history...); `tests/integration/orders-payments.test.mjs`; `tests/e2e/checkout-flow.test.mjs` |
| FR-10 | Cập nhật trạng thái phục vụ qua API | Class (OrderStatus) | `PATCH /orders/:id/status`; `apps/api/src/modules/orders/order-state.ts`; `apps/api/src/common/guards/staff-key.guard.ts` | `apps/api/src/modules/orders/order-state.spec.ts`; `apps/api/test/orders.e2e-spec.ts` (staff advances PAID -> PREPARING -> READY -> COMPLETED; blocks PENDING -> PREPARING...) |
| FR-11 | Hủy đơn | Class (OrderStatus) | `POST /orders/:id/cancel`; `apps/api/src/modules/orders/orders.service.ts` | `apps/api/test/orders.e2e-spec.ts` (owner cancels PENDING and PAID orders...; cancel is blocked from READY); `apps/api/test/orders-stock.e2e-spec.ts` (cancelling an order restores its stock exactly once) |
| FR-12 | Áp dụng voucher, ghi nhận điểm | Class (Promotion ↔ Voucher, User.loyaltyPoints) | `POST /orders/quote`, `POST /orders`, `POST /payments`, `POST /orders/:id/cancel`; `apps/api/src/modules/vouchers/voucher-pricing.ts` | `apps/api/test/vouchers-loyalty.e2e-spec.ts`; `apps/api/src/modules/vouchers/voucher-pricing.spec.ts`; `apps/web/src/features/checkout/voucher-state.test.ts` |
| FR-13 | Đăng nhập Google | Không có sơ đồ riêng | `POST /auth/google`; `apps/api/src/modules/auth/google-token-verifier.ts` | `apps/api/test/auth.e2e-spec.ts` (POST /api/auth/google); `apps/web/src/lib/google-auth.test.ts` |
| FR-14 | Không có (Won't) | ADR-004 | Không có endpoint | Không áp dụng |

## Yêu cầu phi chức năng

| Mã yêu cầu | Liên quan | Thiết kế | Code/Cấu hình | Kiểm chứng |
| ---------- | --------- | -------- | ------------- | ---------- |
| NFR-01 | UC-01 | Deployment | Toàn bộ API | **Chưa đo.** Cách đo ghi trong SRS. Ngưỡng < 500ms |
| NFR-02 | FR-04 | ADR-002 | `ValidationPipe` trong `apps/api/src/main.ts`; `jwt-auth.guard.ts` | `apps/api/test/auth.e2e-spec.ts`; `apps/api/test/orders.e2e-spec.ts` (returns 400 for unknown fields; 401 without a token) |
| NFR-03 | FR-04 | ADR-005 | `apps/api/src/config/configuration.ts`; `.env.example` | `apps/api/src/config/configuration.spec.ts` |
| NFR-04 | FR-01 đến FR-09 | Activity | `apps/web` | Kiểm tra thủ công theo README mục **Kịch bản demo**, chưa có test tự động trên trình duyệt |
| NFR-05 | FR-07, FR-08 | Sequence, ADR-004 | `apps/api/src/common/idempotency.ts` | `apps/api/test/payments.e2e-spec.ts` (same Idempotency-Key on another order returns 422...); `tests/integration/orders-payments.test.mjs` |
| NFR-06 | FR-06 | ADR-003 | `apps/api/src/modules/orders/orders.service.ts` (khóa lạc quan) | `apps/api/test/orders-stock.e2e-spec.ts` (20 concurrent orders for 5 units...) |
| NFR-07 | Toàn hệ thống | Deployment (local), ADR-001 | `docker-compose.yml`; `apps/api/Dockerfile`; `apps/web/Dockerfile` | `.github/workflows/ci.yml` (chưa chạy trên GitHub); [docs/deployment.md](deployment.md) |
| NFR-08 | Toàn hệ thống | Deployment, ADR-005 | `.github/workflows/cd.yml`; `GET /health` trong `apps/api/src/app.controller.ts` | **Chưa thực hiện.** Chưa có URL production. `apps/api/src/app.controller.spec.ts` kiểm tra health và version |
| NFR-09 | FR-01 | Deployment | `apps/web/src/app/manifest.ts` | Manifest được phục vụ ở `/manifest.webmanifest`. Chưa kiểm tra cài đặt trên thiết bị, chưa có service worker |
