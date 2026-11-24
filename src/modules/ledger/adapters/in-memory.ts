import {
  Account,
  AccountingTransaction,
  ILedgerRepository,
  Invoice,
  InvoiceStatus,
  LedgerEntry,
  TrialBalanceRow,
} from '../domain/types.js';

/**
 * InMemoryLedgerRepository — Fast, Zero-dependency Adapter for Vitest
 * Keeps all data in-memory for sub-millisecond unit test execution.
 */
export class InMemoryLedgerRepository implements ILedgerRepository {
  private accounts: Map<string, Account> = new Map();
  private transactions: Map<string, AccountingTransaction> = new Map();
  private entries: LedgerEntry[] = [];
  private invoices: Map<string, Invoice> = new Map();

  constructor() {
    this.seedDefaultChartOfAccounts();
  }

  /**
   * Seed standard Chart of Accounts
   */
  private seedDefaultChartOfAccounts(): void {
    const defaults: Array<Omit<Account, 'id' | 'createdAt'>> = [
      { code: '111', name: 'Cash on Hand', type: 'ASSET' },
      { code: '112', name: 'Bank Deposit Account', type: 'ASSET' },
      { code: '156', name: 'Merchandise Inventory', type: 'ASSET' },
      { code: '511', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '632', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    ];

    for (const acc of defaults) {
      const id = `acc-${acc.code}`;
      this.accounts.set(id, {
        ...acc,
        id,
        createdAt: new Date(),
      });
    }
  }

  public async createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const id = `acc-${account.code}-${Date.now()}`;
    const newAccount: Account = {
      ...account,
      id,
      createdAt: new Date(),
    };
    this.accounts.set(id, newAccount);
    return newAccount;
  }

  public async getAccountByCode(code: string): Promise<Account | null> {
    for (const acc of this.accounts.values()) {
      if (acc.code === code) return acc;
    }
    return null;
  }

  public async getAccountById(id: string): Promise<Account | null> {
    return this.accounts.get(id) || null;
  }

  public async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  public async createInvoice(invoice: Omit<Invoice, 'id' | 'issuedAt'>): Promise<Invoice> {
    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newInvoice: Invoice = {
      ...invoice,
      id,
      issuedAt: new Date(),
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  public async getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
    for (const inv of this.invoices.values()) {
      if (inv.orderId === orderId) return inv;
    }
    return null;
  }

  public async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = status;
    }
  }

  public async recordTransaction(
    description: string,
    entries: { accountId: string; amount: number; direction: 'DEBIT' | 'CREDIT' }[],
    referenceId?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const transaction: AccountingTransaction = {
      id: txId,
      description,
      referenceId,
      postedAt: now,
    };
    this.transactions.set(txId, transaction);

    const createdEntries: LedgerEntry[] = [];
    for (const entry of entries) {
      const entryId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newEntry: LedgerEntry = {
        id: entryId,
        transactionId: txId,
        accountId: entry.accountId,
        amount: entry.amount,
        direction: entry.direction,
        createdAt: now,
      };
      this.entries.push(newEntry);
      createdEntries.push(newEntry);
    }

    return { transaction, entries: createdEntries };
  }

  public async getTrialBalance(): Promise<TrialBalanceRow[]> {
    const rows: TrialBalanceRow[] = [];

    for (const acc of this.accounts.values()) {
      const accEntries = this.entries.filter((e) => e.accountId === acc.id);
      let totalDebit = 0;
      let totalCredit = 0;

      for (const e of accEntries) {
        if (e.direction === 'DEBIT') {
          totalDebit += e.amount;
        } else {
          totalCredit += e.amount;
        }
      }

      // Net balance calculation:
      // Asset & Expense: Debit - Credit
      // Liability, Equity, Revenue: Credit - Debit
      const netBalance =
        acc.type === 'ASSET' || acc.type === 'EXPENSE'
          ? totalDebit - totalCredit
          : totalCredit - totalDebit;

      rows.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
      });
    }

    return rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  /**
   * Helper for tests: Reset state
   */
  public clear(): void {
    this.accounts.clear();
    this.transactions.clear();
    this.entries = [];
    this.invoices.clear();
    this.seedDefaultChartOfAccounts();
  }
}
