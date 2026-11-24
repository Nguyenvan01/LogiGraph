# Nghiên cứu: Mô hình Kế toán Kép (Double-Entry Bookkeeping) cho Hệ thống ERP

Tài liệu nghiên cứu được khởi tạo theo chuẩn skill `/research` của Matt Pocock, phục vụ cho Ticket 01 trên Wayfinder Map.

## 1. Câu hỏi Nghiên cứu (Research Question)
Làm thế nào để thiết kế schema và quy tắc hạch toán kế toán kép (Double-Entry Bookkeeping) trên PostgreSQL/Supabase đảm bảo tính toàn vẹn dữ liệu, chống mất cân đối số dư và hỗ trợ đối soát tự động?

## 2. Các Nguồn sơ cấp được khảo sát (Primary Sources)
- [Martin Fowler — Accounting Patterns](https://martinfowler.com/eaaDev/AccountingTransaction.html): Mẫu thiết kế chuẩn cho `Account`, `Entry` và `AccountingTransaction`.
- [PostgreSQL Documentation — Constraints & Triggers](https://www.postgresql.org/docs/current/ddl-constraints.html): Cơ chế ràng buộc toàn vẹn dữ liệu ở tầng Database Engine.
- [RFC/Accounting Standards — Double-Entry Ledger Principles](https://en.wikipedia.org/wiki/Double-entry_bookkeeping): Nguyên lý bất biến `Debit === Credit`.

## 3. Các Kết luận Kỹ thuật Cốt lõi (Key Findings)

### 3.1. Bất biến cơ bản (The Core Invariant)
Mỗi sự kiện kinh tế (bán hàng, nhập kho, thanh toán) được đại diện bằng một **Transaction**. Mỗi Transaction chứa ít nhất hai **Entries**:
- **Debit Entry (Ghi Nợ):** Tăng tài sản hoặc chi phí.
- **Credit Entry (Ghi Có):** Tăng nợ phải trả, vốn chủ sở hữu hoặc doanh thu.
- **Quy tắc bất biến:**
  $$\sum \text{Debit} = \sum \text{Credit}$$
  Bất kỳ Transaction nào có tổng Nợ khác tổng Có đều là giao dịch không hợp lệ và phải bị hủy (Rollback).

### 3.2. Cấu trúc Schema đề xuất cho PostgreSQL / Supabase
```sql
-- 1. Bảng tài khoản kế toán (Chart of Accounts)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ví dụ: '111' (Tiền mặt), '156' (Hàng hóa), '511' (Doanh thu)
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng giao dịch tổng thể (Transactions)
CREATE TABLE accounting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(100), -- Ví dụ: Order ID hoặc Invoice ID liên quan
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng các bút toán chi tiết (Entries)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES accounting_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3. Ràng buộc toàn vẹn tại Database
Để đảm bảo bất biến `SUM(Debit) === SUM(Credit)`, hệ thống sẽ sử dụng PostgreSQL Constraint Trigger hoặc kiểm tra trong cùng một Database Transaction trước khi `COMMIT`.
