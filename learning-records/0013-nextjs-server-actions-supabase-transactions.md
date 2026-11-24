# Xây dựng Next.js Server Actions & Xử lý Transaction trên Supabase

Người học đã làm chủ kỹ năng triển khai ứng dụng thực tế (`/implement`, `/tdd`) kết nối các Deep Modules với Next.js 15 Server Actions và Supabase PostgreSQL:

1. **Bản chất Server Actions trong Next.js 15 App Router**:
   - Hiểu rõ cơ chế hoạt động của chỉ thị `'use server'`: tạo các RPC endpoints an toàn giữa client và server thay vì viết API routes thủ công.
   - Thiết lập 3 lớp bảo vệ bắt buộc: Validation Guards với Zod schemas, Domain Coordination qua Seams/Services, và Standardized Action Results (`{ success, data, error }`).

2. **Điều phối Multi-domain Atomic Flow**:
   - Xây dựng Server Action `processOrderPaymentAction` phối hợp trơn tru giữa hai domain Kho và Kế toán trong một lần gọi duy nhất:
     1. Cấp hóa đơn `Invoice` với số hiệu tuần tự `INV-YYYY-XXXX`.
     2. Chốt trừ kho vật lý (chuyển reservation sang `COMMITTED`).
     3. Hạch toán dòng tiền và doanh thu: Debit 112 (Bank), Credit 511 (Revenue).
     4. Cập nhật trạng thái hóa đơn sang `PAID`.
   - Triển khai `fulfillOrderAction` ghi nhận giá vốn hàng bán (Debit 632 COGS, Credit 156 Inventory) và `refundOrderAction` xử lý hoàn tiền bằng bút toán bù trừ đảo chiều (Debit 511 Revenue, Credit 112 Bank).

3. **Bảo mật Database với Row Level Security (RLS)**:
   - Tạo migration `supabase/migrations/20260928000003_ledger_and_orders_rls.sql` kích hoạt RLS trên toàn bộ các bảng nghiệp vụ.
   - Cưỡng chế nguyên tắc Sổ cái Bất biến (Append-Only): Chỉ cấp quyền `SELECT` và `INSERT`, tuyệt đối không tạo policy cho `UPDATE` và `DELETE` trên bảng `ledger_entries`, bảo vệ tính minh bạch tài chính ở cấp độ database engine.

4. **Nghiệm thu Kỹ thuật & Đóng Tickets**:
   - Triển khai adapter sản xuất `SupabaseLedgerRepository` tại `src/modules/ledger/adapters/supabase.ts`.
   - Hoàn thành bộ kiểm thử tích hợp tại `src/actions/actions.test.ts`. Toàn bộ 31 tests của dự án (16 inventory, 11 ledger, 4 actions) đều pass trong 48 mili-giây, typecheck đạt 0 lỗi.
   - Chính thức đóng toàn bộ 4 tickets của Module Billing & Ledger (Tickets 01, 02, 03, 04).
