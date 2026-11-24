import { describe, it, expect, vi } from 'vitest';
import {
  SupabaseInventoryRepository,
  SupabaseClientStub,
  InsufficientStockError,
  InvalidReservationStateError,
} from './index.js';

/**
 * ============================================================================
 * Bài 14: Diagnosing Bugs — Concurrency & Race Condition on Supabase / PostgreSQL
 * Framework: Matt Pocock's /diagnosing-bugs (Reproduce -> Isolate -> Hypothesise -> Verify)
 * Invariant: Available Stock = Physical Stock - Active Reservations >= 0
 * ============================================================================
 */

describe('Diagnosing Bugs: Concurrency & Race Condition (Over-selling / Double-booking)', () => {
  // ==========================================================================
  // Phase 1 & 2: Feedback Loop, Reproduce & Minimise
  // Symptom: 2 customers concurrently reserve the last remaining item in stock.
  // ==========================================================================
  describe('Phase 1 & 2: Reproduce Race Condition with Vulnerable Read-Modify-Write', () => {
    it('demonstrates the over-selling bug when using un-locked Read-Modify-Write under concurrent load', async () => {
      // 1. Initial State: Only 1 item physically in stock
      let physicalStock = 1;
      const reservations: Array<{ id: string; quantity: number; status: string; expires_at: string }> = [];

      // Mock client without RPC (simulating vulnerable Read-Modify-Write with network latency)
      const vulnerableClient: SupabaseClientStub = {
        rpc: undefined, // Forces repository into vulnerable fallback path
        from: (table: string) => {
          if (table === 'view_inventory_available') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => {
                    // Simulate realistic database query round-trip latency (15ms)
                    await new Promise((resolve) => setTimeout(resolve, 15));
                    const activeRes = reservations.filter(
                      (r) => r.status === 'ACTIVE' && new Date(r.expires_at) > new Date()
                    ).reduce((sum, r) => sum + r.quantity, 0);

                    return {
                      data: {
                        product_id: 'prod-rare-collectible',
                        physical_stock: physicalStock,
                        active_reservations: activeRes,
                        available_stock: physicalStock - activeRes,
                      },
                      error: null,
                    };
                  },
                }),
              }),
            };
          }

          if (table === 'stock_reservations') {
            return {
              insert: (record: any) => ({
                select: () => ({
                  single: async () => {
                    // Simulate insert latency (10ms)
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    const newRes = {
                      id: 'res-' + Math.random().toString(36).substring(2, 8),
                      ...record,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    reservations.push(newRes);
                    return { data: newRes, error: null };
                  },
                }),
              }),
            };
          }

          return {} as any;
        },
      };

      const repo = new SupabaseInventoryRepository(vulnerableClient);

      // Reproduce: Customer A and Customer B simultaneously attempt to reserve 1 unit
      const [resA, resB] = await Promise.allSettled([
        repo.createReservation('prod-rare-collectible', 1, 15, 'order-A'),
        repo.createReservation('prod-rare-collectible', 1, 15, 'order-B'),
      ]);

      // [DEBUG-RACE-REPRODUCE]: Both requests succeeded because both read available_stock = 1!
      expect(resA.status).toBe('fulfilled');
      expect(resB.status).toBe('fulfilled');

      // The critical business invariant is broken:
      // Physical stock = 1, but total active reservations = 2!
      expect(reservations.length).toBe(2);
      expect(reservations[0].quantity + reservations[1].quantity).toBe(2);
      // Available stock is now -1 (Over-sold / Double-booked)!
    });
  });

  // ==========================================================================
  // Phase 3 & 4: Hypothesise & Instrument
  // Hypothesis 1: Row-level lock (SELECT FOR UPDATE) via Postgres RPC serializes
  // operations at the database engine, cleanly rejecting the second reservation.
  // ==========================================================================
  describe('Phase 3, 4 & 5: Fix Verification with Atomic RPC (SELECT FOR UPDATE)', () => {
    it('correctly prevents double-booking when 2 customers concurrently reserve the last item', async () => {
      let physicalStock = 1;
      const reservations: Array<{ id: string; quantity: number; status: string; expires_at: string }> = [];

      // Emulate PostgreSQL Row-Level Lock engine (Mutex queue serialized on product row)
      let rowLockPromise: Promise<void> = Promise.resolve();

      const atomicClient: SupabaseClientStub = {
        rpc: async (fn: string, args: any) => {
          if (fn === 'reserve_stock_atomic') {
            // Wait for row lock on this product to release (PostgreSQL FOR UPDATE behavior)
            const acquireLock = rowLockPromise.then(async () => {
              // Simulate DB execution latency inside transaction
              await new Promise((resolve) => setTimeout(resolve, 15));

              const now = new Date();
              const activeCount = reservations
                .filter((r) => r.status === 'ACTIVE' && new Date(r.expires_at) > now)
                .reduce((sum, r) => sum + r.quantity, 0);

              const available = physicalStock - activeCount;

              if (available < args.p_quantity) {
                return {
                  data: null,
                  error: {
                    code: 'P0001',
                    message: `Insufficient stock for product ${args.p_product_id}: requested ${args.p_quantity}, available ${available}`,
                  },
                };
              }

              const newRes = {
                id: 'res-atomic-' + Math.random().toString(36).substring(2, 8),
                productId: args.p_product_id,
                orderId: args.p_order_id,
                quantity: args.p_quantity,
                status: 'ACTIVE',
                expiresAt: new Date(now.getTime() + args.p_ttl_minutes * 60 * 1000).toISOString(),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
              };

              reservations.push({
                id: newRes.id,
                quantity: newRes.quantity,
                status: 'ACTIVE',
                expires_at: newRes.expiresAt,
              });

              return { data: newRes, error: null };
            });

            rowLockPromise = acquireLock.then(() => {}).catch(() => {});
            return acquireLock;
          }

          return { data: null, error: { message: 'Unknown RPC' } };
        },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                const activeRes = reservations.reduce((sum, r) => sum + r.quantity, 0);
                return {
                  data: {
                    product_id: 'prod-rare-collectible',
                    physical_stock: physicalStock,
                    active_reservations: activeRes,
                    available_stock: physicalStock - activeRes,
                  },
                  error: null,
                };
              },
            }),
          }),
        }),
      };

      const repo = new SupabaseInventoryRepository(atomicClient);

      // Concurrent test: Customer A and Customer B both attempt to reserve the 1 remaining item
      const [resA, resB] = await Promise.allSettled([
        repo.createReservation('prod-rare-collectible', 1, 15, 'order-A'),
        repo.createReservation('prod-rare-collectible', 1, 15, 'order-B'),
      ]);

      // Exactly ONE must succeed and exactly ONE must fail with InsufficientStockError
      const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled');
      const rejected = [resA, resB].filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // The rejected one failed with the domain error
      const failedReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(failedReason).toBeInstanceOf(InsufficientStockError);

      // Invariant is strictly preserved:
      expect(reservations.length).toBe(1);
      expect(reservations[0].quantity).toBe(1);
    });

    it('stress test: handles 10 concurrent reservation attempts on 2 available items with 0 overselling', async () => {
      let physicalStock = 2;
      const reservations: Array<{ id: string; quantity: number; status: string; expires_at: string }> = [];
      let rowLockPromise: Promise<void> = Promise.resolve();

      const atomicClient: SupabaseClientStub = {
        rpc: async (fn: string, args: any) => {
          if (fn === 'reserve_stock_atomic') {
            const acquireLock = rowLockPromise.then(async () => {
              await new Promise((r) => setTimeout(r, 5));
              const activeCount = reservations.reduce((sum, r) => sum + r.quantity, 0);
              const available = physicalStock - activeCount;

              if (available < args.p_quantity) {
                return {
                  data: null,
                  error: { code: 'P0001', message: 'Insufficient stock' },
                };
              }

              const record = {
                id: 'res-' + Math.random().toString(36).substring(2, 8),
                productId: args.p_product_id,
                orderId: args.p_order_id,
                quantity: args.p_quantity,
                status: 'ACTIVE',
                expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              reservations.push({
                id: record.id,
                quantity: 1,
                status: 'ACTIVE',
                expires_at: record.expiresAt,
              });
              return { data: record, error: null };
            });

            rowLockPromise = acquireLock.then(() => {}).catch(() => {});
            return acquireLock;
          }
          return { data: null, error: { message: 'Unknown RPC' } };
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  product_id: 'prod-stress',
                  physical_stock: physicalStock,
                  active_reservations: reservations.length,
                  available_stock: physicalStock - reservations.length,
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const repo = new SupabaseInventoryRepository(atomicClient);

      // Launch 10 simultaneous requests for quantity = 1
      const attempts = Array.from({ length: 10 }, (_, i) =>
        repo.createReservation('prod-stress', 1, 15, `order-stress-${i}`)
      );

      const results = await Promise.allSettled(attempts);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      // Exactly 2 succeeded (matching physical stock = 2), 8 cleanly rejected
      expect(succeeded.length).toBe(2);
      expect(failed.length).toBe(8);

      // All 8 failures threw InsufficientStockError
      for (const f of failed) {
        expect((f as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);
      }

      // Reservations in DB cannot exceed 2
      expect(reservations.length).toBe(2);
    });

    it('atomically commits reservation via RPC preventing double commits', async () => {
      let committed = false;
      const atomicClient: SupabaseClientStub = {
        rpc: async (fn: string, args: any) => {
          if (fn === 'commit_reservation_atomic') {
            if (committed) {
              return {
                data: null,
                error: { code: 'P0004', message: 'Invalid reservation state: already COMMITTED' },
              };
            }
            committed = true;
            return { data: { id: args.p_reservation_id, status: 'COMMITTED' }, error: null };
          }
          return { data: null, error: { message: 'Not found' } };
        },
        from: () => ({} as any),
      };

      const repo = new SupabaseInventoryRepository(atomicClient);

      // First commit succeeds
      await expect(repo.commitReservation('res-valid')).resolves.not.toThrow();

      // Second commit on the same reservation fails with InvalidReservationStateError
      await expect(repo.commitReservation('res-valid')).rejects.toThrow(InvalidReservationStateError);
    });
  });
});
