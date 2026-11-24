/**
 * Domain Types for Inventory Module
 * Strictly conforms to Ubiquitous Language defined in CONTEXT.md
 */

export type ProductId = string;
export type ReservationId = string;

export type ReservationStatus = 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';

export interface Product {
  id: ProductId;
  name: string;
  sku: string;
  price: number;
  physicalStock: number;
}

export interface StockReservation {
  id: ReservationId;
  productId: ProductId;
  orderId?: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductStockBalance {
  productId: ProductId;
  physicalStock: number;
  activeReservations: number;
  availableStock: number;
}

export type SettlementAction = 'COMMIT' | 'RELEASE';

/**
 * The Seam (Interface): Everything callers and adapters must satisfy.
 */
export interface IInventoryRepository {
  getProduct(productId: ProductId): Promise<Product | null>;
  getStockBalance(productId: ProductId): Promise<ProductStockBalance | null>;
  createReservation(
    productId: ProductId,
    quantity: number,
    ttlMinutes: number,
    orderId?: string
  ): Promise<StockReservation>;
  getReservation(reservationId: ReservationId): Promise<StockReservation | null>;
  commitReservation(reservationId: ReservationId): Promise<void>;
  releaseReservation(reservationId: ReservationId, reason?: 'CANCELLED' | 'EXPIRED'): Promise<void>;
}
