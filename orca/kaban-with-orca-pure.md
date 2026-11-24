## Kaban Dasboard

Dự án làm thuần với orca không dùng skills

```text
kanban-dashboard
├── main                ← integration / bản cuối
├── agent-claude        ← Claude = Parent/Coordinator
├── agent-codex         ← Codex = Backend + Tester
└── agent-antigravity   ← Antigravity = UX/UI + Frontend
```


Khác biệt là **4 role không bắt buộc phải là 4 worktree**. Với cấu hình của bạn:

```text
Claude
└── Coordinator

Antigravity
├── UX/UI
└── Frontend

Codex
├── Backend
└── Tester
```

Hai role trên cùng agent sẽ chạy **theo wave**, nên vẫn là multi-agent orchestration.


# Bước 0 — Kiểm tra trước khi bắt đầu

Ở terminal `main` trong ảnh của bạn, chạy:

```bash
orca status --json
```

sau đó:

```bash
orca worktree list --json
```

Bạn cần nhìn thấy bốn worktree:

```text
main
agent-claude
agent-codex
agent-antigravity
```

**Hãy giữ output của `worktree list`**, vì Orca trả về ID chính xác dạng:

```text
<repoId>::<worktreePath>
```

Khi orchestration nhắm tới một worktree cụ thể, dùng ID đầy đủ sẽ an toàn hơn việc đoán path. Orca docs cũng khuyên copy nguyên worktree ID thay vì chỉ lấy repo ID. :chatgpt-content-reference{index="2"}

# Bước 1 — Kiểm tra Git sạch

Trong từng worktree chạy:

```bash
git status
```

Bạn muốn cả ba ở trạng thái:

```text
nothing to commit, working tree clean
```

Ban đầu branch của bạn đang là:

```text
main

agent-claude
agent-codex
agent-antigravity
```

Cấu trúc này giữ nguyên. Demo này **không tạo thêm worktree** và cũng không bắt bạn tạo feature worktree.

Trước khi bắt đầu, sync các agent với `main`:

```bash
git fetch origin
```


# Bước 2 — Claude trở thành Parent Agent

Click:

```text
agent-claude
```

Mở Claude Code.

Ở lần đầu tiên, **chưa cho Claude spawn bất kỳ worker nào**.

Paste prompt này:

```
Bạn là Claude Coordinator cho dự án kanban-dashboard.

Mục tiêu:
Xây dựng Kanban Board full-stack tương tự GitHub Projects.

Cấu trúc project:

kanban-dashboard/
├── client/
├── server/
├── docs/
├── implementation_plan.md
└── task.md

Không dùng monorepo tooling như Nx/Turborepo/workspace.

Stack:

Server:
- NestJS
- TypeScript
- PostgreSQL
- Prisma

Client:
- React.js
- TypeScript
- TanStack
- Zustand

Lưu ý:
"TanStack" chưa chốt package cụ thể.
Hãy đề xuất package nào thực sự cần và giải thích trong plan,
không tự động dùng toàn bộ TanStack ecosystem.

Multi-agent roles:

Claude:
- Coordinator / Architect / Reviewer
- lập kế hoạch
- chia task
- quản lý dependency
- orchestration
- review/integration
- không implement toàn bộ project

Codex:
- ownership: server/**
- NestJS
- Prisma/PostgreSQL
- REST API
- backend tests
- sau này có thể làm Tester

Antigravity:
- ownership: client/**
- UX/UI
- React frontend
- TanStack/Zustand
- API integration
- drag/drop Kanban UI

Kanban cần tối thiểu:
- Board
- Columns
- Tasks
- CRUD columns/tasks
- move task giữa columns
- reorder tasks
- reorder columns
- persistence bằng PostgreSQL
- responsive UI
- light/dark mode

Ở bước này CHỈ PLANNING.

Hãy:
1. Khảo sát repository hiện tại.
2. Thiết kế architecture client/server.
3. Thiết kế Prisma data model.
4. Thiết kế REST API contract.
5. Thiết kế strategy cho ordering/reordering và drag/drop.
6. Phân chia ownership và dependency giữa agents.
7. Thiết kế các Orca orchestration waves.
8. Đề xuất testing strategy.
9. Xác định các Open Decisions cần tôi duyệt.

Tạo:
- implementation_plan.md
- task.md

implementation_plan.md cần đủ để Codex và Antigravity có thể implement
mà không phải tự đoán interface của nhau.

task.md dùng checklist theo:
- Planning
- UX/UI
- Server
- Client
- Testing
- Integration
- Documentation

Nếu requirement nào chưa rõ và có thể làm thay đổi architecture đáng kể,
đừng tự giả định. Đưa nó vào Open Decisions.

KHÔNG:
- implement client
- implement server
- chạy Orca orchestration
- spawn Codex
- spawn Antigravity
- tạo walkthrough.md

Sau khi tạo plan, hãy tóm tắt:
- architecture chính
- agent ownership
- orchestration waves
- Open Decisions

Sau đó DỪNG và chờ tôi approve.
```

# Bước 3 — Kiểm tra Plan

Claude nên tạo khoảng:

```text
kanban-dashboard/
├── implementation_plan.md
├── task.md
└── README.md
```

Trong `implementation_plan.md`, ít nhất nên thấy kiến trúc dự kiến:

```text
kanban-dashboard/
│
├── client/                  ← Antigravity ownership
│   ├── package.json
│   ├── src/
│   └── ...
│
├── server/                  ← Codex ownership
│   ├── package.json
│   ├── prisma/
│   ├── src/
│   └── ...
│
├── docs/
│   ├── api.md
│   └── design.md
│
├── implementation_plan.md   ← Claude
├── task.md                  ← Claude
└── README.md
```

Quan trọng hơn tên file là **API contract phải được chốt trước**.

Phân chia này đặc biệt phù hợp với multi-agent vì ownership gần như tách tự nhiên:

```text
Codex
└── server/**

Antigravity
└── client/**

Claude
└── planning + contracts + orchestration
```


# Bước 4 — Approve Plan

Prompt approve ngắn gọn (chỉ thực hiện ở `agent-claude`):

```text
Approve plan.

Bây giờ hãy triển khai theo implementation_plan.md bằng Orca Multi-Agent Orchestration.

Bạn là Coordinator, không phải implementation agent chính.

Phân công:
- Codex → server/**, backend tests, QA khi phù hợp
- Antigravity → client/**, UX/UI, frontend
- Claude → orchestration, dependency management, review và integration

Yêu cầu:
- dùng các worktree hiện có:
  - agent-claude
  - agent-codex
  - agent-antigravity
- không tạo worktree mới
- dùng Orca orchestration thực sự, không chỉ gửi prompt thủ công
- chạy các task độc lập song song khi có thể
- theo dõi worker_done / question / escalation
- task có dependency thì chỉ dispatch khi dependency đã hoàn tất
- nếu worker phát hiện vấn đề ngoài ownership, route về đúng agent
- Claude không tự implement client/server trừ thay đổi integration nhỏ

Bắt đầu orchestration theo các waves trong implementation_plan.md.
```

Đây là lúc **multi-agent thực sự bắt đầu**.

---

# Bước 5 — Claude tạo Orca Run

Về cơ chế, Claude coordinator nên thực hiện tương đương:

```bash
orca status --json
```

sau đó:

```bash
orca orchestration run-create \
  --objective "Build and validate the Kanban Board full-stack demo" \
  --json
```

`Run` là namespace lâu dài cho coordinator và các task của chiến dịch. `Task` là công việc; mỗi `Dispatch` là một attempt cụ thể của worker.

Bạn không nhất thiết phải tự gõ những lệnh này nếu Claude đang điều phối đúng.

# Bước 6 — Theo dõi ngay trong Orca

Bây giờ sidebar của bạn sẽ trở nên hữu ích.

Bạn có thể quan sát:

```text
agent-antigravity
└── Antigravity đang làm Design

agent-codex
└── Codex đang làm Backend

agent-claude
└── Claude đang chờ/giám sát
```

Ngoài UI, coordinator có thể chờ:

```bash
orca orchestration check \
  --wait \
  --types "worker_done,escalation,question" \
  --timeout-ms 900000 \
  --json
```

Worker có thể:

```text
question
escalation
worker_done
```

gửi về coordinator. Khi worker đặt câu hỏi, coordinator có thể reply trực tiếp. Đây chính là khác biệt giữa ba terminal độc lập và **orchestrated multi-agent**. 