# Kỹ năng /to-tickets, /triage & Lập Đồ thị Phụ thuộc (Blockers Graph)

Người học đã làm chủ kỹ năng `/to-tickets` và `/triage` theo chuẩn Matt Pocock:

1. **Tracer-bullet & Lát cắt dọc (Vertical Slice)**:
   - Thấu hiểu sự khác biệt cốt tử giữa Vertical Slice (cắt qua mọi tầng, tự kiểm chứng được độc lập, vừa vặn 1 Context Window) và Horizontal Slice (phản mẫu làm theo tầng kỹ thuật dồn rủi ro về cuối).
   - Nắm vững chiến lược Expand-Contract cho các Wide Refactors diện rộng.
2. **Đồ thị Phụ thuộc & Vận hành Frontier**:
   - Thiết lập các liên kết `Blocked by:` tạo thành đồ thị phụ thuộc rõ ràng.
   - Vận hành cơ chế Frontier: Tập hợp các ticket unblocked sẵn sàng được Agent gắp việc (Claim) theo thứ tự ưu tiên.
3. **Quy chuẩn Nhãn Triage**:
   - 2 Category roles (`bug`, `enhancement`) và 5 State roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
4. **Sản phẩm đóng góp vào dự án ERP**:
   - Đã phân rã spec thành 5 tickets chuẩn mực tại `.scratch/inventory-and-order/issues/` (và `.scratch/issues/`):
     - `01-in-memory-inventory-repository.md` (Frontier)
     - `02-stock-reservation-service.md` (Blocked by: 01)
     - `03-order-state-machine-engine.md` (Blocked by: 02)
     - `04-supabase-inventory-repository-adapter.md` (Blocked by: 01)
     - `05-order-server-actions-and-e2e-seam.md` (Blocked by: 03, 04)
   - Khép lại trọn vẹn Module 2, mở đường cho Module 3 thi công Deep Modules bằng TDD.
