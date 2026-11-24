# Thi công Deep Core Kế toán bằng TDD (Zero-dependency Service)

Người học đã làm chủ kỹ năng thiết kế module sâu (`/codebase-design`) và quy trình TDD (`/tdd`, `/implement-spec`) đối với hệ thống Sổ cái Kế toán kép:

1. **Tư duy Design-it-twice**:
   - So sánh hai phương án thiết kế và lựa chọn giải pháp Deep Module: thay vì cung cấp các hàm vụn vặt dễ sinh lỗi partial failure, `LedgerService` gom toàn bộ nghiệp vụ kiểm soát cân bằng vào `postTransaction` nguyên tử.
   - Ẩn giấu toàn bộ độ phức tạp của việc phân giải tài khoản, xác thực số tiền dương và cưỡng chế tính toán $\sum \text{Debit} === \sum \text{Credit}$ phía sau một public interface tinh gọn.

2. **Seam `ILedgerRepository` & Adapter `InMemoryLedgerRepository`**:
   - Xác lập Seam tại `src/modules/ledger/domain/types.ts` tách biệt hoàn toàn Core Logic khỏi database.
   - Hiện thực hóa `InMemoryLedgerRepository` bằng cấu trúc dữ liệu `Map` nạp sẵn 5 tài khoản doanh nghiệp chuẩn (111, 112, 156, 511, 632), cho phép toàn bộ test suite thực thi trong chưa đầy 30 mili-giây mà không phụ thuộc vào kết nối mạng tới Supabase.

3. **Vòng lặp TDD (Red - Green - Refactor) qua 6 Slices**:
   - **Slice 1 (Invariants & Validation)**: Bắt buộc số lượng bút toán tối thiểu (&ge; 2), số tiền dương (> 0), tài khoản hợp lệ, và ném `UnbalancedTransactionError` khi tổng Nợ khác tổng Có kèm chi tiết số tiền chênh lệch.
   - **Slice 2 (Compound Postings)**: Hỗ trợ giao dịch nhiều chân (Split payments) thỏa mãn điều kiện cân bằng hai vế.
   - **Slice 3 (Revenue Realization & Invoicing)**: Tự động cấp số hóa đơn `INV-YYYY-XXXX`, tính thuế và hạch toán doanh thu bán hàng khi nhận thanh toán (Debit 112, Credit 511).
   - **Slice 4 (Inventory Relief & COGS)**: Hạch toán giá vốn và giảm trừ kho (Debit 632, Credit 156) khi giao hàng.
   - **Slice 5 (Compensatory Reversals)**: Thực hiện nghiệp vụ hoàn tiền thông qua bút toán đảo chiều (Debit 511, Credit 112), bảo toàn nguyên vẹn lịch sử kiểm toán Append-only.
   - **Slice 6 (Trial Balance Invariant)**: Bảng cân đối thử nghiệm duy trì trạng thái cân bằng tuyệt đối qua mọi chu trình kinh tế.

4. **Nghiệm thu Kỹ thuật**:
   - Hoàn thành bộ kiểm thử 11 tests tại `src/modules/ledger/ledger.test.ts`. Toàn bộ 27 tests của dự án đều pass trong 26 mili-giây.
   - TypeScript typecheck đạt 0 compile errors.
   - Chính thức đóng **Ticket 01** và **Ticket 02** trong kế hoạch Capstone.
