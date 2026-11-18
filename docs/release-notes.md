# Release notes

## v0.1.0 (chưa phát hành)

Bản MVP đầu tiên của BrewLite, gồm luồng đặt và thanh toán đồ uống không dùng tiền mặt. Chưa gắn tag Git, chưa deploy production.

### Tính năng

- Menu và lọc theo loại, chi tiết sản phẩm với size S/M/L và topping (FR-01, FR-02).
- Giỏ hàng lưu trên trình duyệt, tự tính tổng (FR-03).
- Đăng ký, đăng nhập bằng JWT; đăng nhập Google khi được cấu hình (FR-04, FR-13).
- Báo giá phía server, tạo đơn giữ tồn kho trong transaction, chống tạo đơn trùng bằng `Idempotency-Key` (FR-05, FR-06, FR-07).
- Thanh toán Ví/Thẻ qua cổng giả lập, thử lại sau khi bị từ chối (FR-08).
- Xác nhận đơn, lịch sử đơn có phân trang (FR-09).
- API nhân viên đổi trạng thái đơn theo máy trạng thái, khách hủy đơn (FR-10, FR-11).
- Voucher `BREW10`, `WELCOME20K` và điểm thưởng (FR-12).
- Manifest PWA (`/manifest.webmanifest`) để trình duyệt cho phép cài ứng dụng.
- `GET /api/health` trả thêm `version` (commit SHA của image).

### Kiểm thử và vận hành

- Test đơn vị backend và frontend, test e2e backend, test tích hợp và e2e qua HTTP trong `tests/`.
- Lint cho cả `apps/api` và `apps/web`.
- Workflow CI (`.github/workflows/ci.yml`) và CD (`.github/workflows/cd.yml`) đã có, chưa chạy trên GitHub.

### Hạn chế đã biết

- Thanh toán giả lập, chưa hoàn tiền.
- Token lưu trong localStorage (rủi ro XSS).
- Chưa có giao diện cho nhân viên.
- PWA chưa có service worker, chưa dùng được khi mất mạng.
- Health check chưa kiểm tra kết nối database.
- Chưa có URL production.

### Nâng cấp

Database mới: chạy `npx prisma migrate deploy` trong `apps/api` rồi seed theo README.
