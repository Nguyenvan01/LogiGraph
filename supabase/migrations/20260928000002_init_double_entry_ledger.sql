-- ============================================================================
-- Migration: 20260928000002_init_double_entry_ledger.sql
-- Description: Double-Entry Bookkeeping Ledger, Chart of Accounts, and Invoices
-- Invariant: SUM(debit) = SUM(credit) per accounting transaction
-- ============================================================================

-- 1. Chart of Accounts (Danh mục tài khoản kế toán)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invoices (Hóa đơn chứng từ gắn với đơn hàng)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID')),
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Accounting Transactions (Giao dịch kế toán tổng thể)
CREATE TABLE IF NOT EXISTS accounting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(100),
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ledger Entries (Các bút toán chi tiết hạch toán hai vế Debit/Credit)
-- Lưu ý: Bảng này là Append-Only, không cho phép UPDATE hoặc DELETE trong thực tế
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES accounting_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes tối ưu truy vấn đối soát
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

-- 5. Database View: Trial Balance (Bảng cân đối số phát sinh các tài khoản)
CREATE OR REPLACE VIEW view_ledger_trial_balance AS
SELECT 
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE 0 END), 0)::DECIMAL(15, 2) AS total_debit,
    COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE 0 END), 0)::DECIMAL(15, 2) AS total_credit,
    (
        CASE 
            WHEN a.type IN ('ASSET', 'EXPENSE') THEN 
                COALESCE(SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE -e.amount END), 0)
            ELSE 
                COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
        END
    )::DECIMAL(15, 2) AS net_balance
FROM accounts a
LEFT JOIN ledger_entries e ON a.id = e.account_id
GROUP BY a.id, a.code, a.name, a.type;

-- 6. Seed Data: Danh mục tài khoản kế toán doanh nghiệp tiêu chuẩn
INSERT INTO accounts (code, name, type) VALUES
    ('111', 'Cash on Hand', 'ASSET'),
    ('112', 'Bank Deposit Account', 'ASSET'),
    ('156', 'Merchandise Inventory', 'ASSET'),
    ('511', 'Sales Revenue', 'REVENUE'),
    ('632', 'Cost of Goods Sold', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;
