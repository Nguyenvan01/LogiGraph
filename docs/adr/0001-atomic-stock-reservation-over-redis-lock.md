# Use PostgreSQL Check Constraints and TTL Reservations for Stock Concurrency

We use PostgreSQL atomic statements with `CHECK (stock >= 0)` constraints and explicit 15-minute `stock_reservations` records instead of an external Redis distributed lock. This keeps inventory balance enforcement strictly ACID-compliant within Supabase without introducing external caching infrastructure or split-brain failure modes.
