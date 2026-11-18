# Test tích hợp và end-to-end

Các test trong thư mục này gọi API thật qua HTTP, chạy trên database thật. Khác với test trong `apps/api/test` (dựng app NestJS trong tiến trình test), ở đây hệ thống phải đang chạy sẵn. Không cần cài thêm thư viện: test dùng `node:test` và `fetch` có sẵn trong Node 20.

| Thư mục | Nội dung |
| ------- | -------- |
| `e2e/` | Luồng UC-01 từ menu đến xác nhận đơn: xem menu, chi tiết, đăng ký, báo giá, đặt đơn, thanh toán Ví, xem đơn PAID trong lịch sử. Có kiểm tra trang web nếu đặt `WEB_URL`. |
| `integration/` | API đơn hàng và thanh toán: Idempotency-Key, thẻ bị từ chối rồi thử lại, thanh toán trùng, quyền xem đơn, health check. |

## Cách chạy

```bash
# 1. Chạy db và backend (backend tự migrate và seed khi khởi động)
docker compose up -d --build db backend

# 2. Chạy test từ thư mục gốc
npm run test:system
```

Biến môi trường:

| Biến | Mặc định | Ý nghĩa |
| ---- | -------- | ------- |
| `API_URL` | `http://localhost:4000/api` | Địa chỉ API cần kiểm tra |
| `WEB_URL` | Không đặt | Đặt (ví dụ `http://localhost:3000`) để kiểm tra trang `/menu` và `/orders`. Không đặt thì bỏ qua test web |

Mỗi test tự đăng ký tài khoản mới nên chạy lại nhiều lần không bị trùng. Test có tạo đơn thật và trừ tồn kho, nên **không chạy vào database production**. Chạy lại seed (khởi động lại backend) để trả tồn kho về giá trị mẫu.

Đây là test end-to-end ở mức API. Chưa có test tự động điều khiển trình duyệt.
