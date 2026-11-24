import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import {
  InventoryService,
  createInventoryService,
  InMemoryInventoryRepository,
  Product,
  ProductNotFoundError,
  InsufficientStockError,
  ReservationNotFoundError,
  InvalidReservationStateError,
} from './index.js';

describe('InventoryService — TDD Test Suite at Seam (IInventoryRepository)', () => {
  let repository: InMemoryInventoryRepository;
  let service: InventoryService;

  beforeEach(() => {
    repository = new InMemoryInventoryRepository();
    service = createInventoryService(repository);
    vi.useRealTimers();
  });

  // ==========================================================================
  // Slice 1: getAvailableStock & Real-time Invariant
  // Invariant: Available Stock = Physical Stock - Active Reservations
  // ==========================================================================
  describe('Slice 1: getAvailableStock (Query Available Balance)', () => {
    it('returns 0 when product does not exist in inventory', async () => {
      const stock = await service.getAvailableStock('non-existent-prod');
      expect(stock).toBe(0);
    });

    it('returns full physical stock when no active reservations exist', async () => {
      // Using Shoehorn fromPartial: only specify properties relevant to this test
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-iphone-15',
          physicalStock: 25,
        })
      );

      const available = await service.getAvailableStock('prod-iphone-15');
      expect(available).toBe(25);
    });

    it('calculates available stock by subtracting active reservations from physical stock', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-macbook-m3',
          physicalStock: 10,
        })
      );

      // Place a reservation for 3 units
      await service.reserveStock('prod-macbook-m3', 3, 'order-001');

      // Available stock should be 10 - 3 = 7
      const available = await service.getAvailableStock('prod-macbook-m3');
      expect(available).toBe(7);

      // Verify physical stock in repository is still 10 (untouched)
      const balance = await repository.getStockBalance('prod-macbook-m3');
      expect(balance?.physicalStock).toBe(10);
      expect(balance?.activeReservations).toBe(3);
    });

    it('automatically restores available stock when a reservation expires past its TTL', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-09-28T10:00:00Z');
      vi.setSystemTime(baseTime);

      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-ipad-air',
          physicalStock: 5,
        })
      );

      // Reserve 4 units at 10:00:00
      await service.reserveStock('prod-ipad-air', 4, 'order-002');
      expect(await service.getAvailableStock('prod-ipad-air')).toBe(1);

      // Advance time by 16 minutes (past 15-min TTL) to 10:16:00
      vi.setSystemTime(new Date('2026-09-28T10:16:00Z'));

      // Available stock should automatically be restored to 5
      expect(await service.getAvailableStock('prod-ipad-air')).toBe(5);
    });
  });

  // ==========================================================================
  // Slice 2: reserveStock (15-min TTL & Concurrency Protection)
  // ==========================================================================
  describe('Slice 2: reserveStock (Hold Stock with 15-Minute TTL)', () => {
    it('creates an active reservation with exact 15-minute TTL window', async () => {
      vi.useFakeTimers();
      const startTime = new Date('2026-09-28T12:00:00Z');
      vi.setSystemTime(startTime);

      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-keychron-q1',
          physicalStock: 8,
        })
      );

      const reservation = await service.reserveStock('prod-keychron-q1', 2, 'order-003');

      expect(reservation.status).toBe('ACTIVE');
      expect(reservation.quantity).toBe(2);
      expect(reservation.productId).toBe('prod-keychron-q1');
      expect(reservation.orderId).toBe('order-003');
      expect(reservation.createdAt.getTime()).toBe(startTime.getTime());

      // Expiry must be exactly 15 minutes after creation
      const expectedExpiry = new Date(startTime.getTime() + 15 * 60 * 1000);
      expect(reservation.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it('throws ProductNotFoundError when attempting to reserve a non-existent product', async () => {
      await expect(
        service.reserveStock('prod-ghost', 1, 'order-999')
      ).rejects.toThrowError(ProductNotFoundError);
    });

    it('throws InsufficientStockError when requested quantity exceeds available stock', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-airpods-pro',
          physicalStock: 3,
        })
      );

      // Attempt to reserve 5 when only 3 are available
      await expect(
        service.reserveStock('prod-airpods-pro', 5, 'order-004')
      ).rejects.toThrowError(InsufficientStockError);

      // Attempt to reserve 0 or negative is rejected or out of stock
      const balance = await repository.getStockBalance('prod-airpods-pro');
      expect(balance?.availableStock).toBe(3);
    });

    it('prevents overselling across consecutive reservations (Anti-Overselling Invariant)', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-dell-xps',
          physicalStock: 10,
        })
      );

      // Customer 1 reserves 6 units -> 4 available
      await service.reserveStock('prod-dell-xps', 6, 'order-c1');
      expect(await service.getAvailableStock('prod-dell-xps')).toBe(4);

      // Customer 2 reserves 4 units -> 0 available
      await service.reserveStock('prod-dell-xps', 4, 'order-c2');
      expect(await service.getAvailableStock('prod-dell-xps')).toBe(0);

      // Customer 3 attempts to reserve even 1 unit -> must be rejected cleanly
      await expect(
        service.reserveStock('prod-dell-xps', 1, 'order-c3')
      ).rejects.toThrowError(InsufficientStockError);
    });
  });

  // ==========================================================================
  // Slice 3: settleReservation — COMMIT (Payment Succeeded)
  // ==========================================================================
  describe('Slice 3: settleReservation — COMMIT (Payment Confirmed)', () => {
    it('permanently decrements physical stock and marks reservation COMMITTED', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-sony-wh1000xm5',
          physicalStock: 10,
        })
      );

      // 1. Reserve 3 items
      const reservation = await service.reserveStock('prod-sony-wh1000xm5', 3, 'order-paid');
      expect(await service.getAvailableStock('prod-sony-wh1000xm5')).toBe(7);

      // 2. Commit reservation upon payment receipt
      await service.settleReservation(reservation.id, 'COMMIT');

      // 3. Physical stock is now 7; active reservations count is 0; available stock remains 7
      const balance = await repository.getStockBalance('prod-sony-wh1000xm5');
      expect(balance?.physicalStock).toBe(7);
      expect(balance?.activeReservations).toBe(0);
      expect(balance?.availableStock).toBe(7);

      const committedRes = await repository.getReservation(reservation.id);
      expect(committedRes?.status).toBe('COMMITTED');
    });

    it('throws ReservationNotFoundError when committing an invalid reservation ID', async () => {
      await expect(
        service.settleReservation('invalid-res-id', 'COMMIT')
      ).rejects.toThrowError(ReservationNotFoundError);
    });

    it('throws InvalidReservationStateError when attempting to re-commit an already committed reservation', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-mouse-mx3',
          physicalStock: 5,
        })
      );

      const reservation = await service.reserveStock('prod-mouse-mx3', 2, 'order-mx');
      await service.settleReservation(reservation.id, 'COMMIT');

      // Second attempt to commit must be rejected
      await expect(
        service.settleReservation(reservation.id, 'COMMIT')
      ).rejects.toThrowError(InvalidReservationStateError);
    });

    it('rejects committing an expired reservation whose 15-minute TTL has elapsed', async () => {
      vi.useFakeTimers();
      const startTime = new Date('2026-09-28T08:00:00Z');
      vi.setSystemTime(startTime);

      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-logitech-keyboard',
          physicalStock: 6,
        })
      );

      const reservation = await service.reserveStock('prod-logitech-keyboard', 2, 'order-late');

      // Customer delays payment; 16 minutes pass (TTL expired)
      vi.setSystemTime(new Date('2026-09-28T08:16:00Z'));

      // Committing after TTL must throw InvalidReservationStateError
      await expect(
        service.settleReservation(reservation.id, 'COMMIT')
      ).rejects.toThrowError(InvalidReservationStateError);

      // Verify physical stock was NOT deducted
      const balance = await repository.getStockBalance('prod-logitech-keyboard');
      expect(balance?.physicalStock).toBe(6);
    });
  });

  // ==========================================================================
  // Slice 4: settleReservation — RELEASE (Cancelled / Abandoned Checkout)
  // ==========================================================================
  describe('Slice 4: settleReservation — RELEASE (Cancellation & Restoring Available Stock)', () => {
    it('restores available stock immediately when reservation is cancelled by user', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-monitor-4k',
          physicalStock: 4,
        })
      );

      const reservation = await service.reserveStock('prod-monitor-4k', 2, 'order-cancel');
      expect(await service.getAvailableStock('prod-monitor-4k')).toBe(2);

      // Customer cancels before paying
      await service.settleReservation(reservation.id, 'RELEASE', 'CANCELLED');

      // Status updated to RELEASED
      const releasedRes = await repository.getReservation(reservation.id);
      expect(releasedRes?.status).toBe('RELEASED');

      // Physical stock remains 4, available stock is fully restored to 4
      const balance = await repository.getStockBalance('prod-monitor-4k');
      expect(balance?.physicalStock).toBe(4);
      expect(balance?.activeReservations).toBe(0);
      expect(balance?.availableStock).toBe(4);
    });

    it('settles reservation with status EXPIRED when settled with reason EXPIRED', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-kindle-scribe',
          physicalStock: 10,
        })
      );

      const reservation = await service.reserveStock('prod-kindle-scribe', 1, 'order-exp');
      await service.settleReservation(reservation.id, 'RELEASE', 'EXPIRED');

      const expiredRes = await repository.getReservation(reservation.id);
      expect(expiredRes?.status).toBe('EXPIRED');
      expect(await service.getAvailableStock('prod-kindle-scribe')).toBe(10);
    });

    it('throws InvalidReservationStateError when attempting to release an already COMMITTED reservation', async () => {
      repository.seedProduct(
        fromPartial<Product>({
          id: 'prod-anker-charger',
          physicalStock: 10,
        })
      );

      const reservation = await service.reserveStock('prod-anker-charger', 2, 'order-charge');
      await service.settleReservation(reservation.id, 'COMMIT');

      // Attempting to release a paid/committed order reservation directly through this seam is forbidden
      await expect(
        service.settleReservation(reservation.id, 'RELEASE')
      ).rejects.toThrowError(InvalidReservationStateError);
    });

    it('throws ReservationNotFoundError when releasing a non-existent reservation ID', async () => {
      await expect(
        service.settleReservation('res-does-not-exist', 'RELEASE')
      ).rejects.toThrowError(ReservationNotFoundError);
    });
  });
});
