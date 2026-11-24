import { z } from 'zod';

export const ReserveStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer (> 0)'),
  orderId: z.string().optional(),
});

export const SettleReservationSchema = z.object({
  reservationId: z.string().min(1, 'Reservation ID is required'),
  action: z.enum(['COMMIT', 'RELEASE']),
  reason: z.enum(['CANCELLED', 'EXPIRED']).optional(),
});

export const ProcessOrderPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  reservationId: z.string().min(1, 'Reservation ID is required'),
  taxAmount: z.number().nonnegative('Tax amount must be non-negative').optional(),
});

export const FulfillOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  cogsAmount: z.number().positive('COGS amount must be greater than 0'),
});

export const RefundOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Refund amount must be greater than 0'),
  reason: z.string().optional(),
});

export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;
export type SettleReservationInput = z.infer<typeof SettleReservationSchema>;
export type ProcessOrderPaymentInput = z.infer<typeof ProcessOrderPaymentSchema>;
export type FulfillOrderInput = z.infer<typeof FulfillOrderSchema>;
export type RefundOrderInput = z.infer<typeof RefundOrderSchema>;
