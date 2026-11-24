# 04: Supabase Ledger Repository Adapter & RLS Policies

**What to build:** Implement `SupabaseLedgerRepository` targeting the PostgreSQL database schema deployed via migration `20260928000002_init_double_entry_ledger.sql`. Enforce Row Level Security (RLS) policies protecting append-only ledger tables from unauthorized update or deletion.

**Blocked by:** 02 (Ledger Service Core & Invariants)

**Status:** closed
**Closed by:** Bài 12 (/implement, /tdd)

## Acceptance Criteria

- [x] Implement `SupabaseLedgerRepository` fulfilling `ILedgerRepository` interface using `@supabase/supabase-js`.
- [x] Wrap transaction posting inside atomic database calls.
- [x] Query `view_ledger_trial_balance` for real-time aggregated balance reporting.
- [x] Configure PostgreSQL RLS policies allowing authenticated inserts while blocking updates and deletes on `ledger_entries`.
