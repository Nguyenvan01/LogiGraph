# Nguyên lý Grilling & Quyết định Kỹ thuật Module Inventory

Người học đã làm chủ bản chất kỹ thuật của skill `/grill-me`: xây dựng Design Tree, xác định và chỉ đặt câu hỏi tại Frontier, đồng thời phân định rạch ròi giữa Facts (AI tự tra cứu bằng tools) và Decisions (con người quyết định dựa trên trade-offs).

Đối với dự án VibeCoding ERP Mini, đã thống nhất 2 quyết định kỹ thuật:
1. Cơ chế trừ kho: Áp dụng pattern Stock Reservation with 15-min TTL để cân bằng giữa việc chống overselling và tránh tồn kho ảo.
2. Concurrency Control: Sử dụng Atomic SQL Update kết hợp PostgreSQL Check Constraint `CHECK (stock >= 0)` trên Supabase để bảo đảm tính toàn vẹn dữ liệu ở tầng Database Engine (ACID).
