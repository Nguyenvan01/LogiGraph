# 02: Stock Reservation Domain Service with 15-min TTL

**What to build:** Implement `InventoryService.reserveStock()` and expiration handling with a strict 15-minute TTL. Ensures that high-concurrency requests cannot oversell items and that expired or cancelled holds restore available stock seamlessly.

**Blocked by:** 01-in-memory-inventory-repository

**Status:** closed
**Closed by:** Bài 08 (/tdd, /implement, /migrate-to-shoehorn)

## Acceptance Criteria

- [x] `reserveStock(productId, quantity)` checks `availableStock >= quantity`, creates an active reservation with `expires_at = now + 15 min`, and returns a reservation token.
- [x] Throws `INSUFFICIENT_STOCK` (`InsufficientStockError`) when requested quantity exceeds `availableStock`.
- [x] Implement `releaseReservation(reservationId)` which marks the reservation `RELEASED` and restores `availableStock`.
- [x] Implement expiration handling which marks expired reservations as `EXPIRED` and rejects expired commits.
- [x] Vitest unit tests verifying concurrent reservation requests and TTL restoration behavior.
