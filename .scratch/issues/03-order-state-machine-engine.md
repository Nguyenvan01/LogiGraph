# 03: Order Lifecycle State Machine Engine

**What to build:** Implement `OrderService` which manages the discrete lifecycle of orders (`DRAFT` → `PAID` → `SHIPPED` → `DONE` / `CANCELLED`), coordinating state changes with inventory reservation commits and refunds as proven in the prototype.

**Blocked by:** 02-stock-reservation-service

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] Creating an order generates a `DRAFT` order linked to an active stock reservation.
- [ ] Paying a draft order within TTL commits the reservation, decrements physical stock permanently, and transitions order to `PAID`.
- [ ] Paying an order with an expired reservation throws `RESERVATION_EXPIRED` and transitions order to `CANCELLED`.
- [ ] Cancelling a `DRAFT` order releases the reservation; cancelling a `PAID` order marks payment `REFUNDED` and restores physical stock.
- [ ] Transitioning `PAID` to `SHIPPED` and `SHIPPED` to `DONE` closes order lifecycle cleanly.
- [ ] Attempting to cancel a `SHIPPED` or `DONE` order throws `ILLEGAL_TRANSITION`.
- [ ] Comprehensive unit tests in Vitest covering all transition paths and edge cases.
