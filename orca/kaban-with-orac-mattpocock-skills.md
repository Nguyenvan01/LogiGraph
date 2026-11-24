# Hướng dẫn Xây dựng Kanban Dashboard dùng Matt Pocock Skills và Orca

Tài liệu này hướng dẫn từng bước cách phối hợp các AI agent bằng **Orca** và các **skills có sẵn trong `.agents/skills/`** để xây dựng ứng dụng Kanban Dashboard full-stack.

### Cơ chế hoạt động của Skills:
Mỗi skill đã được lập trình sẵn trong file `SKILL.md` tương ứng. Khi bạn gõ lệnh `/tên-skill`, agent sẽ:
1. **Tự đọc quy ước của repo** qua file `AGENTS.md` và `docs/agents/issue-tracker.md`.
2. **Tự biết định dạng và nơi lưu**: Tự biết lưu bản đồ vào `.scratch/`, tự biết sinh spec theo template, tự đặt tên tickets `01-<slug>.md`, tự xác định `Blocked by`.
3. **Tự xử lý theo ngữ cảnh**: Không cần lặp lại trong prompt rằng phải lưu file ở đâu hay tạo những mục nào. Bạn chỉ cần gõ đúng lệnh slash command `/tên-skill` (kèm chủ đề nếu là bước khởi đầu).

---

## 1. Cấu trúc Worktree và Phân chia vai trò

Dự án sử dụng 4 worktree Git:

```text
kanban-dashboard/
├── main                ← Bản cuối cùng (chỉ merge khi xong)
├── agent-claude        ← Claude: Điều phối chính, kiến trúc sư, review
├── agent-codex         ← Codex: Viết Backend (NestJS, Prisma) và viết test (TDD)
└── agent-antigravity   ← Antigravity: Viết Frontend (React, kéo thả thẻ, giao diện)
```

| Worktree / Agent | Vai trò & Trách nhiệm (Ownership) | Cách thức tương tác |
| :--- | :--- | :--- |
| `agent-claude` | **Parent Coordinator & Architect**<br>Quản lý `.scratch/**`, `docs/**`, lập kế hoạch, chia task và review | **Bạn tương tác 100% tại đây** bằng các Slash Commands: `/git-guardrails-claude-code`, `/wayfinder`, `/grill-me`, `/research`, `/prototype`, `/domain-modeling`, `/codebase-design`, `/to-spec`, `/to-tickets`, `/implement-spec`, `/code-review`, `/claude-handoff` |
| `agent-antigravity` | **Frontend Worker**<br>Sở hữu toàn bộ `client/**` (React UI, kéo thả, state) | **Chạy ngầm tự động**: Claude tự dispatch qua Orca (yêu cầu dùng `prototype`, `implement`). Bạn không cần gõ lệnh thủ công. |
| `agent-codex` | **Backend Worker**<br>Sở hữu toàn bộ `server/**` (NestJS, Prisma, PostgreSQL, tests) | **Chạy ngầm tự động**: Claude tự dispatch qua Orca (yêu cầu dùng `tdd`, `implement`). Bạn không cần gõ lệnh thủ công. |
| `main` | **Integration**<br>Bản hoàn chỉnh cuối cùng | Claude merge code vào sau khi review xong ở Bước 10. |

---

## Bước 0 — Kiểm tra Môi trường (Terminal)

Tại thư mục gốc dự án:

```bash
orca status --json
orca worktree list --json
```

Đảm bảo thấy đủ 4 worktree: `main`, `agent-claude`, `agent-codex`, `agent-antigravity`.

Kiểm tra trạng thái git:

```bash
git status
git fetch origin
```

Đảm bảo trạng thái: `nothing to commit, working tree clean`.

---

## Bước 1 — Cài đặt bảo vệ Git (`agent-claude`)

* **Nơi làm việc**: Worktree `agent-claude`.
* **Mở**: Claude Code.

**Lệnh:**

```text
/git-guardrails-claude-code
```

*(Skill sẽ tự động cài hook chặn các lệnh git nguy hiểm như `push`, `reset --hard`, `clean`)*.

---

## Bước 2 — Khảo sát và Lập bản đồ Kế hoạch (`agent-claude`)

* **Nơi làm việc**: Worktree `agent-claude`.
* **Mở**: Claude Code.
* **Mục đích**: Cung cấp mục tiêu dự án, tech stack và phạm vi tính năng để `/wayfinder` khảo sát codebase và tạo bản đồ kế hoạch tại `.scratch/kanban/map.md`.

**Lệnh:**

```text
/wayfinder Khởi tạo dự án Kanban Dashboard full-stack (tương tự GitHub Projects):

1. Cấu trúc project:
- Tách biệt 2 thư mục 'client/' và 'server/', không dùng monorepo tooling (Nx/Turborepo).
- Server (Codex phụ trách 'server/**'): NestJS, TypeScript, PostgreSQL, Prisma ORM, REST API, backend tests.
- Client (Antigravity phụ trách 'client/**'): React, TypeScript, TanStack Query, Zustand, Drag & Drop UI.
- Coordinator (Claude phụ trách): Điều phối, kiến trúc, review code, không trực tiếp code client/server.

2. Tính năng Kanban yêu cầu:
- Quản lý Board: Tạo, xem, đổi tên board.
- Quản lý Cột: Thêm, sửa, xóa cột; kéo thả sắp xếp lại thứ tự cột theo chiều ngang; hỗ trợ WIP limit (giới hạn thẻ).
- Quản lý Thẻ: Thêm, sửa, xóa thẻ; chi tiết thẻ có title, description, tags, priority; kéo thả đổi cột và đổi vị trí thẻ trong cột.
- Kỹ thuật kéo thả: Thuật toán Fractional Indexing (LexoRank) để lưu vị trí; Optimistic updates trên client với cơ chế rollback khi lỗi.
- Giao diện: Responsive, hỗ trợ Light/Dark mode, mượt mà.

Khảo sát codebase hiện tại và ghi nhận mục tiêu, các ràng buộc kỹ thuật và các câu hỏi cần làm rõ vào bản đồ kế hoạch.
```

*(Skill sẽ tự đọc `docs/agents/issue-tracker.md`, tự khảo sát repo và tự tạo file bản đồ `.scratch/kanban/map.md`)*.

---

## Bước 3 — Phỏng vấn làm rõ nghiệp vụ (`agent-claude`)

* **Nơi làm việc**: Worktree `agent-claude`.
* **Mở**: Claude Code.
* **Mục đích**: Chỉ cần chỉ định Claude đọc `.scratch/kanban/map.md` (nơi Bước 2 đã ghi đầy đủ yêu cầu) để tìm các trường hợp biên (edge cases) cần phỏng vấn.

**Lệnh:**

```text
/grill-me Đọc '.scratch/kanban/map.md' và phỏng vấn tôi để làm rõ các trường hợp biên (edge cases) và quyết định còn thiếu.
```

**Gợi ý trả lời nhanh cho bạn khi Claude đưa ra câu hỏi:**
* **Câu 1 (Vị trí)**: Chọn *Fractional Indexing (LexoRank)* — mỗi thẻ có trường `rank: string`. Chèn vào giữa chỉ cần tính chuỗi ở giữa 2 rank cũ, chỉ update 1 record trong database.
* **Câu 2 (Lỗi mạng)**: Chọn *Optimistic update kèm rollback* — UI cập nhật ngay, lưu snapshot state cũ; nếu API lỗi thì restore snapshot và hiện toast thông báo.
* **Câu 3 (WIP limit)**: Chọn *Soft limit* — cột đổi viền đỏ cảnh báo khi vượt số thẻ tối đa nhưng không chặn thao tác thả chuột.
* **Câu 4 (API drop)**: Chỉ gọi API duy nhất tại sự kiện `onDragEnd`. Payload: `{ columnId: string, prevCardId?: string, nextCardId?: string }`. Server tự tính rank mới.

Claude sẽ tổng hợp các quyết định đã chốt vào phần `Decisions so far` trong `.scratch/kanban/map.md` và tạo file thiết kế trong `docs/adr/`.

---

## Bước 4 — Nghiên cứu thư viện kéo thả (`agent-claude`)

* **Nơi làm việc**: Worktree `agent-claude`.
* **Mở**: Claude Code.

**Lệnh:**

```text
/research So sánh các thư viện kéo thả phổ biến cho React (@dnd-kit, @hello-pangea/dnd, pragmatic-drag-and-drop, framer-motion, react-dnd) và các thuật toán sắp xếp Fractional Indexing ('fractional-indexing' vs 'lexorank'). Lưu đánh giá và đề xuất tối ưu vào 'docs/research/drag-and-drop-evaluation.md'.
```

*(Skill sẽ tự dispatch sub-agent tìm hiểu tài liệu và lưu kết quả nghiên cứu vào `docs/research/drag-and-drop-evaluation.md`)*.

---

## Bước 5 — Dựng bản demo kéo thả thử nghiệm với `prototype` (`agent-claude`)

* **Nơi làm việc**: Vẫn ở `agent-claude` (Claude điều phối toàn bộ các bước lập kế hoạch và thử nghiệm).
* **Mở**: Claude Code.
* **Mục đích**: Claude điều phối kích hoạt skill `/prototype` để dựng một bản demo kéo thả UI cô lập tại `client/prototype/` (dùng `@dnd-kit` từ kết quả nghiên cứu ở Bước 4). Bạn không cần chuyển sang agent khác.

**Lệnh:**

```text
/prototype Dựng bản demo giao diện Kanban kéo thả thẻ và cột tại 'client/prototype/' bằng React và '@dnd-kit' để tôi kiểm chứng cảm giác kéo thả.
```

*(Claude sẽ điều phối dựng prototype, sau đó cung cấp hướng dẫn khởi chạy để bạn mở trình duyệt xem thử và nghiệm thu trước khi chốt kiến trúc)*.

---

## Bước 6 — Thiết kế Database và Cấu trúc Module (`agent-claude`)

* **Nơi làm việc**: `agent-claude`.
* **Mở**: Claude Code.

**Lệnh:**

```text
/domain-modeling
```

*(Skill chuẩn hóa từ vựng Board, Column, Card và tạo Prisma schema)*.

Tiếp tục thiết kế logic:

```text
/codebase-design
```

*(Skill thiết kế module ReorderEngine có interface mỏng và thiết kế repository seam để Codex viết unit test không cần kết nối database thật)*.

---

## Bước 7 — Tạo Spec và Phân rã Task Graph (`agent-claude`)

* **Nơi làm việc**: Worktree `agent-claude`.
* **Mở**: Claude Code.

### 7.1. Tạo Đặc tả Kỹ thuật với `/to-spec`

**Lệnh:**

```text
/to-spec
```

* **Cơ chế hoạt động**: Skill `/to-spec` **không hỏi thêm bạn câu nào nữa**. Nó tự động tổng hợp (synthesize) toàn bộ thông tin đã thảo luận từ các bước trước:
  * Mục tiêu & tech stack từ Bước 2 (`wayfinder`).
  * Các quyết định biên (LexoRank, rollback, WIP limit) từ Bước 3 (`grill-me`).
  * Thư viện kéo thả (`@dnd-kit`) từ Bước 4 (`research`).
  * Kết quả thử nghiệm UI từ Bước 5 (`prototype`).
  * Schema Prisma và module `ReorderEngine` từ Bước 6 (`domain-modeling`, `codebase-design`).

* **Kết quả tạo ra**: Tự động sinh file **`.scratch/kanban/spec.md`** gồm 6 phần chuẩn:
  1. **Problem Statement & Solution**: Vấn đề và giải pháp từ góc nhìn người dùng.
  2. **User Stories**: Danh sách đánh số các user stories chi tiết (`As a user, I want... so that...`).
  3. **Implementation Decisions**: REST API contracts (endpoints, req/res format), Prisma schema, interface `ReorderEngine`, state management client.
  4. **Testing Decisions**: Xác định các điểm khớp nối (Seams) để kiểm thử, cam kết viết test cho hành vi bên ngoài thay vì cấu trúc nội bộ.
  5. **Out of Scope**: Những thứ chưa làm (ví dụ: Realtime WebSockets, phân quyền nhiều người dùng).
  6. **Triage Status**: Tự động gán `Status: ready-for-agent`.

### 7.2. Phân rã thành Task Graph

**Lệnh:**

```text
/to-tickets
```

*(Skill tự đọc `spec.md`, tự chia thành các lát cắt dọc độc lập, tự xác định liên kết phụ thuộc `Blocked by:` cho từng task và lưu thành các file `01-...md`, `02-...md` trong `.scratch/kanban/issues/`, sau đó hiển thị để bạn duyệt)*.

Bạn xem danh sách task và gõ `Approve`.

---

## Bước 8 — Thực thi Đồ thị Task qua Orca (`agent-claude`)

* **Nơi làm việc**: Hoàn toàn thực hiện tại `agent-claude`.
* **Mở**: Claude Code.
* **Cơ chế**: Bạn **không cần** chuyển sang `agent-codex` hay `agent-antigravity` để gõ lệnh. Claude đóng vai trò Parent Coordinator sẽ tự động đọc đồ thị task, tự tạo Orca run và tự dispatch công việc kèm chỉ định skill (`/tdd`, `/implement`) cho từng worker chạy ngầm.

**Lệnh kích hoạt điều phối trên Claude Code:**

```text
/implement-spec
Duyệt đồ thị task. Hãy bắt đầu điều phối triển khai bằng Orca Multi-Agent:
1. Tạo Orca run với objective: "Build Kanban Dashboard full-stack".
2. Quản lý hàng đợi Frontier dựa trên các tickets trong '.scratch/kanban/issues/'.
3. Tự động dispatch các ticket sẵn sàng ở Frontier cho đúng agent:
   - Task server/**: Dispatch tới worktree 'agent-codex' (yêu cầu Codex dùng skill /tdd nếu là logic thuật toán Reorder, hoặc /implement nếu là API).
   - Task client/**: Dispatch tới worktree 'agent-antigravity' (yêu cầu Antigravity dùng skill /implement ghép UI và optimistic updates).
4. Giám sát các sự kiện 'worker_done' qua Orca, đánh dấu resolved và tiếp tục mở khóa các ticket tiếp theo trong Frontier cho đến khi hoàn thành toàn bộ đồ thị task.
```

---

### Bạn làm gì trong lúc các Agent thi công?

1. **Quan sát trực quan trên Sidebar của Orca**:
   * `agent-antigravity` ➔ Antigravity đang tự động code giao diện và state.
   * `agent-codex` ➔ Codex đang tự động viết test (TDD) và code API.
   * `agent-claude` ➔ Claude đang giám sát, điều phối và tích hợp.

2. **Xử lý Escalation (nếu có)**:
   * Nếu một worker gặp vướng mắc và gửi câu hỏi (`question` hoặc `escalation`), Claude sẽ tự giải quyết theo spec hoặc hỏi bạn ngay trong cửa sổ chat `agent-claude`. Bạn chỉ việc trả lời Claude.
   * Bạn hoàn toàn không phải mở terminal hay gõ lệnh vào các agent con.

---

## Bước 9 — Review Code (`agent-claude`)

Khi tất cả tickets đã hoàn thành, mở Claude Code tại `agent-claude`:

**Lệnh:**

```text
/code-review
```

*(Skill tự động chạy 2 luồng review độc lập: Trục 1 kiểm tra chất lượng code/TypeScript/TDD, Trục 2 đối chiếu xem đã đáp ứng 100% User Stories và API Contracts trong `spec.md` chưa)*.

*(Nếu có lỗi phát sinh cần điều tra nguyên nhân gốc rễ: gõ `/diagnosing-bugs`)*.

---

## Bước 10 — Bàn giao và Merge Code (`agent-claude`)

Khi code review đã đạt:

**Lệnh:**

```text
/claude-handoff
```

*(Skill tự động tổng kết tính năng, đóng toàn bộ tickets trong `.scratch/kanban/issues/` và hướng dẫn merge)*.

Tại terminal:

```bash
git checkout main
git merge agent-claude --no-ff -m "feat: complete kanban dashboard via matt pocock skills"
```

---