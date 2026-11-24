# Use Append-Only Immutable Ledger Entries with Database-Enforced Balance Invariant

We enforce an append-only immutable ledger model where `ledger_entries` cannot be updated or deleted, and any corrections require compensatory reversing transactions. All transactions must strictly satisfy `SUM(debit) = SUM(credit)` within an atomic PostgreSQL transaction. This eliminates silent balance corruption, provides an audit-proof financial trail, and trades off storage space and cancellation simplicity for strict regulatory compliance and mathematical correctness.
