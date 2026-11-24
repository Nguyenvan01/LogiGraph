# Technical Specification: Inventory & Order Lifecycle Management

Status: ready-for-agent

## Problem Statement

When customers purchase products in an e-commerce or ERP system, high-concurrency traffic often leads to inventory overselling (selling more items than physically available) or locking inventory indefinitely when customers abandon their checkout. Furthermore, disparate naming conventions and ambiguous order states cause developers and AI agents to implement conflicting logic, resulting in race conditions, negative inventory counts, and untracked cancellations.

## Solution

A robust, ACID-compliant Inventory and Order management engine built with Next.js 15, TypeScript, and Supabase PostgreSQL. The system uses a strict 15-minute **Stock Reservation with TTL** mechanism to temporarily hold stock during checkout, committing the deduction only upon confirmed payment, and automatically releasing reserved stock back to the available pool upon expiration or cancellation. All state transitions are strictly governed by an explicit finite state machine, and inventory balance is enforced at the database level using atomic conditional updates.

## User Stories

1. As a customer, I want to view the accurate available stock of a product, so that I do not attempt to purchase an out-of-stock item.
2. As a customer, I want to create a draft order with one or more items, so that my requested items are temporarily reserved for me for 15 minutes while I arrange payment.
3. As a customer, I want to see a clear countdown or expiration notice for my stock reservation, so that I know how much time I have to complete my payment.
4. As a customer, I want to complete payment for my draft order within the 15-minute window, so that my order transitions to paid and my items are permanently secured.
5. As a customer, I want my payment attempt to be gracefully rejected if my reservation has already expired, so that I am not charged for items that are no longer held for me.
6. As a customer, I want to explicitly cancel my draft order before paying, so that my held reservation is immediately released for others to purchase.
7. As a customer, I want to request cancellation for a paid order that has not yet shipped, so that my payment is refunded and the physical items are returned to stock.
8. As a customer, I want to be informed that I cannot cancel an order that has already shipped or completed, so that I am guided to the proper return flow instead.
9. As a warehouse manager, I want the system to ensure that physical stock can never drop below zero under any concurrency condition, so that physical warehouse count matches digital records.
10. As a warehouse manager, I want active reservations to reduce available stock without immediately decrementing physical stock, so that warehouse pickers only pack items that are genuinely paid for.
11. As a warehouse manager, I want expired reservations to automatically restore available stock without manual intervention, so that abandoned orders do not tie up warehouse stock.
12. As a fulfillment agent, I want to mark a paid order as shipped when the package is handed over to the courier, so that the customer and system know the goods are in transit.
13. As a fulfillment agent, I want to mark a shipped order as done once delivery is confirmed, so that the order lifecycle is successfully closed.
14. As an ERP administrator, I want an immutable audit trail of every state transition, so that I can trace why an order was cancelled, paid, or released.

## Implementation Decisions

### 1. Ubiquitous Language Conformance
All modules, schemas, functions, and tests MUST strictly adhere to the terms defined in `CONTEXT.md`:
- `Product` (not Item or SKU)
- `Physical Stock` (not Real Stock or On-hand Quantity)
- `Available Stock` (not Free Stock or Sellable Quantity)
- `Stock Reservation` with states: `ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`
- `Order` with states: `DRAFT`, `PAID`, `SHIPPED`, `DONE`, `CANCELLED`

### 2. Modules to be Built
- **`InventoryService`**: Responsible for querying stock balances, placing 15-minute stock reservations, committing reservations to physical deductions upon payment, and releasing expired or cancelled reservations.
- **`OrderService`**: Responsible for managing order creation, item line calculations, and executing valid state transitions according to the lifecycle state machine.

### 3. State Machine & Transition Invariants
From the validated prototype (`prototypes/order-lifecycle-prototype.html`), the allowed transitions and their inventory impacts are:

```ts
// Validated State Transition Shape from Prototype
type OrderStatus = 'DRAFT' | 'PAID' | 'SHIPPED' | 'DONE' | 'CANCELLED';
type ReservationStatus = 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';

// Legal Transitions Matrix:
// DRAFT     + PAY             -> PAID      (Reservation COMMITTED, Physical Stock decremented)
// DRAFT     + TTL_EXPIRED     -> CANCELLED (Reservation EXPIRED, Available Stock restored)
// DRAFT     + CANCEL          -> CANCELLED (Reservation RELEASED, Available Stock restored)
// PAID      + CANCEL          -> CANCELLED (Payment REFUNDED, Physical Stock restored)
// PAID      + SHIP            -> SHIPPED   (Goods handed to carrier)
// SHIPPED   + COMPLETE        -> DONE      (Delivery confirmed, Terminal state)
// SHIPPED / DONE + CANCEL     -> ILLEGAL_TRANSITION (Must be rejected)
```

### 4. Database Schema & Concurrency Strategy
As documented in `docs/adr/0001-atomic-stock-reservation-over-redis-lock.md` and `supabase/migrations/20260928000001_init_inventory_and_orders.sql`:
- Concurrency control relies on PostgreSQL atomic operations:
  ```sql
  UPDATE products
  SET stock = stock - :quantity
  WHERE id = :product_id AND stock >= :quantity;
  ```
- The database constraint `CONSTRAINT positive_stock CHECK (stock >= 0)` acts as an unbreakable safety net.
- Active stock reservations are held in table `stock_reservations` with `expires_at = now() + INTERVAL '15 minutes'`.
- The real-time view `view_inventory_available` provides the invariant:
  `available_stock = physical_stock - active_reservations`.

## Testing Decisions

### 1. Seams for Testing
We will test the system at the **highest possible service seams**:
- `IInventoryRepository` / `InventoryService` interface
- `IOrderRepository` / `OrderService` interface

### 2. Dual-Adapter Strategy
To ensure blazing-fast unit tests and deterministic CI execution without depending on external network or live databases:
- **In-Memory Adapter**: Implements the repository interface using in-memory maps. Runs all business logic and edge case tests in Vitest in milliseconds.
- **Supabase PostgreSQL Adapter**: Implements the repository interface against real PostgreSQL queries, tested in integration suites.

### 3. What Makes a Good Test
- Tests MUST assert only on observable external behavior and return values (e.g., available stock count, order status changes, thrown domain errors), NEVER on internal implementation details or private properties.
- Concurrency tests must assert that parallel reservations exceeding stock reject the overflow cleanly with `INSUFFICIENT_STOCK`.

## Out of Scope

- Live payment gateway integrations (Stripe, VNPay, Momo). Payment confirmation is simulated via internal domain events/RPC calls.
- Customer return, exchange, or refund flows after an order has entered `SHIPPED` or `DONE`.
- Multi-warehouse inventory allocation across geographical locations.

## Further Notes

- In Module 3, `InventoryService` and `OrderService` will be implemented strictly using Test-Driven Development (TDD: Red-Green-Refactor) using Vitest.
