# 02: Stock Reservation Domain Service with 15-min TTL

**What to build:** Implement `InventoryService.reserveStock()` and expiration handling with a strict 15-minute TTL. Ensures that high-concurrency requests cannot oversell items and that expired or cancelled holds restore available stock seamlessly.

**Blocked by:** 01-in-memory-inventory-repository

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `reserveStock(productId, quantity)` checks `availableStock >= quantity`, creates an active reservation with `expires_at = now + 15 min`, and returns a reservation token.
- [ ] Throws `INSUFFICIENT_STOCK` when requested quantity exceeds `availableStock`.
- [ ] Implement `releaseReservation(reservationId)` which marks the reservation `RELEASED` and restores `availableStock`.
- [ ] Implement `expireOverdueReservations()` which scans and marks expired reservations as `EXPIRED`, restoring `availableStock`.
- [ ] Vitest unit tests verifying concurrent reservation requests and TTL restoration behavior.
