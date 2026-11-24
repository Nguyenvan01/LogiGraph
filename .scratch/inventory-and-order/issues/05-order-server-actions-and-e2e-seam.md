# 05: Next.js Server Actions and End-to-End Seam

**What to build:** Expose `createOrderAction`, `confirmPaymentAction`, and `cancelOrderAction` in Next.js 15 Server Actions with Zod validation. Connects the frontend caller to the domain services through the seam with type-safe action results.

**Blocked by:** 03-order-state-machine-engine, 04-supabase-inventory-repository-adapter

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] Zod schema validation for all client inputs (`customerEmail`, `productId`, `quantity`).
- [ ] Server actions inject the appropriate repository adapter based on runtime environment.
- [ ] Return structured `{ success: true, order }` or `{ success: false, error: { code, message } }`.
- [ ] End-to-end integration test validating a complete checkout flow from Server Action call to database state.
