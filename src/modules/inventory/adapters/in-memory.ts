import {
  IInventoryRepository,
  Product,
  ProductId,
  ProductStockBalance,
  ReservationId,
  StockReservation,
} from '../domain/types.js';
import {
  InsufficientStockError,
  InvalidReservationStateError,
  ProductNotFoundError,
  ReservationNotFoundError,
} from '../domain/errors.js';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private products = new Map<ProductId, Product>();
  private reservations = new Map<ReservationId, StockReservation>();

  constructor(initialProducts?: Product[]) {
    if (initialProducts) {
      for (const p of initialProducts) {
        this.products.set(p.id, { ...p });
      }
    }
  }

  // Helper method for seeding in tests
  public seedProduct(product: Product): void {
    this.products.set(product.id, { ...product });
  }

  public async getProduct(productId: ProductId): Promise<Product | null> {
    const product = this.products.get(productId);
    return product ? { ...product } : null;
  }

  public async getStockBalance(productId: ProductId): Promise<ProductStockBalance | null> {
    const product = this.products.get(productId);
    if (!product) return null;

    const now = new Date();
    let activeReservations = 0;

    for (const res of this.reservations.values()) {
      if (
        res.productId === productId &&
        res.status === 'ACTIVE' &&
        res.expiresAt.getTime() > now.getTime()
      ) {
        activeReservations += res.quantity;
      }
    }

    const availableStock = Math.max(0, product.physicalStock - activeReservations);

    return {
      productId,
      physicalStock: product.physicalStock,
      activeReservations,
      availableStock,
    };
  }

  public async createReservation(
    productId: ProductId,
    quantity: number,
    ttlMinutes: number,
    orderId?: string
  ): Promise<StockReservation> {
    const product = this.products.get(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const balance = await this.getStockBalance(productId);
    if (!balance || balance.availableStock < quantity) {
      throw new InsufficientStockError(
        productId,
        quantity,
        balance ? balance.availableStock : 0
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const reservationId = 'res-' + Math.random().toString(36).substring(2, 9);

    const reservation: StockReservation = {
      id: reservationId,
      productId,
      orderId,
      quantity,
      status: 'ACTIVE',
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    this.reservations.set(reservationId, reservation);
    return { ...reservation };
  }

  public async getReservation(reservationId: ReservationId): Promise<StockReservation | null> {
    const res = this.reservations.get(reservationId);
    return res ? { ...res } : null;
  }

  public async commitReservation(reservationId: ReservationId): Promise<void> {
    const res = this.reservations.get(reservationId);
    if (!res) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (res.status !== 'ACTIVE') {
      throw new InvalidReservationStateError(reservationId, res.status, 'COMMIT');
    }

    if (res.expiresAt.getTime() <= new Date().getTime()) {
      res.status = 'EXPIRED';
      res.updatedAt = new Date();
      throw new InvalidReservationStateError(reservationId, 'EXPIRED', 'COMMIT');
    }

    const product = this.products.get(res.productId);
    if (!product) {
      throw new ProductNotFoundError(res.productId);
    }

    // Permanently deduct from physical stock
    product.physicalStock -= res.quantity;
    res.status = 'COMMITTED';
    res.updatedAt = new Date();
  }

  public async releaseReservation(
    reservationId: ReservationId,
    reason: 'CANCELLED' | 'EXPIRED' = 'CANCELLED'
  ): Promise<void> {
    const res = this.reservations.get(reservationId);
    if (!res) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (res.status !== 'ACTIVE') {
      throw new InvalidReservationStateError(reservationId, res.status, 'RELEASE');
    }

    res.status = reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED';
    res.updatedAt = new Date();
  }
}
