# Senior Code Review Report: VibeCoding ERP Mini v1.0

Báo cáo đánh giá chất lượng mã nguồn độc lập theo 2 trục theo phương pháp luận `/code-review` của Matt Pocock:
- **Phạm vi đánh giá**: Toàn bộ mã nguồn từ Bài 00 đến Bài 14 (`src/modules/inventory/`, `src/modules/ledger/`, `src/actions/`, `supabase/migrations/`).
- **Nguồn tài liệu đối chiếu**:
  - Trục Standards: `CODING_STANDARDS.md`, `CONTEXT.md` và Fowler Code Smells baseline (Refactoring, Ch.3).
  - Trục Spec: `specs/inventory-and-order.md` và `specs/billing-and-ledger.md`.

---

## Standards

### 1. Sự tuân thủ Tiêu chuẩn Dự án (Documented Standards)
- **Deep Modules & Seams**: Đạt yêu cầu. Cả hai module `InventoryService` và `LedgerService` đều giấu logic nghiệp vụ đằng sau interface gọn gàng (3 đến 4 phương thức công khai).
- **Clean Seams & Pluggable Adapters**: Đạt chuẩn. Tầng domain hoàn toàn tách rời khỏi Supabase Client và Next.js qua các interface `IInventoryRepository` và `ILedgerRepository`. Mỗi seam đều có `InMemoryAdapter` chạy test nhanh (< 15ms) và `SupabaseAdapter` kết nối cơ sở dữ liệu thật.
- **Concurrency & Row-level Locking**: Đạt chuẩn. Sau Bài 14, adapter Supabase đã thay thế mô hình Check-Then-Act bằng Stored Procedure PostgreSQL `reserve_stock_atomic` sử dụng `SELECT ... FOR UPDATE`, bảo vệ tính toàn vẹn tồn kho.
- **Zod Validation Guards**: Đạt chuẩn tại tầng Server Actions (`src/actions/schemas.ts`). Toàn bộ payload đầu vào từ client đều được kiểm tra kiểu dữ liệu, loại bỏ giá trị âm và chuỗi rỗng trước khi chuyển vào domain core.
- **Shoehorn Usage in Tests**: Đạt chuẩn. 100% các file unit test sử dụng `fromPartial<T>()` từ `@total-typescript/shoehorn`, không có trường hợp nào ép kiểu thô bạo bằng `as T`.

### 2. Đánh giá theo 12 Fowler Code Smells Baseline
- **Mysterious Name**: Không phát hiện. Tên hàm và biến như `availableStock`, `activeReservations`, `settleReservation`, `postTransaction` bám sát Ubiquitous Language trong `CONTEXT.md`.
- **Duplicated Code**: Nhận diện một vị trí cần lưu ý (Judgement Call). Logic tính toán active reservations xuất hiện ở cả `InMemoryInventoryRepository.getStockBalance` và view `view_inventory_available` trong PostgreSQL. Đây là sự trùng lặp có chủ đích để duy trì tính độc lập của In-memory Adapter trong kiểm thử không phụ thuộc cơ sở dữ liệu.
- **Primitive Obsession**: Nhận diện một vị trí cần cải thiện (Minor Smell). Trong `src/actions/billing.ts`, mã tài khoản kế toán đang nhận kiểu chuỗi nguyên thủy `string` thay vì Branded Type `AccountCode` (`'112'`, `'511'`, `'632'`). Đề xuất gán chặt Branded Type ở phiên bản tiếp theo.
- **Speculative Generality**: Không phát hiện. Không có tham số thừa hoặc các hook trừu tượng viển vông; toàn bộ mã nguồn đều phục vụ trực tiếp các ca sử dụng đã chỉ định.
- **Shotgun Surgery**: Không phát hiện. Khi thay đổi logic khóa tồn kho ở Bài 14, chỉ có duy nhất file adapter `src/modules/inventory/adapters/supabase.ts` và file migration SQL cần chỉnh sửa, không gây ảnh hưởng dây chuyền sang các module khác.

---

## Spec

### 1. Đối soát Yêu cầu Nghiệp vụ Kho & Đơn hàng (`specs/inventory-and-order.md`)
- **Yêu cầu 1: Đặt trước tồn kho với thời hạn TTL 15 phút**: Đã hiện thực hóa đầy đủ. Trường `expires_at` được tính toán tự động `now + 15 minutes`. Khi hết hạn, tồn kho khả dụng tự động được giải phóng mà không làm giảm tồn kho vật lý.
- **Yêu cầu 2: Bất biến Tồn kho khả dụng (Available Stock)**: Đã hiện thực hóa đầy đủ. Công thức $\text{Available Stock} = \text{Physical Stock} - \text{Active Reservations} \ge 0$ được cưỡng chế cả ở view database, Stored Procedure và in-memory logic.
- **Yêu cầu 3: Chống bán vượt tồn kho (Anti-Overselling)**: Đã kiểm chứng hoàn chỉnh qua 4 test cases trong `concurrency.test.ts`. 10 requests đồng thời tranh mua 2 đơn vị tồn kho &rarr; đúng 2 request thành công, 8 request còn lại bị từ chối sạch sẽ với `InsufficientStockError`.
- **Yêu cầu 4: Trừ kho vĩnh viễn khi thanh toán thành công (COMMIT)**: Đã hiện thực hóa tại `settleReservation('COMMIT')` và Stored Procedure `commit_reservation_atomic`.

### 2. Đối soát Yêu cầu Nghiệp vụ Kế toán Kép (`specs/billing-and-ledger.md`)
- **Yêu cầu 1: Bất biến Cân bằng Kế toán kép ($\sum \text{Debit} === \sum \text{Credit}$)**: Đã hiện thực hóa đầy đủ. Mọi transaction ghi sổ đều từ chối dứt khoát nếu hai vế lệch nhau dù chỉ 1 xu (`UnbalancedTransactionError`).
- **Yêu cầu 2: Cơ chế Sổ cái Bất biến (Append-only Audit Trail)**: Đã hiện thực hóa qua Supabase RLS Policy cấm `UPDATE` và `DELETE` trên bảng `ledger_entries`.
- **Yêu cầu 3: Bảng Cân đối Thử nghiệm (Trial Balance)**: Đã hiện thực hóa từ database view `view_ledger_trial_balance` và Server Action `getTrialBalanceAction`.
- **Yêu cầu 4: Hạch toán Đảo chiều khi Hoàn tiền (Refund)**: Đã hiện thực hóa qua Server Action `refundOrderAction` với bút toán đảo Debit 511 / Credit 112, bảo toàn lịch sử kiểm toán.

### 3. Đánh giá Thiếu sót hoặc Phạm vi Thừa (Scope Creep)
- **Yêu cầu còn thiếu (Missing Requirements)**: Không có yêu cầu nào trong spec bị bỏ sót.
- **Hành vi thừa ngoài spec (Scope Creep)**: Không có. Không tự ý thêm phân quyền người dùng phức tạp hoặc cổng thanh toán bên thứ ba chưa được phê duyệt.

---

## Summary

- **Standards Axis**: 1 finding (Primitive Obsession nhẹ tại tham số `accountCode` trong billing actions), không có vi phạm tiêu chuẩn nghiêm trọng nào.
- **Spec Axis**: 0 finding (Khớp 100% tất cả yêu cầu chức năng và bất biến trong 2 bản spec kỹ thuật).
