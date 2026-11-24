# Wayfinder Map: VibeCoding ERP Mini (Next.js 15 + Supabase)

## Destination
Hệ thống ERP Mini Full-stack hoàn chỉnh, gồm 3 domain liên kết:
1. Inventory Core (Stock Reservation with 15-min TTL)
2. Order Lifecycle Engine (State Machine)
3. Double-entry Ledger (Tự động hạch toán Ghi Nợ/Có)
Kèm REST API Server Actions và Web Dashboard realtime có test tự động xanh 100%.

## Decisions so far
- [Inventory Deduction Timing]: Áp dụng pattern Stock Reservation with 15-min TTL (xem `docs/inventory-requirements.md`).
- [Concurrency Control]: Database-level Atomic Update kết hợp PostgreSQL Check Constraint `CHECK (stock >= 0)` trên Supabase.

## Frontier (Các Decision Tickets sẵn sàng triển khai)
- [Ticket 01 - Research]: Chuẩn hóa Schema Kế toán kép (Double-entry Bookkeeping) phù hợp PostgreSQL. (Đã hoàn thành qua /research: Invariant `SUM(Debit) === SUM(Credit)`).
- [Ticket 02 - Prototype]: Prototype State Machine cho Order Lifecycle (Draft -> Pending Payment -> Processing -> Shipped -> Completed / Cancelled).

## Not yet specified (Fog of War)
- Cơ chế đối soát (Reconciliation) giữa hóa đơn thanh toán và các bút toán kế toán.
- Chính sách phân quyền dữ liệu Row Level Security (RLS) cho Multi-tenant trên Supabase.

## Out of scope
- Tích hợp cổng thanh toán trực tiếp live-mode (Stripe / VNPay).
- Kiến trúc Microservices phân tán nhiều databases.
