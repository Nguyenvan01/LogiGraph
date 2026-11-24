# 02: Ledger Service Core & Double-Entry Balance Invariants

**What to build:** Implement `LedgerService` containing the pure business rules for posting accounting transactions and enforcing the double-entry invariant `SUM(debit) === SUM(credit)`. All entries must be validated against registered accounts and positive non-zero amounts.

**Blocked by:** 01 (In-Memory Ledger Repository Seam)

**Status:** closed
**Closed by:** Bài 11 (/codebase-design, /tdd, /implement-spec)

## Acceptance Criteria

- [x] Implement `LedgerService` receiving an `ILedgerRepository` via constructor dependency injection.
- [x] Provide `postTransaction(referenceId, description, entries)` method enforcing mathematical equality: total Debit strictly equals total Credit.
- [x] Throw `UnbalancedTransactionError` when Debit !== Credit with exact differential details.
- [x] Throw `InvalidEntryAmountError` when entry amount is non-positive (`<= 0`).
- [x] Throw `AccountNotFoundError` when any entry references an unseeded or invalid account code.
- [x] Provide `getTrialBalance()` method returning live net balances across all accounts.
