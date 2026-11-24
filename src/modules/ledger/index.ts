/**
 * ============================================================================
 * Ledger Module — Public Entry Point (Deep Module Interface)
 * ============================================================================
 * Adheres strictly to Matt Pocock's /codebase-design principles:
 * - A lot of rich domain behavior hidden behind a concise, expressive interface.
 * - Sits at a clean Seam (ILedgerRepository).
 * - Enforces the mathematical invariant: SUM(Debit) === SUM(Credit).
 * - Immutability: Append-only ledger entries, adjustments via Compensatory Reversals.
 */

import {
  Account,
  AccountingTransaction,
  CreateEntryInput,
  CreateInvoiceInput,
  ILedgerRepository,
  Invoice,
  LedgerEntry,
  TrialBalanceRow,
} from './domain/types.js';
import {
  AccountNotFoundError,
  InsufficientEntriesError,
  InvalidEntryAmountError,
  InvoiceNotFoundError,
  UnbalancedTransactionError,
} from './domain/errors.js';

export * from './domain/types.js';
export * from './domain/errors.js';
export * from './adapters/in-memory.js';
export * from './adapters/supabase.js';

let invoiceCounter = 1;

/**
 * Deep Module: LedgerService
 */
export class LedgerService {
  constructor(private readonly repository: ILedgerRepository) {}

  /**
   * 1. Post a balanced double-entry accounting transaction.
   * Strictly enforces:
   * - At least 2 entries.
   * - Positive amounts (> 0).
   * - All referenced accounts exist.
   * - Invariant: SUM(Debit) === SUM(Credit).
   */
  public async postTransaction(
    description: string,
    entries: CreateEntryInput[],
    referenceId?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    if (entries.length < 2) {
      throw new InsufficientEntriesError(entries.length);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const resolvedEntries: { accountId: string; amount: number; direction: 'DEBIT' | 'CREDIT' }[] = [];

    for (const entry of entries) {
      if (entry.amount <= 0 || isNaN(entry.amount)) {
        throw new InvalidEntryAmountError(entry.amount);
      }

      const account = await this.repository.getAccountByCode(entry.accountCode);
      if (!account) {
        throw new AccountNotFoundError(entry.accountCode);
      }

      if (entry.direction === 'DEBIT') {
        totalDebit += entry.amount;
      } else {
        totalCredit += entry.amount;
      }

      resolvedEntries.push({
        accountId: account.id,
        amount: Number(entry.amount.toFixed(2)),
        direction: entry.direction,
      });
    }

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.001) {
      throw new UnbalancedTransactionError(totalDebit, totalCredit, diff);
    }

    return this.repository.recordTransaction(description, resolvedEntries, referenceId);
  }

  /**
   * 2. Generate an official Invoice for an order.
   */
  public async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const taxAmount = input.taxAmount ?? 0;
    const totalAmount = Number((input.subtotal + taxAmount).toFixed(2));
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(invoiceCounter++).padStart(4, '0')}`;

    return this.repository.createInvoice({
      orderId: input.orderId,
      invoiceNumber,
      subtotal: input.subtotal,
      taxAmount,
      totalAmount,
      status: 'ISSUED',
    });
  }

  /**
   * 3. Record order payment realization:
   * - Debit: 112 (Bank Deposit Account)
   * - Credit: 511 (Sales Revenue)
   * - Updates invoice status to PAID
   */
  public async recordOrderPayment(
    orderId: string,
    amount: number,
    referenceInvoiceId?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    const tx = await this.postTransaction(
      `Order payment realization for Order #${orderId}`,
      [
        { accountCode: '112', amount, direction: 'DEBIT' },
        { accountCode: '511', amount, direction: 'CREDIT' },
      ],
      orderId
    );

    if (referenceInvoiceId) {
      await this.repository.updateInvoiceStatus(referenceInvoiceId, 'PAID');
    }

    return tx;
  }

  /**
   * 4. Record inventory fulfillment & cost recognition:
   * - Debit: 632 (Cost of Goods Sold)
   * - Credit: 156 (Merchandise Inventory)
   */
  public async recordInventoryFulfillment(
    orderId: string,
    cogsAmount: number
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    return this.postTransaction(
      `Inventory relief & COGS recognition for Order #${orderId}`,
      [
        { accountCode: '632', amount: cogsAmount, direction: 'DEBIT' },
        { accountCode: '156', amount: cogsAmount, direction: 'CREDIT' },
      ],
      orderId
    );
  }

  /**
   * 5. Record order refund (Compensatory Reversal):
   * Reverses previous revenue without deleting old records:
   * - Debit: 511 (Sales Revenue)
   * - Credit: 112 (Bank Deposit Account)
   */
  public async recordRefund(
    orderId: string,
    refundAmount: number,
    reason?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    return this.postTransaction(
      `Compensatory refund reversal for Order #${orderId}${reason ? ` (${reason})` : ''}`,
      [
        { accountCode: '511', amount: refundAmount, direction: 'DEBIT' },
        { accountCode: '112', amount: refundAmount, direction: 'CREDIT' },
      ],
      orderId
    );
  }

  /**
   * 6. Retrieve live Trial Balance aggregated across all accounts.
   */
  public async getTrialBalance(): Promise<{
    rows: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  }> {
    const rows = await this.repository.getTrialBalance();
    let totalDebit = 0;
    let totalCredit = 0;

    for (const r of rows) {
      totalDebit += r.totalDebit;
      totalCredit += r.totalCredit;
    }

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    return {
      rows,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      isBalanced,
    };
  }

  /**
   * 7. Query net balance for a specific account by code.
   */
  public async getAccountBalance(code: string): Promise<number> {
    const trialBalance = await this.repository.getTrialBalance();
    const row = trialBalance.find((r) => r.accountCode === code);
    if (!row) {
      throw new AccountNotFoundError(code);
    }
    return row.netBalance;
  }
}

/**
 * Factory helper for LedgerService instantiation.
 */
export function createLedgerService(repository: ILedgerRepository): LedgerService {
  return new LedgerService(repository);
}
