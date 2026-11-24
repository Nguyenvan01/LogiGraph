# 01: In-Memory Inventory Repository Seam

**What to build:** Define the core `IInventoryRepository` interface in domain language and implement an in-memory repository adapter with atomic methods. This establishes the highest testing seam so subsequent service logic can be fully verified in Vitest without external database dependencies.

**Blocked by:** None (can start immediately)

**Status:** closed
**Closed by:** Bài 08 (/tdd, /implement, /migrate-to-shoehorn)

## Acceptance Criteria

- [x] Define `IInventoryRepository` interface using types matching `CONTEXT.md` (`Product`, `PhysicalStock`, `AvailableStock`, `StockReservation`).
- [x] Implement `InMemoryInventoryRepository` using in-memory Map structures with atomic reservation checks.
- [x] Write Vitest sanity unit tests confirming that active reservations immediately reduce available stock while leaving physical stock unchanged.
