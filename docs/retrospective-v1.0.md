# Retrospective: VibeCoding ERP Mini v1.0

Tài liệu đúc kết kinh nghiệm sau chu trình phát triển sản phẩm thực tế từ Module 0 đến Module 5, bám sát phương pháp luận `/retro` của Matt Pocock nhằm cải thiện môi trường làm việc cho coding agent trong các phiên làm việc tiếp theo.

---

## 1. Các Hạng mục Đánh giá theo Thứ tự Mức độ Ảnh hưởng

### 1. Automated Checks (Rào chắn Tự động) — Ưu tiên Cao nhất
- **Hiện trạng:** Dự án đã thiết lập bộ kiểm thử Vitest 35 tests (< 200ms) và lệnh kiểm tra kiểu `npm run typecheck` (`tsc --noEmit`).
- **Bài học kinh nghiệm:** Các lỗi cơ học (như thiếu thuộc tính tùy chọn trong stub interface, hoặc sai kiểu dữ liệu) luôn được `tsc` và Vitest bắt ngay lập tức. Đây là rào chắn hiệu quả nhất giúp ngăn ngừa lỗi hồi quy (regression) trước khi commit.
- **Cải tiến đề xuất:** Thiết lập thêm một file cấu hình ESLint tối giản hoặc script `npm run check` gom chung cả `typecheck` và `test` thành một lệnh duy nhất để agent chỉ cần gọi một lệnh sau mỗi thay đổi lớn.

### 2. Navigation (Định hướng File & Cấu trúc Thư mục)
- **Hiện trạng:** Dự án duy trì tài liệu `CONTEXT.md` và `.scratch/handoff.md` làm Single Source of Truth.
- **Bài học kinh nghiệm:** Nhờ có cấu trúc Deep Modules tách biệt rõ ràng (`src/modules/inventory/`, `src/modules/ledger/`, `src/actions/`), các agent tiếp nối không mất thời gian dò tìm file, tránh hiện tượng quá tải context window.
- **Cải tiến đề xuất:** Bổ sung mục lục liên kết nhanh (Navigation Pointers) trong `CONTEXT.md` trỏ thẳng tới các file Seams và Adapters chính để agent mới định hướng ngay trong turn đầu tiên.

### 3. Coding Standards & Phân định Vai trò (Implementation vs Review)
- **Hiện trạng:** Đã thiết lập `CODING_STANDARDS.md` làm rõ các nguyên tắc kiến trúc và 12 Fowler Code Smells baseline.
- **Bài học kinh nghiệm:** Tuân thủ đúng nguyên lý của Matt Pocock: Agent thi công (Implementation Agent) chịu áp lực context lớn nhất vì phải tìm kiếm, viết mã và debug; trong khi Agent đánh giá (Review Agent) có áp lực context thấp nhất vì chỉ đọc diff. Do đó, việc cưỡng chế các tiêu chuẩn thiết kế sâu nên giao cho Review Agent.
- **Cải tiến đề xuất:** Tiếp tục giữ `CODING_STANDARDS.md` ngắn gọn, tập trung vào các phán đoán thiết kế (judgement calls) mà công cụ tự động không thể thay thế được.

### 4. Steering Files & Quy tắc Hệ thống (AGENTS.md & NOTES.md)
- **Hiện trạng:** File `AGENTS.md` được giữ cực kỳ ngắn gọn (18 dòng), chỉ chứa chỉ thị cốt lõi `- Không đọc thư mục orca` và các con trỏ trỏ tới tài liệu chi tiết. `NOTES.md` chứa quy chuẩn ngôn ngữ và giao diện.
- **Bài học kinh nghiệm:** Giữ steering files ngắn gọn giúp tiết kiệm token budget ở mỗi lượt hội thoại và tránh hiện tượng suy giảm khả năng chú ý (Context Degradation).
- **Cải tiến đề xuất:** Duy trì nguyên tắc không nhồi nhét tài liệu dài vào `AGENTS.md`. Bất kỳ hướng dẫn chi tiết nào đều chuyển thành file tài liệu riêng dưới `docs/` và chỉ để con trỏ định hướng trong `AGENTS.md`.

### 5. Tool Economy (Hiệu quả Sử dụng Công cụ)
- **Hiện trạng:** Hầu hết các thao tác đều sử dụng các công cụ chuyên biệt: `replace_file_content` cho các đoạn sửa nhỏ, `view_file` có giới hạn dòng, và chạy lệnh kiểm thử tập trung.
- **Bài học kinh nghiệm:** Tránh việc đọc toàn bộ file lớn nhiều lần khi chỉ cần kiểm tra một hàm cụ thể. Việc sử dụng slice notation (`StartLine`, `EndLine`) giúp tiết kiệm đáng kể token và tăng tốc độ xử lý.

---

## 2. Mô hình Đúc kết Keep / Drop / Try

| Hành động | Chi tiết Thực tiễn trong Dự án ERP |
| :--- | :--- |
| **KEEP (Tiếp tục phát huy)** | - Thiết kế kiến trúc Deep Modules với interface hẹp và Seams độc lập.<br>- Kiểm thử TDD với In-memory Adapters chạy siêu tốc (< 15ms).<br>- Duy trì quy trình chẩn đoán lỗi có căn cứ (`diagnosing-bugs`) trước khi sửa code.<br>- Đánh giá mã nguồn theo hai trục độc lập Standards vs Spec. |
| **DROP (Loại bỏ triệt để)** | - Tránh mô hình Check-Then-Act với các truy vấn rời rạc trên tầng ứng dụng khi xử lý dữ liệu đồng thời.<br>- Không dùng câu từ cường điệu hóa hoặc ghép song ngữ mở ngoặc đơn rườm rà.<br>- Không viết code trước khi có kịch bản test tái hiện lỗi một cách xác định. |
| **TRY (Thử nghiệm tiếp theo)** | - Tự động hóa bộ quy tắc rà soát sổ cái thông qua một Custom Skill chuyên biệt (`erp-ledger-audit` trong Module 6).<br>- Khám phá sâu nguyên lý thiết kế Prompt và Skill qua `writing-for-agents` (Information Hierarchy, Progressive Disclosure). |
