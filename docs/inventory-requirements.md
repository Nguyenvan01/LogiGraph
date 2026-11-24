# Yêu cầu Kỹ thuật Module Kho Vận (Inventory Requirements)

Tài liệu được chốt từ phiên làm việc với `/grill-me` (Bài 01).

## 1. Cơ chế Trừ tồn kho (Stock Reservation with TTL)
- Khi khách hàng tạo đơn hàng (Order Created), hệ thống tạo một bản ghi **Stock Reservation** với thời hạn (TTL) là **15 phút**.
- Số lượng hàng có thể bán khả dụng: `Available Stock = Physical Stock - Active Reservations`.
- Nếu đơn hàng chuyển sang trạng thái thanh toán thành công (`Paid`), số lượng hàng tạm giữ sẽ được trừ vĩnh viễn vào `Physical Stock` và reservation kết thúc.
- Nếu quá 15 phút chưa thanh toán, reservation tự động hết hạn và hàng được trả về trạng thái khả dụng cho người khác mua.

## 2. Kiểm soát Tranh chấp Đồng thời (Concurrency Control trên Supabase/PostgreSQL)
- Bảng `products` có ràng buộc kiểm tra toàn vẹn: `CONSTRAINT positive_stock CHECK (stock >= 0)`.
- Mọi thao tác trừ kho đều thực hiện thông qua câu lệnh SQL nguyên tử:
  ```sql
  UPDATE products
  SET stock = stock - :quantity
  WHERE id = :product_id AND stock >= :quantity;
  ```
- Nếu không có hàng thỏa mãn điều kiện `stock >= quantity`, câu lệnh sẽ trả về 0 rows updated, hệ thống ném ra lỗi `INSUFFICIENT_STOCK` mà không làm hỏng dữ liệu.
