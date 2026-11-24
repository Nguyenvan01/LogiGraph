/**
 * ============================================================================
 * Ledger Module — Domain Specific Errors
 * ============================================================================
 */

export class UnbalancedTransactionError extends Error {
  constructor(
    public readonly totalDebit: number,
    public readonly totalCredit: number,
    public readonly difference: number
  ) {
    super(
      `Accounting transaction is unbalanced: total Debit (${totalDebit.toFixed(2)}) must equal total Credit (${totalCredit.toFixed(2)}). Difference is ${difference.toFixed(2)}.`
    );
    this.name = 'UnbalancedTransactionError';
  }
}

export class InvalidEntryAmountError extends Error {
  constructor(public readonly amount: number) {
    super(`Ledger entry amount must be strictly positive (> 0). Received: ${amount}.`);
    this.name = 'InvalidEntryAmountError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(public readonly identifier: string) {
    super(`Account '${identifier}' not found in Chart of Accounts.`);
    this.name = 'AccountNotFoundError';
  }
}

export class InsufficientEntriesError extends Error {
  constructor(public readonly count: number) {
    super(`An accounting transaction requires at least 2 entries (debit and credit). Received: ${count}.`);
    this.name = 'InsufficientEntriesError';
  }
}

export class InvoiceNotFoundError extends Error {
  constructor(public readonly orderIdOrInvoiceId: string) {
    super(`Invoice not found for reference: ${orderIdOrInvoiceId}.`);
    this.name = 'InvoiceNotFoundError';
  }
}
