'use server';

import {
  InventoryService,
  IInventoryRepository,
  StockReservation,
} from '../modules/inventory/index.js';
import {
  ReserveStockSchema,
  SettleReservationSchema,
} from './schemas.js';

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Reserve stock with 15-min TTL during checkout.
 */
export async function reserveStockAction(
  input: unknown,
  service: InventoryService
): Promise<ActionResult<StockReservation>> {
  const parsed = ReserveStockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  try {
    const reservation = await service.reserveStock(
      parsed.data.productId,
      parsed.data.quantity,
      parsed.data.orderId
    );
    return { success: true, data: reservation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Settle reservation (COMMIT upon payment or RELEASE upon cancellation/expiry).
 */
export async function settleReservationAction(
  input: unknown,
  service: InventoryService
): Promise<ActionResult<{ settled: true }>> {
  const parsed = SettleReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  try {
    await service.settleReservation(
      parsed.data.reservationId,
      parsed.data.action,
      parsed.data.reason
    );
    return { success: true, data: { settled: true } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Query available stock.
 */
export async function getAvailableStockAction(
  productId: string,
  service: InventoryService
): Promise<ActionResult<{ availableStock: number }>> {
  try {
    const stock = await service.getAvailableStock(productId);
    return { success: true, data: { availableStock: stock } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
