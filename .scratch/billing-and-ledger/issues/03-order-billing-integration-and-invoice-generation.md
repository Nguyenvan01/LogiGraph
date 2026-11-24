# 03: Order Billing Integration & Automatic Invoice Generation

**What to build:** Integrate the Billing domain with the Order Lifecycle. When an order transitions to `PAID`, generate an official `Invoice` and automatically post the corresponding balanced journal entry: Debit `112` (Bank Deposit) and Credit `511` (Sales Revenue). Support compensatory reversal transactions when orders are refunded.

**Blocked by:** 02 (Ledger Service Core & Invariants)

**Status:** closed
**Closed by:** Bài 12 (/implement, /tdd)

## Acceptance Criteria

- [x] Implement `BillingService` or integration workflow handling order payment confirmation.
- [x] Generate unique sequential invoice numbers (e.g., `INV-2026-0001`).
- [x] Post automated revenue journal entry: Debit `112` for full order amount, Credit `511` for full order amount.
- [x] Post inventory relief entry when fulfillment completes: Debit `632` (COGS), Credit `156` (Inventory).
- [x] Provide refund method creating compensatory reversing entry: Debit `511` (Sales Revenue), Credit `112` (Bank Deposit).
- [x] Confirm trial balance remains mathematically balanced across entire order lifecycle.
