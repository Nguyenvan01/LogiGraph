# 01: Ledger Repository Seam & In-Memory Adapter

**What to build:** Define the core `ILedgerRepository` interface adhering to terms in `CONTEXT.md` and implement an in-memory repository adapter. This establishes the highest testing seam so subsequent financial logic and double-entry invariants can be verified in sub-millisecond Vitest tests without connecting to Supabase.

**Blocked by:** None (can start immediately)

**Status:** closed
**Closed by:** Bài 11 (/codebase-design, /tdd, /implement-spec)

## Acceptance Criteria

- [x] Define `ILedgerRepository` interface with methods: `createAccount`, `getAccountByCode`, `createInvoice`, `getInvoiceByOrderId`, `recordTransaction`, `getTrialBalance`.
- [x] Define domain data types: `Account`, `AccountingTransaction`, `LedgerEntry`, `Invoice`, `TrialBalanceRow`.
- [x] Implement `InMemoryLedgerRepository` using in-memory Map structures supporting atomic append of transactions and entries.
- [x] Seed default accounts (`111`, `112`, `156`, `511`, `632`) into memory upon repository instantiation.
- [x] Write Vitest sanity unit tests confirming account lookup and initial balance state.
