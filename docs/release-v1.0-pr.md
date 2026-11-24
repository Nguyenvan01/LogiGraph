## Summary

VibeCoding ERP Mini v1.0: Bộ giải pháp quản lý tồn kho, đơn hàng và sổ cái kế toán kép (Double-entry Ledger) trên nền tảng Next.js 15 App Router và Supabase PostgreSQL.

```text
User Action (UI / Server Action)
  │
  ├── reserveStockAction()
  │     └── Supabase RPC: reserve_stock_atomic (SELECT FOR UPDATE)
  │           ├── Available Stock = Physical Stock - Active Reservations
  │           └── 15-minute TTL Reservation Created
  │
  ├── processOrderPaymentAction()
  │     ├── commitReservation() ──► Physical Stock Decremented
  │     ├── Invoice Generation ──► INV-2026-XXXX
  │     └── postTransaction()  ──► Debit 112 (Bank) / Credit 511 (Revenue)
  │
  └── getTrialBalanceAction()
        └── view_ledger_trial_balance ──► Invariant: Σ Debit === Σ Credit
```

### Architecture & Boundaries

```text
src/
├── actions/             # Next.js Server Actions with Zod validation
├── modules/
│   ├── inventory/       # Deep Core: TTL reservation, atomic stock lock
│   │   ├── adapters/    # InMemory (< 15ms tests) & Supabase (RPC)
│   │   └── domain/      # Invariant types, branded IDs, domain errors
│   └── ledger/          # Deep Core: Double-entry bookkeeping engine
│       ├── adapters/    # InMemory & Supabase (RLS append-only)
│       └── domain/      # Account chart (112, 156, 511, 632)
└── dashboard/           # Realtime reactive UI dashboard
```

## Evidence

- **Before:**
  - Chưa có hệ thống ERP; việc quản lý tồn kho dựa trên các câu lệnh đọc/ghi rời rạc (Check-Then-Act), dẫn đến nguy cơ Over-selling và Double-booking khi có nhiều request đồng thời.
  - Sổ cái ghi chép đơn lẻ, không đảm bảo cân bằng tài chính và dễ bị chỉnh sửa trái phép.
- **After:**
  - Toàn bộ 35/35 automated unit & integration tests trong Vitest đều pass trong 159ms.
  - TypeScript typecheck (`tsc --noEmit`) đạt 0 lỗi.
  - Concurrency test chứng minh 10 concurrent requests tranh mua 2 sản phẩm cuối cùng: chỉ đúng 2 requests thành công, 8 requests bị từ chối sạch sẽ với `InsufficientStockError`, tồn kho không bao giờ bị âm.
  - Sổ cái kế toán kép bảo đảm bất biến $\sum \text{Debit} === \sum \text{Credit}$ trên 100% giao dịch, bảng `ledger_entries` được bảo vệ bằng Supabase RLS ngăn chặn `UPDATE` và `DELETE`.

```text
 RUN  v4.1.11 /home/tinhnq/project/vibecoding_erp

 ✓ src/modules/inventory/inventory.test.ts (16 tests) 14ms
 ✓ src/modules/ledger/ledger.test.ts (11 tests) 16ms
 ✓ src/actions/actions.test.ts (4 tests) 14ms
 ✓ src/modules/inventory/concurrency.test.ts (4 tests) 115ms

 Test Files  4 passed (4)
      Tests  35 passed (35)
   Duration  349ms
```

## Merge Danger

**Door:** Two-way door

Toàn bộ logic nghiệp vụ được bao bọc phía sau các interface Seams (`IInventoryRepository`, `ILedgerRepository`). Các bảng dữ liệu Supabase được tạo với khóa ngoại và Check Constraints bảo toàn tính tương thích ngược. Có thể hoàn tác hoặc chuyển đổi adapter mà không làm gián đoạn hệ thống.

**Blast Radius:** Low

Phạm vi tác động giới hạn trong các module nghiệp vụ nội bộ của `vibecoding_erp` (`inventory`, `ledger`, `actions`). Không có thay đổi phá vỡ (breaking changes) đối với các dịch vụ bên ngoài.
