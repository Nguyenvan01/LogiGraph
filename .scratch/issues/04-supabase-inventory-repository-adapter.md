# 04: Supabase PostgreSQL Inventory Repository Adapter

**What to build:** Implement `SupabaseInventoryRepository` satisfying `IInventoryRepository`. Executes atomic conditional SQL updates with `CHECK (stock >= 0)` and queries the real-time view `view_inventory_available` on Supabase PostgreSQL.

**Blocked by:** 01-in-memory-inventory-repository

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] Implement `SupabaseInventoryRepository` adhering to `IInventoryRepository`.
- [ ] Atomic stock reservation and deduction using parameterized SQL `WHERE stock >= :quantity`.
- [ ] Integration queries against `view_inventory_available` correctly computing `available_stock = physical_stock - active_reservations`.
- [ ] Gracefully catch PostgreSQL check constraint violation and throw domain-typed `INSUFFICIENT_STOCK`.
- [ ] Integration test suite validating atomic behavior against live or mocked PostgreSQL instance.
