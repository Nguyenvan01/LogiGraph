'use server';

import { InventoryService } from '../modules/inventory/index.js';
import {
  Invoice,
  LedgerService,
  TrialBalanceRow,
} from '../modules/ledger/index.js';
import {
  FulfillOrderSchema,
  ProcessOrderPaymentSchema,
  RefundOrderSchema,
} from './schemas.js';
import { ActionResult } from './inventory.js';

export interface PaymentSuccessData {
  invoice: Invoice;
  transactionId: string;
}

/**
 * Server Action: Process Order Payment (Multi-domain Atomic Flow)
 * Coordinates across Inventory and Ledger:
 * 1. Generates official Invoice.
 * 2. Commits stock reservation (permanently decrementing physical stock).
 * 3. Posts balanced journal entry: Debit 112 (Bank), Credit 511 (Revenue).
 */
export async function processOrderPaymentAction(
  input: unknown,
  inventoryService: InventoryService,
  ledgerService: LedgerService
): Promise<ActionResult<PaymentSuccessData>> {
  const parsed = ProcessOrderPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const { orderId, amount, reservationId, taxAmount } = parsed.data;

  try {
    // 1. Create Invoice
    const invoice = await ledgerService.createInvoice({
      orderId,
      subtotal: amount,
      taxAmount: taxAmount ?? 0,
    });

    // 2. Commit stock reservation in Inventory Core
    await inventoryService.settleReservation(reservationId, 'COMMIT');

    // 3. Post balanced double-entry transaction in Ledger Core
    const { transaction } = await ledgerService.recordOrderPayment(
      orderId,
      invoice.totalAmount,
      invoice.id
    );

    invoice.status = 'PAID';

    return {
      success: true,
      data: {
        invoice,
        transactionId: transaction.id,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Payment processing failed: ${err.message}`,
    };
  }
}

/**
 * Server Action: Fulfill Order & Recognize COGS
 * - Debit: 632 (Cost of Goods Sold)
 * - Credit: 156 (Merchandise Inventory)
 */
export async function fulfillOrderAction(
  input: unknown,
  ledgerService: LedgerService
): Promise<ActionResult<{ transactionId: string }>> {
  const parsed = FulfillOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  try {
    const { transaction } = await ledgerService.recordInventoryFulfillment(
      parsed.data.orderId,
      parsed.data.cogsAmount
    );
    return {
      success: true,
      data: { transactionId: transaction.id },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Refund Order (Compensatory Reversal)
 * - Debit: 511 (Sales Revenue)
 * - Credit: 112 (Bank Deposit Account)
 */
export async function refundOrderAction(
  input: unknown,
  ledgerService: LedgerService
): Promise<ActionResult<{ transactionId: string }>> {
  const parsed = RefundOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  try {
    const { transaction } = await ledgerService.recordRefund(
      parsed.data.orderId,
      parsed.data.amount,
      parsed.data.reason
    );
    return {
      success: true,
      data: { transactionId: transaction.id },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Query live Trial Balance
 */
export async function getTrialBalanceAction(
  ledgerService: LedgerService
): Promise<
  ActionResult<{
    rows: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  }>
> {
  try {
    const report = await ledgerService.getTrialBalance();
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
