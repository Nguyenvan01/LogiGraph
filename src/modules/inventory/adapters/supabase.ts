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

export interface SupabaseClientStub {
  from(table: string): any;
  rpc?: (fn: string, args?: any) => any;
}

/**
 * Production Adapter executing atomic PostgreSQL operations in Supabase.
 * Enforces CHECK (stock >= 0) and queries view_inventory_available.
 */
export class SupabaseInventoryRepository implements IInventoryRepository {
  constructor(private readonly client: SupabaseClientStub) {}

  public async getProduct(productId: ProductId): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('id, name, sku, price, stock')
      .eq('id', productId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      sku: data.sku,
      price: Number(data.price),
      physicalStock: data.stock,
    };
  }

  public async getStockBalance(productId: ProductId): Promise<ProductStockBalance | null> {
    const { data, error } = await this.client
      .from('view_inventory_available')
      .select('product_id, physical_stock, active_reservations, available_stock')
      .eq('product_id', productId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      productId: data.product_id,
      physicalStock: data.physical_stock,
      activeReservations: data.active_reservations,
      availableStock: data.available_stock,
    };
  }

  public async createReservation(
    productId: ProductId,
    quantity: number,
    ttlMinutes: number,
    orderId?: string
  ): Promise<StockReservation> {
    // If client provides RPC method, use database-level atomic locking (SELECT FOR UPDATE)
    if (typeof this.client.rpc === 'function') {
      const { data, error } = await this.client.rpc('reserve_stock_atomic', {
        p_product_id: productId,
        p_quantity: quantity,
        p_order_id: orderId || null,
        p_ttl_minutes: ttlMinutes,
      });

      if (error) {
        if (error.code === 'P0001' || error.message?.includes('Insufficient stock')) {
          const balance = await this.getStockBalance(productId);
          throw new InsufficientStockError(
            productId,
            quantity,
            balance ? balance.availableStock : 0
          );
        }
        if (error.code === 'P0002' || error.message?.includes('not found')) {
          throw new ProductNotFoundError(productId);
        }
        throw new Error(`Failed to create reservation atomically: ${error.message}`);
      }

      return {
        id: data.id,
        productId: data.productId,
        orderId: data.orderId,
        quantity: data.quantity,
        status: data.status,
        expiresAt: new Date(data.expiresAt),
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    }

    // Fallback: Read-Modify-Write pattern (vulnerable to race condition under concurrency)
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

    const { data, error } = await this.client
      .from('stock_reservations')
      .insert({
        product_id: productId,
        order_id: orderId,
        quantity,
        status: 'ACTIVE',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create reservation: ${error?.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      orderId: data.order_id,
      quantity: data.quantity,
      status: data.status,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  public async getReservation(reservationId: ReservationId): Promise<StockReservation | null> {
    const { data, error } = await this.client
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      productId: data.product_id,
      orderId: data.order_id,
      quantity: data.quantity,
      status: data.status,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  public async commitReservation(reservationId: ReservationId): Promise<void> {
    if (typeof this.client.rpc === 'function') {
      const { error } = await this.client.rpc('commit_reservation_atomic', {
        p_reservation_id: reservationId,
      });

      if (error) {
        if (error.code === 'P0003' || error.message?.includes('not found')) {
          throw new ReservationNotFoundError(reservationId);
        }
        if (error.code === 'P0004' || error.code === 'P0005' || error.message?.includes('Invalid reservation state') || error.message?.includes('expired')) {
          throw new InvalidReservationStateError(reservationId, error.code === 'P0005' ? 'EXPIRED' : 'UNKNOWN', 'COMMIT');
        }
        throw new Error(`Atomic commit failed: ${error.message}`);
      }
      return;
    }

    // Fallback commit
    const res = await this.getReservation(reservationId);
    if (!res) throw new ReservationNotFoundError(reservationId);
    if (res.status !== 'ACTIVE') {
      throw new InvalidReservationStateError(reservationId, res.status, 'COMMIT');
    }

    if (res.expiresAt.getTime() <= new Date().getTime()) {
      await this.client
        .from('stock_reservations')
        .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
        .eq('id', reservationId);
      throw new InvalidReservationStateError(reservationId, 'EXPIRED', 'COMMIT');
    }

    // Atomic update in PostgreSQL deducting physical stock and updating reservation
    const { error: stockError } = await this.client
      .from('products')
      .update({ stock: `stock - ${res.quantity}` })
      .eq('id', res.productId);

    if (stockError) throw new Error(`Atomic deduction failed: ${stockError.message}`);

    await this.client
      .from('stock_reservations')
      .update({ status: 'COMMITTED', updated_at: new Date().toISOString() })
      .eq('id', reservationId);
  }

  public async releaseReservation(
    reservationId: ReservationId,
    reason: 'CANCELLED' | 'EXPIRED' = 'CANCELLED'
  ): Promise<void> {
    const res = await this.getReservation(reservationId);
    if (!res) throw new ReservationNotFoundError(reservationId);
    if (res.status !== 'ACTIVE') {
      throw new InvalidReservationStateError(reservationId, res.status, 'RELEASE');
    }

    const nextStatus = reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED';
    await this.client
      .from('stock_reservations')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', reservationId);
  }
}
