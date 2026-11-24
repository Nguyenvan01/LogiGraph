/**
 * ============================================================================
 * Ledger Module — Domain Types & Seam Interface
 * ============================================================================
 * Strictly adheres to CONTEXT.md terminology:
 * - Account, Chart of Accounts, Accounting Transaction, Ledger Entry, Invoice
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type EntryDirection = 'DEBIT' | 'CREDIT';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  createdAt: Date;
}

export interface AccountingTransaction {
  id: string;
  referenceId?: string;
  description: string;
  postedAt: Date;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number;
  direction: EntryDirection;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedAt: Date;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

export interface CreateEntryInput {
  accountCode: string;
  amount: number;
  direction: EntryDirection;
}

export interface CreateInvoiceInput {
  orderId: string;
  subtotal: number;
  taxAmount?: number;
}

/**
 * Seam Interface: ILedgerRepository
 * Decouples the Ledger Core Service from any persistence mechanism.
 */
export interface ILedgerRepository {
  createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
  getAccountByCode(code: string): Promise<Account | null>;
  getAccountById(id: string): Promise<Account | null>;
  getAllAccounts(): Promise<Account[]>;
  createInvoice(invoice: Omit<Invoice, 'id' | 'issuedAt'>): Promise<Invoice>;
  getInvoiceByOrderId(orderId: string): Promise<Invoice | null>;
  updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void>;
  recordTransaction(
    description: string,
    entries: { accountId: string; amount: number; direction: EntryDirection }[],
    referenceId?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }>;
  getTrialBalance(): Promise<TrialBalanceRow[]>;
}
