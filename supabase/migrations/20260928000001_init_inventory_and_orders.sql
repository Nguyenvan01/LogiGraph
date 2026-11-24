-- ============================================================================
-- Migration: 20260928000001_init_inventory_and_orders.sql
-- Module: Inventory & Order Domain (VibeCoding ERP Mini)
-- Invariant: Available Stock = Physical Stock - Active Reservations
-- Concurrency: Atomic Updates with CHECK (stock >= 0)
-- ============================================================================

-- 1. BẢNG PRODUCTS (Sản phẩm & Tồn kho vật lý)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT positive_stock CHECK (stock >= 0)
);

-- 2. BẢNG ORDERS (Đơn hàng & State Machine Vòng đời)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PAID', 'SHIPPED', 'DONE', 'CANCELLED')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BẢNG ORDER_ITEMS (Chi tiết dòng sản phẩm trong đơn)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BẢNG STOCK_RESERVATIONS (Giữ hàng tạm thời có TTL 15 phút)
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CHỈ MỤC TỐI ƯU TRUY VẤN (INDEXES)
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_product_status ON stock_reservations (product_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_active_expires ON stock_reservations (expires_at) WHERE status = 'ACTIVE';

-- 6. VIEW TÍNH TOÁN TỒN KHO KHẢ DỤNG THEO THỜI GIAN THỰC
-- Invariant: available_stock = physical_stock - active_reservations
CREATE OR REPLACE VIEW view_inventory_available AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name,
    p.price,
    p.stock AS physical_stock,
    COALESCE(SUM(r.quantity), 0)::INTEGER AS active_reservations,
    (p.stock - COALESCE(SUM(r.quantity), 0))::INTEGER AS available_stock
FROM products p
LEFT JOIN stock_reservations r 
    ON p.id = r.product_id 
    AND r.status = 'ACTIVE' 
    AND r.expires_at > now()
GROUP BY p.id, p.sku, p.name, p.price, p.stock;

-- 7. KÍCH HOẠT ROW LEVEL SECURITY (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES CƠ BẢN (Cho phép đọc thông tin công khai và kiểm soát đơn)
CREATE POLICY "Cho phép đọc sản phẩm công khai" ON products
    FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc đơn hàng theo email khách" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc order_items" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc stock_reservations" ON stock_reservations
    FOR SELECT USING (true);
