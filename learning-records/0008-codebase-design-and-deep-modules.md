# Kỹ năng /codebase-design & Thiết kế Deep Modules

Người học đã làm chủ kỹ năng `/codebase-design` và `/setup-ts-deep-modules` theo chuẩn Matt Pocock:

1. **Triết lý Deep Modules của John Ousterhout**:
   - Thấu hiểu bản chất Deep Module: Interface nhỏ gọn, tham số đơn giản, nhưng ẩn giấu bên trong khối lượng lớn hành vi phức tạp (Depth = Leverage).
   - Tránh xa Shallow Modules (mô-đun nông chỉ chuyển tiếp dữ liệu làm phình to interface).
   - Nắm vững The Deletion Test, Leverage cho callers và Locality cho maintainers.
2. **Kỹ nghệ Điểm may (Seams) & 2 Adapters**:
   - Nắm vững định luật: "One adapter means a hypothetical seam. Two adapters means a real one".
   - Thiết lập Seam `IInventoryRepository` và cắm thành công 2 Adapters:
     - `InMemoryInventoryRepository`: Chạy trong RAM cho Vitest (< 5ms).
     - `SupabaseInventoryRepository`: Chạy atomic SQL trên Supabase PostgreSQL.
3. **Sản phẩm đóng góp vào dự án ERP**:
   - Đã thiết lập module hoàn chỉnh tại `src/modules/inventory/`:
     - Entry point công khai `src/modules/inventory/index.ts` với lớp `InventoryService` gồm đúng 3 hàm tinh gọn: `getAvailableStock`, `reserveStock`, `settleReservation`.
     - Thư mục nội bộ `domain/` (types, errors) và `adapters/` (in-memory, supabase) được bảo vệ khép kín.
     - Typecheck 100% sạch sẽ với `tsc --noEmit`, sẵn sàng cho khâu TDD ở Bài 08.
