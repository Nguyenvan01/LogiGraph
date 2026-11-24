# Technical Specification: Billing & Double-Entry Ledger Management

Status: ready-for-agent

## Problem Statement

Traditional billing and inventory systems frequently suffer from financial desynchronization: orders are marked as paid, but corresponding revenues and receivables fail to record accurately, or cash amounts disagree with physical inventory movements. Furthermore, mutating existing transaction records introduces audit vulnerabilities and makes tracing accounting discrepancies virtually impossible under regulatory scrutiny. Without a mathematically enforced double-entry accounting discipline, concurrent transactions and partial failures corrupt trial balances.

## Solution

An immutable, ACID-compliant Double-Entry Bookkeeping and Invoicing engine built for VibeCoding ERP with Next.js 15, TypeScript, and Supabase PostgreSQL. Every financial occurrence produces an atomic `AccountingTransaction` bundling two or more `LedgerEntry` records satisfying the strict mathematical invariant:
$$\sum \text{Debit} = \sum \text{Credit}$$

The system enforces an append-only ledger model where past records cannot be updated or deleted. When an order transitions to `PAID`, an immutable `Invoice` is created, and balanced journal entries automatically record revenue realization (Debit 112 Bank, Credit 511 Sales Revenue) and inventory relief (Debit 632 COGS, Credit 156 Inventory). Any order cancellation or refund creates a compensatory reversing entry, preserving an audit-proof trail.

## User Stories

1. As a finance officer, I want every paid order to generate an official `Invoice` with an auto-incremented invoice number and accurate subtotal, tax, and total amount, so that customers receive valid proof of purchase.
2. As a finance officer, I want the system to automatically record a balanced journal entry when an invoice is paid (Debit: 112 Bank Account, Credit: 511 Sales Revenue), so that cash inflows and sales revenue match order totals.
3. As a finance officer, I want the system to automatically record the cost of goods sold upon order fulfillment (Debit: 632 COGS, Credit: 156 Merchandise Inventory), so that warehouse asset reduction aligns with financial statements.
4. As a system administrator, I want every accounting transaction to be rejected and rolled back if total Debit does not strictly equal total Credit, so that unbalanced postings never corrupt the general ledger.
5. As an auditor, I want ledger entries to be strictly append-only (no UPDATE or DELETE operations permitted), so that the financial history is immutable and tamper-evident.
6. As a customer support agent, I want an order refund to produce an explicit compensatory reversing transaction (Debit: 511 Sales Revenue, Credit: 112 Bank Account) rather than deleting previous records, so that refunds remain fully auditable.
7. As a finance officer, I want to query a real-time Trial Balance view aggregating total debit, total credit, and net balance across all defined accounts, so that financial health can be inspected instantaneously.
8. As a developer, I want to execute unit tests on the ledger service using an in-memory repository without connecting to Supabase PostgreSQL, so that tests run sub-millisecond in local CI.

## Implementation Decisions

### 1. Ubiquitous Language Conformance
All modules, schemas, functions, and tests MUST strictly adhere to the terms defined in `CONTEXT.md`:
- `Account` (categorized bucket in Chart of Accounts)
- `Chart of Accounts` (standard registry: 111, 112, 156, 511, 632)
- `Accounting Transaction` (atomic business event containing balanced entries)
- `Ledger Entry` (single posting line with direction DEBIT or CREDIT)
- `Invoice` (formal billing document linked to an order)
- `Double-entry Ledger` (financial record enforcing balance)

### 2. Core Mathematical Invariants
Every `AccountingTransaction` MUST strictly satisfy:
```ts
const totalDebit = entries
  .filter((e) => e.direction === 'DEBIT')
  .reduce((sum, e) => sum + e.amount, 0);

const totalCredit = entries
  .filter((e) => e.direction === 'CREDIT')
  .reduce((sum, e) => sum + e.amount, 0);

if (totalDebit !== totalCredit) {
  throw new UnbalancedTransactionError(totalDebit, totalCredit);
}
```

### 3. Standard Journal Postings Matrix

| Business Event | Reference Document | Debit Account | Credit Account | Amount |
| :--- | :--- | :--- | :--- | :--- |
| **Order Payment** | Order ID / Invoice | `112` (Bank Deposit) | `511` (Sales Revenue) | Order Total Amount |
| **Inventory Fulfillment** | Order Delivery | `632` (Cost of Goods Sold) | `156` (Merchandise Inventory) | Total Cost of Items |
| **Order Refund** | Cancellation / Refund | `511` (Sales Revenue) | `112` (Bank Deposit) | Refunded Amount |

### 4. Architecture & Seam Design (`ILedgerRepository`)
To keep the ledger engine decoupled from database infrastructure, all persistence operations pass through a single Seam interface:

```ts
// Seam Interface: src/modules/ledger/repository.interface.ts
export interface ILedgerRepository {
  createAccount(account: CreateAccountDTO): Promise<Account>;
  getAccountByCode(code: string): Promise<Account | null>;
  createInvoice(invoice: CreateInvoiceDTO): Promise<Invoice>;
  getInvoiceByOrderId(orderId: string): Promise<Invoice | null>;
  recordTransaction(
    tx: CreateTransactionDTO,
    entries: CreateLedgerEntryDTO[]
  ): Promise<AccountingTransactionWithEntries>;
  getTrialBalance(): Promise<TrialBalanceRow[]>;
}
```

Two concrete adapters implement this seam:
- **`InMemoryLedgerRepository`**: Fast, in-memory Map-based storage used for unit tests.
- **`SupabaseLedgerRepository`**: Production implementation using `@supabase/supabase-js` targeting the PostgreSQL database.

## Testing Decisions

1. **Test Runner**: Vitest (`npm test`).
2. **Execution Speed**: All ledger unit tests must run in `< 50ms` using `InMemoryLedgerRepository`.
3. **Shoehorn Usage**: Use `@total-typescript/shoehorn` or structured test builders for partial test fixtures to avoid brittle test assertions.
4. **Coverage Invariants**:
   - Creating valid balanced transaction succeeds.
   - Creating unbalanced transaction (`Debit !== Credit`) throws `UnbalancedTransactionError`.
   - Recording transaction with negative or zero amounts throws `InvalidEntryAmountError`.
   - Recording transaction referencing non-existent account code throws `AccountNotFoundError`.
   - Generating invoice for paid order calculates correct subtotal, tax, and total.
   - Reversing transaction produces inverted debit/credit entries matching original amounts.
