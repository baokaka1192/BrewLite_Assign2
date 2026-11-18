# ADR-004: Thanh toán giả lập trong API, idempotent theo Idempotency-Key

- Trạng thái: Đã áp dụng
- Ngày: 2026-10-30

## Bối cảnh

Đề yêu cầu thanh toán Ví/Thẻ không dùng tiền mặt và dùng cổng giả lập. Task 10 của Assignment 1 yêu cầu gửi lại cùng một yêu cầu thanh toán không bị trừ tiền hay tạo đơn hai lần.

## Quyết định

- Cổng thanh toán là lớp `MockPaymentGateway` (`apps/api/src/modules/payments/mock-payment.gateway.ts`) chạy trong cùng tiến trình API, không gọi dịch vụ bên ngoài.
- `POST /orders` và `POST /payments` bắt buộc header `Idempotency-Key`. Key lưu trong database theo từng người dùng. Gửi lại cùng key và cùng nội dung trả lại kết quả cũ; cùng key nhưng nội dung khác trả 422.
- Thanh toán thành công chuyển đơn sang `PAID` và cộng điểm. Bị từ chối trả 402, đơn ở `PAYMENT_FAILED`, có thể thử lại hoặc hủy.

## Lý do

- Không cần tài khoản cổng thật, không có rủi ro lộ dữ liệu thẻ, test chạy ổn định.
- Đặt cổng sau một lớp riêng để sau này thay bằng cổng thật mà không đổi `PaymentsService`.
- Idempotency ở phía server chống được việc người dùng bấm hai lần hoặc mạng gửi lại.

## Hệ quả

- Ưu: luồng thanh toán kiểm thử được hoàn toàn, kể cả nhánh lỗi.
- Hạn chế: chưa có hoàn tiền; hủy đơn đã thanh toán không trả tiền. Key idempotency chưa có job dọn dẹp (đã ghi trong README).
- Trade-off: sơ đồ triển khai không có node cổng thanh toán bên ngoài, vì cổng giả lập nằm trong container API.
