import { beforeEach, describe, expect, it } from 'vitest';
import {
  AccountNotFoundError,
  createLedgerService,
  InMemoryLedgerRepository,
  InsufficientEntriesError,
  InvalidEntryAmountError,
  LedgerService,
  UnbalancedTransactionError,
} from './index.js';

describe('LedgerService — TDD Test Suite at Seam (ILedgerRepository)', () => {
  let repository: InMemoryLedgerRepository;
  let ledgerService: LedgerService;

  beforeEach(() => {
    repository = new InMemoryLedgerRepository();
    ledgerService = createLedgerService(repository);
  });

  describe('Slice 1: Mathematical Invariants & Validation Enforcements', () => {
    it('throws InsufficientEntriesError when a transaction has fewer than 2 entries', async () => {
      await expect(
        ledgerService.postTransaction('Single entry attempt', [
          { accountCode: '112', amount: 100, direction: 'DEBIT' },
        ])
      ).rejects.toThrow(InsufficientEntriesError);
    });

    it('throws InvalidEntryAmountError when an entry amount is zero or negative', async () => {
      await expect(
        ledgerService.postTransaction('Negative amount test', [
          { accountCode: '112', amount: -50, direction: 'DEBIT' },
          { accountCode: '511', amount: -50, direction: 'CREDIT' },
        ])
      ).rejects.toThrow(InvalidEntryAmountError);

      await expect(
        ledgerService.postTransaction('Zero amount test', [
          { accountCode: '112', amount: 0, direction: 'DEBIT' },
          { accountCode: '511', amount: 0, direction: 'CREDIT' },
        ])
      ).rejects.toThrow(InvalidEntryAmountError);
    });

    it('throws AccountNotFoundError when an entry references an unregistered account code', async () => {
      await expect(
        ledgerService.postTransaction('Unknown account test', [
          { accountCode: '999', amount: 100, direction: 'DEBIT' },
          { accountCode: '511', amount: 100, direction: 'CREDIT' },
        ])
      ).rejects.toThrow(AccountNotFoundError);
    });

    it('throws UnbalancedTransactionError when total Debit does not strictly equal total Credit', async () => {
      try {
        await ledgerService.postTransaction('Unbalanced posting', [
          { accountCode: '112', amount: 100, direction: 'DEBIT' },
          { accountCode: '511', amount: 90, direction: 'CREDIT' },
        ]);
        expect.unreachable('Should have thrown UnbalancedTransactionError');
      } catch (err) {
        expect(err).toBeInstanceOf(UnbalancedTransactionError);
        const unbalanced = err as UnbalancedTransactionError;
        expect(unbalanced.totalDebit).toBe(100);
        expect(unbalanced.totalCredit).toBe(90);
        expect(unbalanced.difference).toBe(10);
      }
    });
  });

  describe('Slice 2: Balanced General Ledger Transactions', () => {
    it('successfully posts a valid 2-legged transaction and returns transaction details', async () => {
      const result = await ledgerService.postTransaction(
        'Manual capital injection',
        [
          { accountCode: '112', amount: 500, direction: 'DEBIT' },
          { accountCode: '511', amount: 500, direction: 'CREDIT' },
        ],
        'REF-INIT-001'
      );

      expect(result.transaction.id).toBeDefined();
      expect(result.transaction.description).toBe('Manual capital injection');
      expect(result.transaction.referenceId).toBe('REF-INIT-001');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].direction).toBe('DEBIT');
      expect(result.entries[0].amount).toBe(500);
      expect(result.entries[1].direction).toBe('CREDIT');
      expect(result.entries[1].amount).toBe(500);
    });

    it('supports compound transactions with split entries satisfying total equality', async () => {
      // Split payment: 70 bank + 30 cash = 100 revenue
      const result = await ledgerService.postTransaction('Split customer payment', [
        { accountCode: '112', amount: 70, direction: 'DEBIT' },
        { accountCode: '111', amount: 30, direction: 'DEBIT' },
        { accountCode: '511', amount: 100, direction: 'CREDIT' },
      ]);

      expect(result.entries).toHaveLength(3);
      const totalDebit = result.entries
        .filter((e) => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalCredit = result.entries
        .filter((e) => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);

      expect(totalDebit).toBe(100);
      expect(totalCredit).toBe(100);
    });
  });

  describe('Slice 3: Automated Order Billing & Revenue Recognition', () => {
    it('creates an official Invoice with calculated tax and total amount', async () => {
      const invoice = await ledgerService.createInvoice({
        orderId: 'order-101',
        subtotal: 200,
        taxAmount: 20,
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.orderId).toBe('order-101');
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice.subtotal).toBe(200);
      expect(invoice.taxAmount).toBe(20);
      expect(invoice.totalAmount).toBe(220);
      expect(invoice.status).toBe('ISSUED');
    });

    it('records order payment realization (Debit: 112 Bank, Credit: 511 Revenue) and marks invoice PAID', async () => {
      const invoice = await ledgerService.createInvoice({
        orderId: 'order-102',
        subtotal: 350,
      });

      const { transaction, entries } = await ledgerService.recordOrderPayment(
        'order-102',
        350,
        invoice.id
      );

      expect(transaction.referenceId).toBe('order-102');
      expect(entries).toHaveLength(2);

      const bankBalance = await ledgerService.getAccountBalance('112');
      const revenueBalance = await ledgerService.getAccountBalance('511');

      expect(bankBalance).toBe(350);
      expect(revenueBalance).toBe(350);

      // Verify invoice status updated
      const updatedInvoice = await repository.getInvoiceByOrderId('order-102');
      expect(updatedInvoice?.status).toBe('PAID');
    });
  });

  describe('Slice 4: Inventory Relief & COGS Recognition', () => {
    it('records inventory fulfillment (Debit: 632 COGS, Credit: 156 Inventory)', async () => {
      // First seed inventory asset by a balanced entry (Debit: 156 Inventory, Credit: 112 Bank)
      await ledgerService.postTransaction('Initial inventory purchase', [
        { accountCode: '156', amount: 1000, direction: 'DEBIT' },
        { accountCode: '112', amount: 1000, direction: 'CREDIT' },
      ]);

      // When order fulfilled with COGS = 250
      await ledgerService.recordInventoryFulfillment('order-102', 250);

      const cogsBalance = await ledgerService.getAccountBalance('632');
      const inventoryBalance = await ledgerService.getAccountBalance('156');

      expect(cogsBalance).toBe(250);
      expect(inventoryBalance).toBe(750); // 1000 - 250
    });
  });

  describe('Slice 5: Compensatory Reversals & Refunds (Audit Trail Preservation)', () => {
    it('executes a refund as a compensatory reversal entry without modifying past records', async () => {
      // 1. Initial order payment: 400
      await ledgerService.recordOrderPayment('order-103', 400);

      expect(await ledgerService.getAccountBalance('112')).toBe(400);
      expect(await ledgerService.getAccountBalance('511')).toBe(400);

      // 2. Customer cancels -> Refund full 400 (Debit 511, Credit 112)
      await ledgerService.recordRefund('order-103', 400, 'Customer requested cancellation');

      // Both balances return to 0 net
      expect(await ledgerService.getAccountBalance('112')).toBe(0);
      expect(await ledgerService.getAccountBalance('511')).toBe(0);

      // Verify audit trail: All entries exist in ledger history (total 4 entries)
      const trialBalance = await ledgerService.getTrialBalance();
      const bankRow = trialBalance.rows.find((r) => r.accountCode === '112')!;
      const revenueRow = trialBalance.rows.find((r) => r.accountCode === '511')!;

      expect(bankRow.totalDebit).toBe(400);
      expect(bankRow.totalCredit).toBe(400);
      expect(revenueRow.totalDebit).toBe(400);
      expect(revenueRow.totalCredit).toBe(400);
    });
  });

  describe('Slice 6: Real-time Trial Balance Invariant', () => {
    it('maintains strict Trial Balance equality across multiple business cycles', async () => {
      // Initial capital: 5000 bank / 5000 revenue
      await ledgerService.postTransaction('Starting capital', [
        { accountCode: '112', amount: 5000, direction: 'DEBIT' },
        { accountCode: '511', amount: 5000, direction: 'CREDIT' },
      ]);

      // Buy stock: 2000 inventory / 2000 bank
      await ledgerService.postTransaction('Stock purchase', [
        { accountCode: '156', amount: 2000, direction: 'DEBIT' },
        { accountCode: '112', amount: 2000, direction: 'CREDIT' },
      ]);

      // Sale 1: 800 revenue / 800 bank
      await ledgerService.recordOrderPayment('order-201', 800);
      // Sale 1 COGS: 350 cogs / 350 inventory
      await ledgerService.recordInventoryFulfillment('order-201', 350);

      // Sale 2: 1200 revenue / 1200 bank
      await ledgerService.recordOrderPayment('order-202', 1200);

      // Refund Sale 1: 800
      await ledgerService.recordRefund('order-201', 800);

      const trialBalance = await ledgerService.getTrialBalance();

      expect(trialBalance.isBalanced).toBe(true);
      expect(trialBalance.totalDebit).toBe(trialBalance.totalCredit);
      expect(trialBalance.totalDebit).toBe(10150);
      expect(trialBalance.totalCredit).toBe(10150);
    });
  });
});
