import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInventoryService,
  InMemoryInventoryRepository,
  InventoryService,
} from '../modules/inventory/index.js';
import {
  createLedgerService,
  InMemoryLedgerRepository,
  LedgerService,
} from '../modules/ledger/index.js';
import {
  getAvailableStockAction,
  reserveStockAction,
  settleReservationAction,
} from './inventory.js';
import {
  fulfillOrderAction,
  getTrialBalanceAction,
  processOrderPaymentAction,
  refundOrderAction,
} from './billing.js';

describe('Server Actions — Integration Flow (Inventory + Billing + Ledger)', () => {
  let inventoryRepo: InMemoryInventoryRepository;
  let ledgerRepo: InMemoryLedgerRepository;
  let inventoryService: InventoryService;
  let ledgerService: LedgerService;

  beforeEach(() => {
    inventoryRepo = new InMemoryInventoryRepository();
    ledgerRepo = new InMemoryLedgerRepository();

    // Seed product in inventory (Physical stock: 10, Price: 150)
    inventoryRepo.seedProduct({
      id: 'prod-laptop-01',
      name: 'MacBook Pro M3',
      sku: 'MBP-M3-001',
      price: 150,
      physicalStock: 10,
    });

    inventoryService = createInventoryService(inventoryRepo);
    ledgerService = createLedgerService(ledgerRepo);
  });

  describe('Validation Guards with Zod', () => {
    it('rejects reservation request with negative or zero quantity', async () => {
      const resZero = await reserveStockAction(
        { productId: 'prod-laptop-01', quantity: 0 },
        inventoryService
      );
      expect(resZero.success).toBe(false);
      expect(resZero.error).toContain('Quantity must be a positive integer');

      const resNegative = await reserveStockAction(
        { productId: 'prod-laptop-01', quantity: -3 },
        inventoryService
      );
      expect(resNegative.success).toBe(false);
    });

    it('rejects payment request with missing reservationId or invalid amount', async () => {
      const res = await processOrderPaymentAction(
        { orderId: 'ord-1', amount: -50 },
        inventoryService,
        ledgerService
      );
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects settlement with unknown action string', async () => {
      const res = await settleReservationAction(
        { reservationId: 'res-1', action: 'UNKNOWN_ACTION' },
        inventoryService
      );
      expect(res.success).toBe(false);
    });
  });

  describe('Golden Business Flow: Checkout -> Pay -> Fulfill -> Refund', () => {
    it('successfully processes full end-to-end multi-table transaction flow', async () => {
      // 1. Initial State: Available stock is 10
      const stockBefore = await getAvailableStockAction('prod-laptop-01', inventoryService);
      expect(stockBefore.success).toBe(true);
      expect(stockBefore.data?.availableStock).toBe(10);

      // 2. Checkout: Reserve 2 items
      const reserveResult = await reserveStockAction(
        { productId: 'prod-laptop-01', quantity: 2, orderId: 'order-golden-01' },
        inventoryService
      );
      expect(reserveResult.success).toBe(true);
      const reservationId = reserveResult.data!.id;

      // Available stock drops to 8, but physical stock is still 10
      const stockDuring = await getAvailableStockAction('prod-laptop-01', inventoryService);
      expect(stockDuring.data?.availableStock).toBe(8);

      // 3. Payment Confirmed: Pay 300 (2 items * 150)
      const payResult = await processOrderPaymentAction(
        {
          orderId: 'order-golden-01',
          amount: 300,
          reservationId,
          taxAmount: 30, // 10% tax -> Total 330
        },
        inventoryService,
        ledgerService
      );

      expect(payResult.success).toBe(true);
      expect(payResult.data?.invoice.totalAmount).toBe(330);
      expect(payResult.data?.invoice.status).toBe('PAID');

      // Physical stock permanently drops to 8 after COMMIT
      const stockAfterPay = await inventoryRepo.getProduct('prod-laptop-01');
      expect(stockAfterPay?.physicalStock).toBe(8);

      // Bank account (112) has 330, Sales Revenue (511) has 330
      expect(await ledgerService.getAccountBalance('112')).toBe(330);
      expect(await ledgerService.getAccountBalance('511')).toBe(330);

      // 4. Fulfillment & Shipping: Recognize COGS = 180 (cost of 2 items)
      // Seed inventory asset balance first
      await ledgerService.postTransaction('Seed inventory asset', [
        { accountCode: '156', amount: 1000, direction: 'DEBIT' },
        { accountCode: '112', amount: 1000, direction: 'CREDIT' },
      ]);

      const fulfillResult = await fulfillOrderAction(
        { orderId: 'order-golden-01', cogsAmount: 180 },
        ledgerService
      );
      expect(fulfillResult.success).toBe(true);

      expect(await ledgerService.getAccountBalance('632')).toBe(180); // COGS
      expect(await ledgerService.getAccountBalance('156')).toBe(820); // 1000 - 180

      // 5. Customer Cancellation / Refund:
      const refundResult = await refundOrderAction(
        { orderId: 'order-golden-01', amount: 330, reason: 'Customer requested refund' },
        ledgerService
      );
      expect(refundResult.success).toBe(true);

      // 6. Trial Balance Check: All accounts balanced
      const trialBalanceResult = await getTrialBalanceAction(ledgerService);
      expect(trialBalanceResult.success).toBe(true);
      expect(trialBalanceResult.data?.isBalanced).toBe(true);
      expect(trialBalanceResult.data?.totalDebit).toBe(trialBalanceResult.data?.totalCredit);
    });
  });
});
