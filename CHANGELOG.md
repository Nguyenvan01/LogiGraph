# Changelog — VibeCoding ERP Mini

Tất cả các thay đổi đáng chú ý của dự án VibeCoding ERP Mini được ghi nhận trong tài liệu này. Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-28

### Added
- **Module 0: Setup & Baseline Architecture**:
  - Khởi tạo dự án Next.js 15 App Router, TypeScript (strict mode), Vitest test runner và Supabase client stub.
  - Cấu hình pre-commit guardrail hook chặn các lệnh git nguy hiểm (`.claude/hooks/block-dangerous-git.sh`).
- **Module 1: Discovery & Business Modeling**:
  - Tài liệu phân tích yêu cầu kho và quy tắc giữ hàng 15-phút TTL (`docs/inventory-requirements.md`).
  - Bản đồ dự án Wayfinder và tài liệu nghiên cứu kế toán kép (`docs/research/double-entry-bookkeeping.md`).
  - Prototype độc lập kiểm chứng State Machine vòng đời đơn hàng (`prototypes/order-lifecycle-prototype.html`).
- **Module 2: Domain Specification & Vertical Slices**:
  - Từ điển miền Ubiquitous Language (`CONTEXT.md`) và migration cơ sở dữ liệu bảng `products`, `orders`, `stock_reservations`.
  - Bản đặc tả kỹ thuật module kho và đơn hàng (`specs/inventory-and-order.md`).
  - Danh mục Tracer-bullet Tickets với đồ thị phụ thuộc (`.scratch/inventory-and-order/issues/`).
- **Module 3: Deep Modules & TDD Execution**:
  - Thiết kế Deep Module `InventoryService` với interface 3 phương thức và Seam `IInventoryRepository`.
  - Hai Adapter: `InMemoryInventoryRepository` phục vụ test nhanh và `SupabaseInventoryRepository` cho cơ sở dữ liệu thật.
  - Bộ unit test Vitest 16 tests bao phủ 100% logic trừ kho, reservation và TTL.
- **Module 4: Capstone Full-Stack ERP**:
  - Module Kế toán kép `LedgerService` đảm bảo nguyên tắc tổng Nợ = tổng Có ($\sum \text{Debit} === \sum \text{Credit}$).
  - Supabase RLS Policy bảo vệ bảng `ledger_entries` thành Append-only Audit Trail.
  - Bộ Next.js Server Actions có Zod validation guards điều phối chu trình thanh toán, trừ kho và hạch toán tự động.
  - Giao diện Web Dashboard thời gian thực (`dashboard/index.html`).
- **Module 5: Concurrency Debugging & Senior Code Review**:
  - PostgreSQL Stored Procedure `reserve_stock_atomic` sử dụng `SELECT ... FOR UPDATE` triệt tiêu lỗi Race Condition khi nhiều khách hàng đồng thời đặt mua sản phẩm cuối cùng.
  - Bộ test Concurrency mô phỏng 10 concurrent requests tranh mua 2 sản phẩm.
  - Bộ quy chuẩn dự án `CODING_STANDARDS.md` và Báo cáo Senior Code Review 2 trục độc lập (`docs/code-review-v1.0-report.md`).
  - Quy trình 5 bước giải quyết xung đột Merge Conflict (`resolving-merge-conflicts`).
