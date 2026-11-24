# Kỹ năng /to-spec & Soạn Bản Đặc tả Kỹ thuật chuẩn mực

Người học đã làm chủ kỹ năng `/to-spec` theo chuẩn Matt Pocock:

1. **Bản chất của /to-spec**:
   - Tuân thủ nguyên tắc: "Do NOT interview the user; just synthesize what you already know".
   - Tổng hợp triệt để từ ngữ cảnh đàm phán, prototype, ADR và Ubiquitous Language thành một bản đặc tả hoàn chỉnh gồm 6 phần: Problem Statement, Solution, Extensive User Stories, Implementation Decisions, Testing Decisions, và Out of Scope.
2. **Kỹ nghệ Thiết kế Điểm may (Seams) cho Testing**:
   - Áp dụng nguyên lý Seams của Michael Feathers và chỉ dẫn của Matt Pocock: "Use the highest seam possible. The fewer seams, the better - the ideal number is one".
   - Định hình kiến trúc Dual-Adapter cắm vào một Seam duy nhất (`IInventoryRepository`):
     - In-Memory Adapter: Chạy Unit Tests Vitest siêu tốc (< 5ms) không phụ thuộc mạng hay database.
     - Supabase Adapter: Thực thi với PostgreSQL cho môi trường production.
3. **Sản phẩm đóng góp vào dự án ERP**:
   - Đã xuất bản file `specs/inventory-and-order.md` (đồng thời lưu tại `.scratch/inventory-and-order/spec.md`) với nhãn `ready-for-agent`.
   - Bao quát 14 User Stories chi tiết, khóa chặt State Machine và Invariant tồn kho, sẵn sàng cho khâu phân rã tickets ở Bài 06.
