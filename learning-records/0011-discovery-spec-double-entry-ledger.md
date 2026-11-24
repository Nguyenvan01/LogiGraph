# Discovery & Technical Specification cho Module Kế toán Kép (Billing & Ledger)

Người học đã làm chủ kỹ năng `/grill-with-docs` và `/to-spec` trong bối cảnh Module Capstone của dự án VibeCoding ERP Mini:

1. **Kỹ năng `/grill-with-docs`**:
   - Hiểu rõ cơ chế kết hợp giữa `grilling` và `domain-modeling` khi dự án đã có tài liệu nghiên cứu sơ cấp (`docs/research/double-entry-bookkeeping.md`).
   - Chất vấn các góc khuất kiến trúc tài chính thay vì phỏng vấn từ con số 0, đồng thời cập nhật ngay `CONTEXT.md` và các bản ghi ADR song song.

2. **Nguyên lý Toán học & Bất biến Kế toán Kép**:
   - Nắm vững phương trình kế toán: `Assets = Liabilities + Equity`.
   - Bảo toàn bất biến `SUM(Debit) === SUM(Credit)` trên mọi `AccountingTransaction`.
   - Thống nhất ma trận định khoản 3 nghiệp vụ ERP cốt lõi: Thanh toán đơn hàng (Debit 112, Credit 511), Xuất kho giao hàng (Debit 632, Credit 156), và Hoàn tiền khi hủy đơn (Debit 511, Credit 112).
   - Thiết lập ADR tại `docs/adr/0002-immutable-ledger-and-transaction-invariants.md`: Sổ cái Append-only, không cập nhật hoặc xóa dữ liệu cũ, xử lý điều chỉnh bằng Compensatory Reversals.

3. **Chuyển hóa Schema Supabase PostgreSQL**:
   - Thiết lập file migration `supabase/migrations/20260928000002_init_double_entry_ledger.sql` gồm 4 bảng: `accounts`, `invoices`, `accounting_transactions`, `ledger_entries`.
   - Thiết kế view `view_ledger_trial_balance` tổng hợp số phát sinh Nợ/Có và số dư thuần của từng tài khoản theo thời gian thực.
   - Seed danh mục tài khoản mặc định: 111 (Cash), 112 (Bank), 156 (Inventory), 511 (Revenue), 632 (COGS).

4. **Technical Specification & Tracer-bullet Tickets**:
   - Biên soạn bản đặc tả kỹ thuật `specs/billing-and-ledger.md` chuẩn format Matt Pocock, xác lập Seam `ILedgerRepository` để tách biệt Core Logic khỏi Supabase.
   - Phân rã 4 tickets độc lập trong `.scratch/billing-and-ledger/issues/` với Frontier là Ticket 01, sẵn sàng cho phiên thi công TDD ở Bài 11.
