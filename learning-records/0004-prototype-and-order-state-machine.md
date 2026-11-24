# Kỹ năng /prototype & Kiểm chứng State Machine Vòng đời Đơn hàng

Người học đã làm chủ kỹ năng xây dựng mẩu thử độc lập (`/prototype`) theo chuẩn Matt Pocock:

1. **Bản chất của Prototype**: Là "throwaway code that answers a question". Xác định rõ câu hỏi thiết kế trước khi viết code và phân biệt rạch ròi giữa **Logic Prototype** (`LOGIC.md`) và **UI Prototype** (`UI.md`).
2. **6 Quy tắc Vàng**: Throwaway from day one, Trivial to run (mở bằng double-click không cần dev server), No persistence by default (chỉ dùng in-memory state), Skip the polish (không viết unit test cho prototype), Surface the state, và Capture it when done (tích hợp phần Pure Logic Module đã kiểm chứng vào codebase chính).
3. **Ứng dụng thực tế vào VibeCoding ERP**:
   - Đã dựng thành công file `prototypes/order-lifecycle-prototype.html` kiểm chứng chu trình: `DRAFT` → `PAID` → `SHIPPED` → `DONE` / `CANCELLED`.
   - Kết hợp chặt chẽ với cơ chế giữ hàng `Stock Reservation with 15-min TTL` đã chốt ở Bài 01.
   - Kiểm chứng thành công các ca biên: Hết hạn TTL tự động giải phóng tồn kho khả dụng, Hủy đơn sau khi thanh toán kích hoạt hoàn tiền và hoàn kho vật lý, Chặn các chuyển trạng thái bất hợp pháp.
   - Logic State Machine được cô lập thành Pure Reducer hoàn toàn độc lập với DOM, sẵn sàng đưa vào `src/modules/order/` khi thi công TDD ở Module 3.
