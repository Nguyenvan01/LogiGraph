# Kỹ năng /git-guardrails-claude-code, /handoff & /loop-me

Nội dung làm chủ nhóm kỹ năng vận hành và an toàn theo phương pháp Matt Pocock:

1. **Kiểm soát an toàn Git với PreToolUse Hook (`/git-guardrails-claude-code`)**:
   - Thấu hiểu cơ chế đánh chặn trước thực thi: Kiểm tra tham số lệnh của công cụ `Bash` trước khi chuyển xuống shell hệ điều hành.
   - Xác định danh mục các lệnh cần kiểm soát: `git push` (bao gồm `--force`), `git reset --hard`, `git clean -f/-fd`, `git checkout .`, `git restore .`, `git branch -D`.
   - Triển khai kịch bản kiểm tra tại `.claude/hooks/block-dangerous-git.sh` và đăng ký trong `.claude/settings.json`.
   - Kiểm thử thực tế xác nhận trả về Exit code 2 kèm thông báo từ chối ra `stderr` đối với lệnh không an toàn, đồng thời cho phép các lệnh đọc (`git status`, `git log`) thực thi bình thường với Exit code 0.

2. **Giao thức Handoff & Kiểm soát Context Degradation (`/handoff`, `/claude-handoff`)**:
   - Phân tích nguyên nhân Context Degradation: Phiên làm việc tích lũy quá nhiều dữ liệu phụ làm phân tán cơ chế attention của mô hình ngôn ngữ lớn, dẫn đến giảm độ chính xác khi suy luận logic.
   - Nắm vững 4 nguyên tắc thiết kế tài liệu Handoff:
     - *No Duplication*: Không sao chép lại mã nguồn hay nội dung đặc tả; chỉ sử dụng relative file paths.
     - *Next Scope*: Nêu rõ ràng mục tiêu kỹ thuật cụ thể mà phiên tiếp theo cần thực thi.
     - *Suggested Skills*: Chỉ định danh sách skill cần gọi để định hình workflow cho agent kế tiếp.
     - *Redaction*: Loại bỏ các thông tin bảo mật như API key, token hoặc dữ liệu cá nhân.
   - Phân biệt `/handoff` (lưu file tài liệu bàn giao trên đĩa) và `/claude-handoff` (chuyển tóm tắt thành prompt kích hoạt background subagent qua `claude --bg --name`).

3. **Phương pháp luận Loop Lens (`/loop-me`)**:
   - Tư duy trừu tượng hóa các quy trình kỹ thuật lặp lại thành Workflow Specs.
   - Nắm vững 3 thành phần: Triggers (ưu tiên Event-driven thay vì Schedule-driven), Checkpoints kết hợp nguyên tắc "Push Right" (trì hoãn sự can thiệp của con người đến bước quyết định cuối cùng), và Decision-ready Brief (trình bày kết quả có cấu trúc kèm liên kết tài liệu, không đưa dữ liệu thô).

4. **Hiện thực hóa trong dự án ERP**:
   - Cài đặt script `.claude/hooks/block-dangerous-git.sh` và cấu hình `.claude/settings.json` kích hoạt PreToolUse hook.
   - Hoàn thành **Module 3: Thi công & Kiến trúc Deep Modules** (10 / 19 bài, đạt 53% lộ trình), sẵn sàng bước vào **Module 4: Capstone (Ship a Real Product)**.
