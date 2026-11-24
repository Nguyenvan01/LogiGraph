import {
  Account,
  AccountingTransaction,
  ILedgerRepository,
  Invoice,
  InvoiceStatus,
  LedgerEntry,
  TrialBalanceRow,
} from '../domain/types.js';

export interface SupabaseClientStub {
  from(table: string): any;
  rpc(fn: string, args?: any): any;
}

/**
 * SupabaseLedgerRepository — Production Adapter targeting PostgreSQL on Supabase.
 * Enforces Append-only constraints and queries real-time view_ledger_trial_balance.
 */
export class SupabaseLedgerRepository implements ILedgerRepository {
  constructor(private readonly client: SupabaseClientStub) {}

  public async createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .insert({
        code: account.code,
        name: account.name,
        type: account.type,
      })
      .select('id, code, name, type, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create account in Supabase: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      type: data.type,
      createdAt: new Date(data.created_at),
    };
  }

  public async getAccountByCode(code: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from('accounts')
      .select('id, code, name, type, created_at')
      .eq('code', code)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      type: data.type,
      createdAt: new Date(data.created_at),
    };
  }

  public async getAccountById(id: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from('accounts')
      .select('id, code, name, type, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      type: data.type,
      createdAt: new Date(data.created_at),
    };
  }

  public async getAllAccounts(): Promise<Account[]> {
    const { data, error } = await this.client
      .from('accounts')
      .select('id, code, name, type, created_at')
      .order('code', { ascending: true });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      type: d.type,
      createdAt: new Date(d.created_at),
    }));
  }

  public async createInvoice(invoice: Omit<Invoice, 'id' | 'issuedAt'>): Promise<Invoice> {
    const { data, error } = await this.client
      .from('invoices')
      .insert({
        order_id: invoice.orderId,
        invoice_number: invoice.invoiceNumber,
        subtotal: invoice.subtotal,
        tax_amount: invoice.taxAmount,
        total_amount: invoice.totalAmount,
        status: invoice.status,
      })
      .select('id, order_id, invoice_number, subtotal, tax_amount, total_amount, status, issued_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create invoice in Supabase: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      orderId: data.order_id,
      invoiceNumber: data.invoice_number,
      subtotal: Number(data.subtotal),
      taxAmount: Number(data.tax_amount),
      totalAmount: Number(data.total_amount),
      status: data.status,
      issuedAt: new Date(data.issued_at),
    };
  }

  public async getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
    const { data, error } = await this.client
      .from('invoices')
      .select('id, order_id, invoice_number, subtotal, tax_amount, total_amount, status, issued_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      orderId: data.order_id,
      invoiceNumber: data.invoice_number,
      subtotal: Number(data.subtotal),
      taxAmount: Number(data.tax_amount),
      totalAmount: Number(data.total_amount),
      status: data.status,
      issuedAt: new Date(data.issued_at),
    };
  }

  public async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
    const { error } = await this.client
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId);

    if (error) {
      throw new Error(`Failed to update invoice status in Supabase: ${error.message}`);
    }
  }

  public async recordTransaction(
    description: string,
    entries: { accountId: string; amount: number; direction: 'DEBIT' | 'CREDIT' }[],
    referenceId?: string
  ): Promise<{ transaction: AccountingTransaction; entries: LedgerEntry[] }> {
    // 1. Insert parent accounting_transaction
    const { data: txData, error: txError } = await this.client
      .from('accounting_transactions')
      .insert({
        description,
        reference_id: referenceId,
      })
      .select('id, reference_id, description, posted_at')
      .single();

    if (txError || !txData) {
      throw new Error(`Failed to insert accounting transaction: ${txError?.message || 'Unknown error'}`);
    }

    // 2. Insert child ledger_entries with parent transaction_id
    const entriesToInsert = entries.map((e) => ({
      transaction_id: txData.id,
      account_id: e.accountId,
      amount: e.amount,
      direction: e.direction,
    }));

    const { data: entriesData, error: entriesError } = await this.client
      .from('ledger_entries')
      .insert(entriesToInsert)
      .select('id, transaction_id, account_id, amount, direction, created_at');

    if (entriesError || !entriesData) {
      throw new Error(`Failed to insert ledger entries: ${entriesError?.message || 'Unknown error'}`);
    }

    return {
      transaction: {
        id: txData.id,
        referenceId: txData.reference_id,
        description: txData.description,
        postedAt: new Date(txData.posted_at),
      },
      entries: entriesData.map((d: any) => ({
        id: d.id,
        transactionId: d.transaction_id,
        accountId: d.account_id,
        amount: Number(d.amount),
        direction: d.direction,
        createdAt: new Date(d.created_at),
      })),
    };
  }

  public async getTrialBalance(): Promise<TrialBalanceRow[]> {
    const { data, error } = await this.client
      .from('view_ledger_trial_balance')
      .select('account_id, account_code, account_name, account_type, total_debit, total_credit, net_balance');

    if (error || !data) return [];

    return data.map((d: any) => ({
      accountId: d.account_id,
      accountCode: d.account_code,
      accountName: d.account_name,
      accountType: d.account_type,
      totalDebit: Number(d.total_debit),
      totalCredit: Number(d.total_credit),
      netBalance: Number(d.net_balance),
    }));
  }
}
