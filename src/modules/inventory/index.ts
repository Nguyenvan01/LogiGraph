/**
 * ============================================================================
 * Inventory Module — Public Entry Point (Deep Module Interface)
 * ============================================================================
 * Adheres strictly to Matt Pocock's /codebase-design principles:
 * - A lot of behavior hidden behind a small 3-method interface.
 * - Sits at a clean Seam (IInventoryRepository).
 * - Pluggable with 2 Adapters: InMemory (Vitest < 5ms) & Supabase (Production).
 */

import {
  IInventoryRepository,
  ProductId,
  ReservationId,
  SettlementAction,
  StockReservation,
} from './domain/types.js';

export * from './domain/types.js';
export * from './domain/errors.js';
export * from './adapters/in-memory.js';
export * from './adapters/supabase.js';

/**
 * Deep Module: InventoryService
 * Presents a minimal 3-method surface hiding all reservation, TTL,
 * atomic deduction, and balance invariant logic.
 */
export class InventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  /**
   * 1. Query real-time available stock (Physical Stock - Active Reservations).
   */
  public async getAvailableStock(productId: ProductId): Promise<number> {
    const balance = await this.repository.getStockBalance(productId);
    return balance ? balance.availableStock : 0;
  }

  /**
   * 2. Place a 15-minute TTL stock reservation during checkout.
   * Throws InsufficientStockError if available stock < quantity.
   */
  public async reserveStock(
    productId: ProductId,
    quantity: number,
    orderId?: string
  ): Promise<StockReservation> {
    return this.repository.createReservation(productId, quantity, 15, orderId);
  }

  /**
   * 3. Settle a reservation:
   * - 'COMMIT': Upon successful payment -> permanently deducts physical stock.
   * - 'RELEASE': Upon cancellation or 15-min TTL expiry -> restores available stock.
   */
  public async settleReservation(
    reservationId: ReservationId,
    action: SettlementAction,
    reason?: 'CANCELLED' | 'EXPIRED'
  ): Promise<void> {
    if (action === 'COMMIT') {
      await this.repository.commitReservation(reservationId);
    } else {
      await this.repository.releaseReservation(reservationId, reason);
    }
  }
}

/**
 * Factory helper to construct the service at the seam.
 */
export function createInventoryService(repository: IInventoryRepository): InventoryService {
  return new InventoryService(repository);
}
