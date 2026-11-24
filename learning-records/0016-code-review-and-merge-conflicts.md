# Senior Code Review 2 Trục Độc lập & Giải quyết Xung đột Merge

Người học đã hoàn thành bài học thứ hai của **Module 5: Debug Chuyên sâu, Senior Code Review & Hoàn thiện Sản phẩm**:

1. **Phương pháp luận Code Review 2 Trục Độc lập (`code-review`)**:
   - Thấu hiểu bản chất vì sao việc đánh giá mã nguồn bắt buộc phải tách rời thành hai trục độc lập:
     - **Trục Standards**: Đo lường sự tuân thủ các quy chuẩn kiến trúc của dự án và bộ lọc 12 Fowler Code Smells. Ngăn chặn việc tạo ra mã nguồn coupling chặt và nợ kỹ thuật.
     - **Trục Spec**: Đối soát trực tiếp với bản đặc tả kỹ thuật gốc để kiểm tra 3 rủi ro nghiệp vụ: Missing Requirements, Scope Creep, hoặc yêu cầu bị làm sai logic.
   - Tránh cạm bẫy để một trục che giấu khuyết điểm của trục kia: Mã nguồn có thể tuân thủ 100% quy chuẩn kiến trúc nhưng lại giải quyết sai yêu cầu nghiệp vụ, hoặc ngược lại.

2. **Thiết lập Bộ Chuẩn mực và Báo cáo Đánh giá v1.0**:
   - Biên soạn tài liệu quy chuẩn kỹ thuật `CODING_STANDARDS.md` xác lập các nguyên tắc về Deep Modules, Clean Seams, Type Safety với Zod và Branded Types, kiểm soát Concurrency bằng Row-level Locking, và danh mục 12 Fowler Code Smells.
   - Lập báo cáo đánh giá hoàn chỉnh tại `docs/code-review-v1.0-report.md`:
     - Trục Standards: Đạt yêu cầu về kiến trúc Deep Modules và bảo vệ Concurrency. Nhận diện 1 điểm cần cải thiện nhẹ về Primitive Obsession tại mã tài khoản kế toán trong billing actions.
     - Trục Spec: Đạt 100% yêu cầu chức năng từ cả hai bản spec `specs/inventory-and-order.md` và `specs/billing-and-ledger.md`. Không có Scope Creep.

3. **Quy trình Giải quyết Merge Conflict (`resolving-merge-conflicts`)**:
   - Nắm vững quy trình 5 bước xử lý xung đột sáp nhập:
     1. *Quan sát trạng thái*: Xác định các file xung đột và phân tích các khối Conflict Markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).
     2. *Tìm nguồn gốc ý định*: Đọc commit history và PRs để hiểu rõ mục tiêu kỹ thuật của từng nhánh thay vì phán đoán chủ quan.
     3. *Giải quyết từng hunk*: Áp dụng nguyên tắc cốt lõi *Preserve both intents* (bảo toàn ý định của cả hai bên nếu tương thích); không tự ý bịa thêm hành vi mới; không dùng lệnh `--abort` do lúng túng.
     4. *Chạy Automated Checks*: Xác thực lại toàn bộ hệ thống bằng typecheck (`tsc --noEmit`) và bộ kiểm thử tự động (`vitest run`).
     5. *Hoàn tất sáp nhập*: Đưa file đã giải quyết vào staging và hoàn tất commit.
   - Phân tích tình huống thực tế hòa giải giữa khối lệnh ghi nhận Audit Log và khối lệnh gọi Stored Procedure nguyên tử trong `commitReservation`.

4. **Trạng thái Kỹ thuật Toàn hệ thống**:
   - Toàn bộ 35/35 automated tests trong Vitest tiếp tục pass 100% trong 159ms.
   - TypeScript typecheck (`tsc --noEmit`) đạt 0 lỗi.
