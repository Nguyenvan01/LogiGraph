# Chuẩn hóa Từ điển Domain & Thiết kế Schema Supabase PostgreSQL

Người học đã làm chủ kỹ năng `/domain-modeling` theo chuẩn Matt Pocock:

1. **Ubiquitous Language & CONTEXT.md**:
   - Nắm vững cấu trúc Single-context repository: `CONTEXT.md` ở root và `docs/adr/` cho các quyết định kiến trúc.
   - Hiểu rõ nguyên tắc cốt lõi: `CONTEXT.md` là một glossary thuần túy, tuyệt đối không chứa chi tiết triển khai hay các khái niệm lập trình phổ thông.
   - Ứng dụng kỹ thuật `_Avoid_` để thể hiện quan điểm dứt khoát (opinionated), ngăn chặn hiện tượng dùng từ đồng nghĩa làm loãng context của AI Agent.
2. **Quản lý Architecture Decision Record (ADR)**:
   - Nắm chắc 3 điều kiện bắt buộc để viết ADR: Hard to reverse, Surprising without context, và Result of a real trade-off.
   - Đã tạo ADR đầu tiên tại `docs/adr/0001-atomic-stock-reservation-over-redis-lock.md` ghi nhận quyết định dùng PostgreSQL Check Constraints & TTL Reservation thay vì Redis Distributed Lock.
3. **Chuyển hóa sang Schema Supabase PostgreSQL**:
   - Đã tạo migration `supabase/migrations/20260928000001_init_inventory_and_orders.sql` gồm 4 bảng cốt lõi: `products`, `orders`, `order_items`, `stock_reservations`.
   - Bảo toàn bất biến `Available Stock = Physical Stock - Active Reservations` qua database view thời gian thực `view_inventory_available` và ràng buộc `CONSTRAINT positive_stock CHECK (stock >= 0)`.
