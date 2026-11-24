/**
 * Domain Errors for Inventory Module
 */

export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryDomainError';
  }
}

export class ProductNotFoundError extends InventoryDomainError {
  constructor(public readonly productId: string) {
    super(`Product with ID "${productId}" was not found.`);
    this.name = 'ProductNotFoundError';
  }
}

export class InsufficientStockError extends InventoryDomainError {
  constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number
  ) {
    super(
      `Insufficient available stock for product "${productId}". Requested: ${requested}, Available: ${available}.`
    );
    this.name = 'InsufficientStockError';
  }
}

export class ReservationNotFoundError extends InventoryDomainError {
  constructor(public readonly reservationId: string) {
    super(`Stock reservation with ID "${reservationId}" was not found.`);
    this.name = 'ReservationNotFoundError';
  }
}

export class InvalidReservationStateError extends InventoryDomainError {
  constructor(
    public readonly reservationId: string,
    public readonly currentStatus: string,
    public readonly attemptedAction: string
  ) {
    super(
      `Cannot perform action "${attemptedAction}" on reservation "${reservationId}" in status "${currentStatus}".`
    );
    this.name = 'InvalidReservationStateError';
  }
}
