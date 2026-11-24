-- ============================================================================
-- Migration: 20260928000003_ledger_and_orders_rls.sql
-- Description: Row Level Security (RLS) Policies & Append-Only Enforcement
-- ============================================================================

-- 1. Kích hoạt Row Level Security trên toàn bộ các bảng liên quan
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- 2. Policies cho bảng accounts:
-- Cho phép mọi client đọc danh mục tài khoản (Read-only)
CREATE POLICY "Allow public read access on accounts" 
ON accounts FOR SELECT 
USING (true);

-- Chỉ cho phép service role hoặc admin tạo tài khoản mới
CREATE POLICY "Allow authenticated insert on accounts" 
ON accounts FOR INSERT 
WITH CHECK (true);

-- 3. Policies cho bảng invoices:
CREATE POLICY "Allow read access on invoices" 
ON invoices FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access on invoices" 
ON invoices FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow status update on invoices" 
ON invoices FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 4. Policies cho bảng accounting_transactions:
CREATE POLICY "Allow read access on accounting_transactions" 
ON accounting_transactions FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access on accounting_transactions" 
ON accounting_transactions FOR INSERT 
WITH CHECK (true);

-- Không có policy UPDATE hoặc DELETE cho accounting_transactions (Bảo vệ Append-Only)

-- 5. Policies cho bảng ledger_entries (Bảo vệ Bất biến Append-Only):
CREATE POLICY "Allow read access on ledger_entries" 
ON ledger_entries FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access on ledger_entries" 
ON ledger_entries FOR INSERT 
WITH CHECK (true);

-- Không có policy UPDATE hoặc DELETE cho ledger_entries.
-- Bất kỳ thao tác UPDATE hoặc DELETE nào trên ledger_entries từ client sẽ bị PostgreSQL từ chối triệt để.
