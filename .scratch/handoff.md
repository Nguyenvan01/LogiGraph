# Handoff: Master 38 Skills Matt Pocock & Xây dựng VibeCoding ERP Mini

## 1. Mục tiêu & Bối cảnh Dự án (Mission & Context)
- **Mục tiêu chính**: Dẫn dắt người học làm chủ toàn diện 38 kỹ năng Agentic Engineering của Matt Pocock (`mattpocock/skills`) nguyên bản từ `skills-lock.json`, không lai tạp.
- **Dự án thực tế song song**: `VibeCoding ERP Mini` phát triển bằng **Next.js 15 (App Router) + Supabase (PostgreSQL) + Vitest**. Mỗi bài học đóng góp một mẩu artifact hoặc code chạy thật vào sản phẩm này.
- **Tài liệu nền tảng đã thiết lập trong repo**:
  - `MISSION.md`: Sứ mệnh học tập và dự án thực tế song song.
  - `RESOURCES.md`: Danh mục tài liệu kỹ thuật chuẩn mực (Matt Pocock repo, John Ousterhout, Michael Feathers, Supabase, Next.js).
  - `GLOSSARY.md`: Bảng thuật ngữ chuẩn mực về Kỹ nghệ Agent, Kiến trúc phần mềm và ERP.
  - `NOTES.md`: Quy chuẩn phong cách ngôn ngữ, giao diện và lưu ý của người học.
  - `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/triage-labels.md`: Cấu hình hệ thống kỹ thuật cho Agent skills theo chuẩn Matt Pocock.
  - `AGENTS.md`: Chứa chỉ thị hệ thống (Lưu ý: BẮT BUỘC giữ nguyên chỉ thị `- Không đọc thư mục orca`).

---

## 2. BẢNG CHI TIẾT TỔNG THỂ 28 BÀI HỌC VÀ 7 MODULES (Single Source of Truth)

Toàn bộ 28 bài học đơn nhiệm (Bài 00 đến Bài 27) đã được biên soạn và triển khai 100% hoàn chỉnh, bao phủ trọn vẹn 38 skills của Matt Pocock:

### MODULE 0: KHỞI TẠO MÔI TRƯỜNG DỰ ÁN NEXT.JS + SUPABASE (1 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **00** | Dựng khung Next.js 15 App Router, Supabase Client & Vitest Sanity Check | `/ask-matt`, `/setup-pre-commit`, `/wizard` | Khởi tạo repo Next.js + TS, cấu hình Vitest, kết nối Supabase, Husky pre-commit hook và Sanity Check test. | **Đã hoàn thành** (`lessons/0000-setup-nextjs-supabase-erp.html`) |

### MODULE 1: KHÁM PHÁ & ĐỊNH HÌNH NGHIỆP VỤ ERP (DISCOVERY & PLANNING) (3 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Stress-test Yêu Cầu Nghiệp Vụ & Loại Bỏ Silent Assumptions | `/grill-me`, `/grilling`, `/wait-what`, `/to-questionnaire` | Tài liệu nghiệp vụ Kho: Quy tắc trừ kho, Stock Reservation with 15-min TTL (`docs/inventory-requirements.md`). | **Đã hoàn thành** (`lessons/0001-grilling-inventory-requirements.html`) |
| **02** | Định Vị Codebase & Thu Thập Tri Thức Độc Lập Bằng Subagents | `/wayfinder`, `/research` | Bản đồ dự án `docs/wayfinder-erp-map.md`, Decision Tickets (HITL/AFK) & tài liệu chuẩn mực hạch toán kép `docs/research/double-entry-bookkeeping.md`. | **Đã hoàn thành** (`lessons/0002-wayfinder-and-research.html`) |
| **03** | Xây Dựng Prototype Độc Lập Để Kiểm Chứng State Machine Đơn Hàng | `/prototype` | File prototype độc lập kiểm chứng luồng chuyển trạng thái Đơn hàng (`prototypes/order-lifecycle-prototype.html`). | **Đã hoàn thành** (`lessons/0003-prototype-order-state-machine.html`) |

### MODULE 2: MÔ HÌNH HÓA DOMAIN & LẬP ĐẶC TẢ KỸ THUẬT (MODELING & SPECIFICATION) (3 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **04** | Mô Hình Hóa Domain Với Ubiquitous Language & Database Schema | `/domain-modeling` | File `CONTEXT.md` định nghĩa Ubiquitous Language + Migration SQL Supabase (`supabase/migrations/20260928000001_init_inventory_and_orders.sql`). | **Đã hoàn thành** (`lessons/0004-domain-modeling-and-database-schema.html`) |
| **05** | Lập Đặc Tả Kỹ Thuật Chi Tiết Cho Module Kho & Đơn Hàng | `/to-spec` | File `specs/inventory-and-order.md` chi tiết User Stories, Seams cần test, Implementation Decisions. | **Đã hoàn thành** (`lessons/0005-to-spec-technical-specification.html`) |
| **06** | Phân Rã Tracer-Bullet Tickets & Thiết Lập Dependency Graph | `/to-tickets`, `/triage` | Danh sách tickets trong `.scratch/inventory-and-order/issues/` đánh số 01 -> N có quan hệ blocking sẵn sàng cho Agent gắp việc (Frontier). | **Đã hoàn thành** (`lessons/0006-to-tickets-tracer-bullets.html`) |

### MODULE 3: KIẾN TRÚC & THI CÔNG DEEP MODULES (ARCHITECTURE & EXECUTION) (6 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **07** | Thiết Kế Deep Modules & Đường Biên Seams Cho Inventory Core | `/codebase-design` | Thiết kế `InventoryService`: Interface nhỏ 3 hàm, cắm 2 Adapters (In-memory & Supabase). | **Đã hoàn thành** (`lessons/0007-codebase-design-deep-modules.html`) |
| **08** | Đo Đạc Churn, Phản Biện & Cải Tiến Kiến Trúc Hệ Thống | `/improve-codebase-architecture` | Kịch bản đo lường Churn Rate, Deletion Test, Visual Architecture Report và Grilling Loop. | **Đã hoàn thành** (`lessons/0008-improve-codebase-architecture.html`) |
| **09** | Lập Kế Hoạch Thi Công Task Graph DAG & Điều Phối Worktrees | `/implement-spec` | Bản đồ Task Graph DAG đa tầng, Frontier set không xung đột, quy trình tạo Git Worktrees song song. | **Đã hoàn thành** (`lessons/0009-implement-spec-task-graph.html`) |
| **10** | Thi Công Core Logic Bằng TDD Red-Green-Refactor & Shoehorn | `/implement`, `/tdd`, `/migrate-to-shoehorn` | Source code `src/modules/inventory/*`, bộ Unit Tests Vitest 16 tests, refactor với `@total-typescript/shoehorn`. | **Đã hoàn thành** (`lessons/0010-implement-and-tdd-inventory.html`) |
| **11** | Thiết Lập PreToolUse Hook Chặn Lệnh Phá Hoại Trên Git | `/git-guardrails-claude-code` | Script `.claude/hooks/block-dangerous-git.sh` chặn `git push/reset --hard/clean -fd`, trả exit code 1. | **Đã hoàn thành** (`lessons/0011-git-guardrails-claude-code.html`) |
| **12** | Quản Lý Context, Tự Động Hóa Vòng Lặp & Bàn Giao Session | `/handoff`, `/claude-handoff`, `/loop-me` | Template `docs/context-session.md`, kỹ thuật Push Right, Decision Brief và script `/loop-me`. | **Đã hoàn thành** (`lessons/0012-context-management-and-handoff.html`) |

### MODULE 4: DỰ ÁN THỰC CHIẾN CAPSTONE — KẾ TOÁN KÉP ERP MINI (CAPSTONE FULL-STACK ERP) (6 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **13** | Chặng 1: Khám Phá & Phản Biện Nguyên Lý Kế Toán Kép | `/grill-with-docs` | Câu chuyện tiệm bánh, bẫy `balance += 100k`, nguyên lý Nợ/Có (Debit/Credit), phương trình kế toán bất biến. | **Đã hoàn thành** (`lessons/0013-grill-with-docs-double-entry-accounting.html`) |
| **14** | Chặng 2: Cấu Trúc Dự Án, Thiết Kế Seams & Lập Spec Kế Toán | `/codebase-design`, `/domain-modeling`, `/to-spec`, `/to-tickets` | Thư mục `src/modules/ledger/domain` & `adapters`, Seam `ILedgerRepository`, CONTEXT.md, ADR-0002, spec & 4 tickets. | **Đã hoàn thành** (`lessons/0014-setup-project-ledger-spec.html`) |
| **15** | Chặng 3: Áp Dụng TDD Xây Dựng Ledger Core Service | `/tdd`, `/migrate-to-shoehorn` | Bắt đầu từ file trắng trơn, Red-Green, né bẫy số thực JS, 11 tests pass trong 17ms (`src/modules/ledger/`). | **Đã hoàn thành** (`lessons/0015-tdd-ledger-core-service.html`) |
| **16** | Chặng 4: Tích Hợp Next.js Server Actions, Zod & Supabase RLS | `/implement`, `/codebase-design` | Thư mục `src/actions/`, chỉ thị `'use server'`, Zod safeParse guard, Supabase RLS Append-only. | **Đã hoàn thành** (`lessons/0016-server-actions-zod-supabase.html`) |
| **17** | Chặng 5: Hoàn Thiện Web Dashboard Trực Quan Hóa ERP Thời Gian Thực | `/prototype`, `/codebase-design` | Giao diện `dashboard/index.html` với 4 panels phản ánh state theo thời gian thực (KPI, Kho, Đơn, Sổ cái). | **Đã hoàn thành** (`lessons/0017-web-dashboard-realtime-erp.html`) |
| **18** | Chặng 6: Ra Sản Phẩm Thực Tế & Kiểm Thử Toàn Diện E2E Trial Balance | Full-stack E2E Verification & Trial Balance | Mở trình duyệt, tự tay bấm 4 nút hành động Đặt -> Thanh toán -> Xuất kho -> Hoàn tiền, kiểm tra Trial Balance cân bằng 100%. | **Đã hoàn thành** (`lessons/0018-end-to-end-verification-and-trial-balance.html`) |

### MODULE 5: KIỂM THỬ, KHẮC PHỤC LỖI & HOÀN THIỆN SẢN PHẨM (DEBUG, REVIEW & SHIP) (3 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **19** | Chẩn Đoán Lỗi Bất Đồng Bộ & Xử Lý Concurrency Trên Supabase | `/diagnosing-bugs` | Migration Stored Procedure `reserve_stock_atomic` (`SELECT FOR UPDATE`), adapter RPC, bộ test Vitest 4 tests tái hiện & giải quyết triệt để race condition. | **Đã hoàn thành** (`lessons/0019-diagnosing-bugs-concurrency-supabase.html`) |
| **20** | Review Code 2 Trục Standards/Spec & Giải Quyết Xung Đột Git | `/code-review`, `/resolving-merge-conflicts` | Quy chuẩn `CODING_STANDARDS.md`, Báo cáo Review 2 trục v1.0 và Three-way Merge conflict resolution. | **Đã hoàn thành** (`lessons/0020-code-review-and-merge-conflicts.html`) |
| **21** | Đóng Gói Pull Request Chuẩn Mực & Đúc Kết Retrospective | `/pr`, `/retro` | PR body Release v1.0 (`docs/release-v1.0-pr.md`), tài liệu `CHANGELOG.md` và Retrospective đúc kết (`docs/retrospective-v1.0.md`). | **Đã hoàn thành** (`lessons/0021-pr-and-retrospective.html`) |

### MODULE 6: KỸ NGHỆ TÁC NHÂN & SƯ PHẠM TRÍ TUỆ NHÂN TẠO (META-SKILLS & AGENTIC ENGINEERING) (6 bài)
| Bài | Tên bài & Trọng tâm | Skills Matt Pocock | Sản phẩm thật đóng góp vào ERP | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **22** | Nguyên Lý Information Hierarchy & Tối Ưu Hóa Token Context Cho Agent | `/writing-for-agents` | Khung phân tích The Two Loads (Execution load vs Context load), Progressive Disclosure, Context Pointers, Leading Words & Pruning. | **Đã hoàn thành** (`lessons/0022-writing-for-agents.html`) |
| **23** | Thu Thập Raw Noticings Bằng Kỹ Thuật Fragments | `/writing-fragments` | Nguyên lý Pure Explore, Novelist's Diary, kỹ thuật ghi chép raw fragments và trích xuất Leading Words. | **Đã hoàn thành** (`lessons/0023-writing-fragments-raw-explore.html`) |
| **24** | Xây Dựng Beats Journey & Neo Khái Niệm | `/writing-beats` | Nguyên lý Pure Exploit 1, Concept Grounding, cấu trúc Choose-your-own-adventure beat-by-beat. | **Đã hoàn thành** (`lessons/0024-writing-beats-journey-grounding.html`) |
| **25** | Đúc Kết Văn Phong Chuyên Gia & Tạo Lập Artifact Hoàn Chỉnh | `/writing-shape` | Nguyên lý Pure Exploit 2, Grilling session inverted, 5 Format arguments (Spec, ADR, README, RFC, Guide). | **Đã hoàn thành** (`lessons/0025-writing-shape-expert-prose.html`) |
| **26** | Sư Phạm AI & Thiết Kế Stateful Workspace | `/teach` | Tam giác học sâu (Concrete -> Abstract -> Applied), Stateful Workspace, Zone of Proximal Development. | **Đã hoàn thành** (`lessons/0026-teach-ai-pedagogy-workspace.html`) |
| **27** | Tự Động Hóa Bộ Bài Tập Thực Hành & Tổng Kết Lộ Trình 38 Skills | `/scaffold-exercises` | Cấu trúc Problem/Solution/Explainer, Plan-to-Scaffold, Linter, Bảng tổng kết trọn vẹn 38 skills của Matt Pocock. | **Đã hoàn thành** (`lessons/0027-scaffold-exercises-automation.html`) |

---

## 3. Thống kê & Kiểm thử (Verification Stats)
- **Tổng số bài học**: 28 bài học đơn nhiệm (Bài 00 &rarr; Bài 27).
- **Tổng số skills Matt Pocock**: 38/38 skills từ `skills-lock.json` được phủ kín 100%.
- **Custom skills tự chế**: 0 (Đã loại bỏ hoàn toàn `erp-ledger-audit`, bảo đảm 100% nguyên bản).
- **Bộ kiểm thử Vitest**: 35/35 tests passing (4 test files: `inventory.test.ts`, `ledger.test.ts`, `concurrency.test.ts`, `actions.test.ts`) trong ~1.05s.
- **Web Dashboard**: File `dashboard/index.html` đầy đủ 4 panels kiểm thử thời gian thực, liên kết mượt mà với Bài 17 & Bài 18.
- **Mục lục khóa học**: File `lessons/index.html` đã cập nhật đầy đủ 28 bài học qua 7 modules với giao diện Light Theme hiện đại.
