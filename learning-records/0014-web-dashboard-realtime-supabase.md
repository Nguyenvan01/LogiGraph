# Dựng Web Dashboard Tương tác Realtime với Supabase

Người học đã hoàn thành xuất sắc mảnh ghép cuối cùng của **Module 4: Capstone (Ship a Real Product)**:

1. **Nguyên lý Thiết kế Giao diện ERP ("Surface the State")**:
   - Trực quan hóa toàn bộ dòng chảy dữ liệu qua 4 phân hệ liên hoàn: KPI Summary Bar, Quản lý Kho & Đặt hàng, Vòng đời Đơn hàng & Hóa đơn, Bảng Cân đối Thử nghiệm (Trial Balance), và Nhật ký Bút toán Sổ cái (Append-Only Audit Trail).
   - Minh bạch hóa trạng thái dữ liệu: Hiển thị tách bạch giữa Tồn kho vật lý, Lượt giữ hàng có TTL 15 phút, và Tồn kho khả dụng.

2. **Đồng bộ Dữ liệu Phản ứng (Reactive State Synchronization)**:
   - Xây dựng dashboard hoàn chỉnh tại `dashboard/index.html` với đầy đủ logic tương tác thời gian thực:
     - Đặt hàng: Tăng lượt giữ hàng, trừ tồn kho khả dụng để chống overselling trong khi kho vật lý vẫn giữ nguyên.
     - Thanh toán: Chuyển đơn sang `PAID`, cấp hóa đơn số hiệu tuần tự `INV-2026-XXXX`, trừ kho vật lý, hạch toán doanh thu và tiền gửi ngân hàng (Debit 112, Credit 511).
     - Xuất kho: Ghi nhận chi phí giá vốn (Debit 632 COGS, Credit 156 Kho hàng).
     - Hoàn tiền: Ghi nhận giao dịch bù trừ đảo chiều (Debit 511, Credit 112) bảo vệ tính toàn vẹn của lịch sử kiểm toán.

3. **Bảo toàn Bất biến Kế toán Toàn diện**:
   - Bảng cân đối thử nghiệm (Trial Balance) tự động tính toán tổng Nợ, tổng Có và số dư thuần trên 5 tài khoản doanh nghiệp chuẩn.
   - Luôn duy trì trạng thái `BALANCED` (100% Invariant $\sum \text{Debit} === \sum \text{Credit}$) qua mọi chu trình nghiệp vụ.

4. **Nghiệm thu Toàn diện Module 4 (Capstone)**:
   - Hoàn thành trọn vẹn cả 4 bài học Capstone (Bài 10, 11, 12, 13).
   - Tích hợp thành công 3 domain lớn: Quản lý Kho (Inventory), Vòng đời Đơn hàng (Order Lifecycle) và Kế toán kép (Double-entry Bookkeeping).
   - Toàn bộ 31 automated tests trong Vitest đều pass trong 42 mili-giây, TypeScript typecheck đạt 0 lỗi.
