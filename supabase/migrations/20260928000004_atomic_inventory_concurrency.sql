-- ============================================================================
-- Migration: 20260928000004_atomic_inventory_concurrency.sql
-- Module: Inventory Concurrency & Race Condition Prevention
-- Skill: diagnosing-bugs, wait-what, ask-matt
-- Pattern: Database-level Row Locking (SELECT FOR UPDATE) via PostgreSQL RPC
-- Invariant: Available Stock = Physical Stock - Active Reservations >= 0
-- ============================================================================

-- 1. HÀM RPC ĐẶT GIỮ HÀNG NGUYÊN TỬ (ATOMIC STOCK RESERVATION)
-- Sử dụng Row-level Lock (SELECT FOR UPDATE) trên bảng products
-- để khóa dòng sản phẩm trong suốt thời gian kiểm tra và tạo reservation.
-- Mọi giao dịch cạnh tranh (concurrent transactions) sẽ phải xếp hàng chờ,
-- loại bỏ hoàn toàn hiện tượng Race Condition (Over-selling / Double-booking).

CREATE OR REPLACE FUNCTION reserve_stock_atomic(
    p_product_id UUID,
    p_quantity INTEGER,
    p_order_id UUID DEFAULT NULL,
    p_ttl_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_physical_stock INTEGER;
    v_active_reservations INTEGER;
    v_available_stock INTEGER;
    v_reservation_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- 1. Khóa dòng sản phẩm tại bảng products bằng Row-Level Exclusive Lock
    SELECT stock INTO v_physical_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Tính toán tổng active reservations hiện tại trong cùng lock context
    SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_active_reservations
    FROM stock_reservations
    WHERE product_id = p_product_id
      AND status = 'ACTIVE'
      AND expires_at > v_now;

    -- 3. Tính tồn kho khả dụng thực tế
    v_available_stock := v_physical_stock - v_active_reservations;

    -- 4. Kiểm tra điều kiện tồn kho
    IF v_available_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: requested %, available %',
            p_product_id, p_quantity, v_available_stock
            USING ERRCODE = 'P0001';
    END IF;

    -- 5. Thực hiện tạo reservation mới
    v_reservation_id := gen_random_uuid();
    v_expires_at := v_now + (p_ttl_minutes || ' minutes')::INTERVAL;

    INSERT INTO stock_reservations (
        id,
        order_id,
        product_id,
        quantity,
        status,
        expires_at,
        created_at,
        updated_at
    ) VALUES (
        v_reservation_id,
        p_order_id,
        p_product_id,
        p_quantity,
        'ACTIVE',
        v_expires_at,
        v_now,
        v_now
    );

    -- 6. Trả về thông tin bản ghi vừa tạo dưới định dạng JSONB
    RETURN jsonb_build_object(
        'id', v_reservation_id,
        'productId', p_product_id,
        'orderId', p_order_id,
        'quantity', p_quantity,
        'status', 'ACTIVE',
        'expiresAt', v_expires_at,
        'createdAt', v_now,
        'updatedAt', v_now
    );
END;
$$;

-- 2. HÀM RPC CHỐT GIỮ HÀNG NGUYÊN TỬ (ATOMIC SETTLE & COMMIT RESERVATION)
-- Đảm bảo việc trừ tồn kho vật lý và chuyển trạng thái reservation thành COMMITTED
-- diễn ra trong một giao dịch nguyên tử có kiểm tra thời hạn TTL.

CREATE OR REPLACE FUNCTION commit_reservation_atomic(
    p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- 1. Khóa bản ghi reservation bằng FOR UPDATE
    SELECT * INTO v_res
    FROM stock_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation with ID % not found', p_reservation_id
            USING ERRCODE = 'P0003';
    END IF;

    -- 2. Kiểm tra tính hợp lệ của trạng thái
    IF v_res.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Invalid reservation state: expected ACTIVE, found %', v_res.status
            USING ERRCODE = 'P0004';
    END IF;

    -- 3. Kiểm tra thời hạn hiệu lực (TTL)
    IF v_res.expires_at <= v_now THEN
        UPDATE stock_reservations
        SET status = 'EXPIRED', updated_at = v_now
        WHERE id = p_reservation_id;

        RAISE EXCEPTION 'Reservation % has expired at %', p_reservation_id, v_res.expires_at
            USING ERRCODE = 'P0005';
    END IF;

    -- 4. Khóa và trừ tồn kho vật lý trên bảng products
    UPDATE products
    SET stock = stock - v_res.quantity,
        updated_at = v_now
    WHERE id = v_res.product_id;

    -- 5. Cập nhật trạng thái reservation sang COMMITTED
    UPDATE stock_reservations
    SET status = 'COMMITTED',
        updated_at = v_now
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'id', p_reservation_id,
        'status', 'COMMITTED',
        'updatedAt', v_now
    );
END;
$$;
