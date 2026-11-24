# Setup 

## Ngay từ màn hình hiện tại, hãy làm theo thứ tự này

```text
Bước 1
main (primary)
→ giữ nguyên

Bước 2: Tạo worktree cho Claude
→ Name: agent-claude
→ Create From: origin/main
→ Agent: Claude Code

Bước 3: Tạo worktree cho Codex
→ Name: agent-codex
→ Create From: origin/main
→ Agent: Codex

Bước 4: Tạo worktree cho Antigravity
→ Name: agent-antigravity
→ Create From: origin/main
→ Agent: Antigravity
```

Sau đó sidebar nên thành:

```text
kanban-dashboard
│
├── main                [primary]
├── agent-claude        [Claude]
├── agent-codex         [Codex]
└── agent-antigravity   [Antigravity]
```

**Đừng tạo branch `claude`, `codex`, `antigravity` cố định để chứa mọi thay đổi.** Hãy cố định **worktree theo agent**, còn bên trong mỗi worktree đổi sang `task/...` branch tương ứng với công việc hiện tại. Đây là phần giúp mô hình của bạn dùng được lâu dài cho nhiều feature mà vẫn giữ Git sạch.

## Cài đặt và Xác thực Subscription từng Agent

Trong dialog Orca, giữ `Create more: OFF` để tạo và kiểm tra từng agent tuần tự.

### 1. Claude Code (`agent-claude`)
- **Cài đặt (Ubuntu)**: https://code.claude.com/docs/en/quickstart
  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  ```
- **Đăng nhập Subscription (Claude Pro / Team)**:
  ```bash
  claude auth login --claudeai
  ```
- **Kiểm tra**: Mở worktree `agent-claude`, chạy `claude` kiểm tra session.

### 2. Codex CLI (`agent-codex`)
- **Cài đặt (Ubuntu)**: https://learn.chatgpt.com/docs/codex/cli#getting-started
  ```bash
  curl -fsSL https://chatgpt.com/codex/install.sh | sh
  ```
  *(hoặc cài qua npm nếu máy có sẵn Node.js: `npm install -g @openai/codex`)*
- **Đăng nhập Subscription (ChatGPT Plus / Pro / Team)**:
  ```bash
  codex login               # Mở trình duyệt OAuth
  codex login --device-auth # Nếu chạy qua SSH / server headless
  ```
- **Kiểm tra**: Chạy `codex login status` (kết quả: `Logged in using ChatGPT`).

### 3. Antigravity (`agent-antigravity`)
- **Cài đặt (Ubuntu)**: https://antigravity.google/download
```bash
curl -fsSL https://antigravity.google/install.sh | bash
```
- **Đăng nhập Subscription**:
  ```bash
  agy auth login
  ```
  *(hoặc bấm icon **Accounts** góc dưới trái IDE để đăng nhập Google Account)*
- **Kiểm tra**: Mở thư mục `agent-antigravity` và xác nhận agent nhận diện đúng workspace.

## Claude làm Coordinator

Với trạng thái hiện tại của bạn, mình sẽ giữ nguyên 3 worktree cố định:

```
kanban-dashboard
├── main                ← integration / bản cuối
├── agent-claude        ← Claude = Parent/Coordinator
├── agent-codex         ← Codex = Backend + Tester
└── agent-antigravity   ← Antigravity = UX/UI + Frontend
```

thì có thể phân vai:

```text
                    agent-claude
                Claude Coordinator
                         │
              phân tích + chia task
                         │
          ┌──────────────┼───────────────┐
          ▼              ▼               ▼
     Backend task    Frontend task    Review/Test
          │              │               │
          ▼              ▼               ▼
   agent-codex    agent-antigravity   Claude/Codex
       Codex         Antigravity        worker
          │              │               │
          └──────────────┼───────────────┘
                         ▼
                  worker_done
                         │
                         ▼
                  Claude review
                         │
                         ▼
                 integrate (main)
```

Đó đã là **multi-agent orchestration**, không còn chỉ là 3 terminal độc lập.

## Orca cũng có thể spawn worker tự động

Thay vì tạo thủ công 3 worktree cố định, tầng **Orca Orchestration** cho phép tự động cấp phát (spawn) worker vào một worktree tạm thời (`new-child`) theo từng task và tự thu hồi sau khi hoàn tất.

### 1. Luồng lệnh cơ bản

```bash
# 1. Tạo Run (Namespace & Coordinator inbox)
orca orchestration run-create --objective "Tối ưu hóa và viết test Auth"

# 2. Tạo Task kèm Technical Spec
orca orchestration task-create --spec "Viết integration test cho /api/login"

# 3. Spawn Worker tự động (Tự tạo worktree mới + mở agent)
orca orchestration worker-start --task <task_id> --worktree new-child --agent codex
```

### 2. Vòng lặp Supervised Worker Loop

```text
Run Create ──► Task Create ──► Worker Start (worktree new-child)
                                         │
                                   Agent thực thi
                                         │
                                         ▼
main ◄─── Claude Review/Merge ◄─── worker_done (Báo cáo diff)
   │
Orca dọn dẹp worktree tạm
```

### 3. Đánh đổi: Cố định vs Tự động spawn

| Tiêu chí | 3 Worktree cố định (Khuyên dùng trước) | Dynamic Spawn (Orca Orchestration) |
| :--- | :--- | :--- |
| **Cách dùng** | Dùng tay switch branch theo task | Orca CLI tự sinh worktree con |
| **Ưu điểm** | Giữ context/session agent lâu, ổn định | Chạy song song nhiều task lớn, tự dọn dẹp |
| **Nhược điểm** | Cần tự quản lý branch thủ công | Tốn tài nguyên khởi động lại agent cho mỗi task |

> **Khuyến nghị**: Ban đầu hãy vận hành thuần thục mô hình **3 worktree cố định** (Claude, Codex, Antigravity). Khi khối lượng task phân mảnh tăng cao mới chuyển sang cơ chế auto-spawn của Orca.