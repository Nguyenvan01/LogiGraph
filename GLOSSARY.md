# Bảng Thuật ngữ (Glossary) — Matt Pocock Skills & VibeCoding ERP

Bộ thuật ngữ chuẩn mực được dùng xuyên suốt toàn bộ các bài học, tài liệu và mã nguồn dự án. Không thay thế bằng các từ đồng nghĩa mơ hồ.

## Thuật ngữ Kỹ nghệ Agent (Agentic Engineering)

- **Context Load (Tải trọng Ngữ cảnh)**: Chi phí token mà Agent phải mang theo ở mỗi lượt trao đổi (system prompt, rule, mô tả của skill). Khi context quá lớn, mô hình dễ gặp hiện tượng Context Degradation (phản hồi kém chính xác).
- **Cognitive Load (Tải trọng Nhận thức)**: Khối lượng thông tin con người phải ghi nhớ (ví dụ: nhớ tên các câu lệnh slash command, nhớ danh sách các skill).
- **Model-invoked Skill**: Skill mà Agent có thể tự phát hiện và kích hoạt dựa vào `description`.
- **User-invoked Skill**: Skill chỉ kích hoạt khi con người chủ động gõ lệnh (`disable-model-invocation: true`), không tốn token thường trực của Agent (Zero Context Load).
- **Information Hierarchy (Cấu trúc thông tin phân tầng)**: Thang phân tầng thông tin: *In-file steps* (thao tác trực tiếp) → *In-file reference* (quy tắc tra cứu nội bộ) → *Disclosed reference* (tài liệu chuyên sâu chỉ tải khi rẽ nhánh).
- **Progressive Disclosure (Tải tài liệu theo nhu cầu)**: Kỹ thuật chỉ nạp tài liệu chi tiết vào context khi thực sự cần đến.
- **Leading Words (Từ khóa gợi mở)**: Những từ ngữ ngắn gọn quen thuộc trong dữ liệu tiền huấn luyện của LLM (*tight, red, fog of war, tracer bullets, relentless*) giúp định hướng hành vi của mô hình với số lượng token tối thiểu.
- **Completion Criteria (Tiêu chí hoàn thành)**: Điều kiện rõ ràng để Agent biết khi nào một bước công việc đã hoàn tất, đảm bảo tính kiểm chứng được.
- **Design Tree (Cây Quyết định)**: Mô hình thể hiện cấu trúc thiết kế, trong đó mỗi quyết định lớn rẽ nhánh thành các quyết định kỹ thuật phụ thuộc.
- **The Frontier (Tập câu hỏi sẵn sàng)**: Tập hợp các câu hỏi hoặc quyết định đã có đủ thông tin tiền đề để giải quyết ngay.
- **Shared Map (Bản đồ kế hoạch chung)**: File tài liệu ghi nhận mục tiêu, các quyết định đã chốt và danh sách ticket cần làm giữa lập trình viên và AI trong dự án lớn.
- **Fog of War / Not yet specified (Phần việc chưa xác định chi tiết)**: Các hạng mục thuộc phạm vi dự án nhưng chưa thể chia nhỏ thành ticket cụ thể vì còn phụ thuộc vào các quyết định kỹ thuật đi trước.
- **AFK vs HITL**: Phân loại chế độ làm việc: *AFK (Away From Keyboard)* — Agent tự chạy ở chế độ nền (ví dụ: Sub-agent tra cứu tài liệu); *HITL (Human in the Loop)* — Tác vụ cần sự tham gia của con người để ra quyết định (ví dụ: Grilling, kiểm tra Prototype).

## Thuật ngữ Kiến trúc Phần mềm (Software Architecture)

- **Module**: Bất kỳ đơn vị code nào có một Interface và một Implementation (quy mô bất kỳ: function, class, package, service slice).
- **Interface**: Toàn bộ những gì caller cần biết để sử dụng module đúng cách: signature, types, invariants, thứ tự gọi, error modes, cấu hình.
- **Implementation**: Phần thân code bên trong module, bị ẩn giấu hoàn toàn sau interface.
- **Depth (Độ sâu)**: Tỷ lệ giữa năng lực cung cấp và độ phức tạp của Interface (*Leverage*). Module **Deep** có interface nhỏ nhưng làm được việc lớn; module **Shallow** có interface to cồng kềnh nhưng ruột rỗng tuếch.
- **Seam (Điểm may)**: Vị trí mà tại đó bạn có thể thay đổi hành vi hoặc mock test mà không cần sửa đổi mã nguồn ở vị trí đó (Michael Feathers).
- **Adapter**: Đối tượng cụ thể thỏa mãn Interface tại một Seam (ví dụ: `InMemoryInventoryAdapter` vs `SupabaseInventoryAdapter`).

## Thuật ngữ Nghiệp vụ ERP (Domain Modeling)

- **SKU (Stock Keeping Unit)**: Mã định danh duy nhất cho một mặt hàng trong kho.
- **Stock Reservation (Giữ hàng tồn)**: Tạm giữ số lượng hàng khi khách đặt đơn, có timeout tự động hủy nếu không thanh toán, chống bán vượt tồn kho (overselling).
- **Double-Entry Bookkeeping (Kế toán kép)**: Mỗi giao dịch kinh tế luôn được ghi nhận vào ít nhất 2 tài khoản: một bên Ghi Nợ (Debit) và một bên Ghi Có (Credit) sao cho Tổng Nợ = Tổng Có.
