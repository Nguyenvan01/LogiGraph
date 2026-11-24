# Phân tích và Xử lý Bug Concurrency / Race Condition thực tế trên Supabase

Người học đã bắt đầu **Module 5: Debug Chuyên sâu, Senior Code Review & Hoàn thiện Sản phẩm** với bài học đầu tiên về kỹ năng chẩn đoán Concurrency & Race Condition:

1. **Phương pháp Luận Chẩn đoán Lỗi 4 Bước có Căn cứ (`diagnosing-bugs`)**:
   - Áp dụng nghiêm ngặt kỷ luật từ Matt Pocock: **Reproduce &rarr; Isolate &rarr; Hypothesise &rarr; Verify**.
   - Tuyệt đối không phỏng đoán hay sửa vội mã nguồn khi chưa thiết lập được Feedback Loop thỏa mãn 3 tiêu chí: *Fast* (chạy trong vài giây), *Deterministic* (kết quả nhất quán) và *Red-capable* (có khả năng fail đỏ chính xác trên triệu chứng lỗi của người dùng).
   - Thu nhỏ kịch bản lỗi đến mức tối giản, bảo đảm mọi thành phần còn lại đều là *load-bearing*.
   - Đưa ra các Falsifiable Hypotheses và gắn các điểm đo có Unique Prefix (ví dụ `[DEBUG-...]`) để dọn sạch gọn gàng bằng lệnh grep ở bước hoàn thiện.

2. **Bản chất của Bug Concurrency: Cạm bẫy Check-Then-Act**:
   - Nhận diện lỗ hổng kinh điển khi tầng ứng dụng thực hiện Check tồn kho bằng câu truy vấn đọc view, sau đó mới gửi lệnh Act qua một truy vấn riêng biệt.
   - Network Latency và I/O giữa hai thao tác mở ra cơ hội tranh chấp tài nguyên: Hai yêu cầu đồng thời cùng đọc được tồn kho khả dụng còn 1, cùng vượt qua bước kiểm tra và cùng tạo bản ghi giữ hàng thành công, dẫn đến tình trạng Over-selling hoặc Double-booking làm tồn kho thực tế bị âm.

3. **Tư duy Phản biện `/wait-what` và Tham vấn `/ask-matt`**:
   - **/wait-what**: Nhận định rõ tại sao In-memory Mutex tại tầng Node.js hoàn toàn vô hiệu trong kiến trúc Cloud Serverless (Next.js triển khai trên nhiều Worker processes hoặc serverless instances độc lập). Single Source of Truth giữa các tiến trình chính là Cơ sở dữ liệu.
   - **/ask-matt**: So sánh 3 chiến lược concurrency trong cơ sở dữ liệu:
     - *Pessimistic Locking (`SELECT FOR UPDATE`)*: Khóa độc quyền cấp dòng trên bản ghi sản phẩm trong suốt transaction; ngăn chặn hoàn toàn Race Condition, thích hợp nhất cho bài toán tồn kho số lượng ít.
     - *Optimistic Concurrency Control (OCC)*: Sử dụng phiên bản dữ liệu (version column); hiệu năng cao khi contention thấp nhưng lãng phí tài nguyên do client phải retry liên tục khi tranh chấp cao.
     - *Serializable Isolation Level*: Đẩy việc kiểm tra cho database engine; đòi hỏi ứng dụng phải triển khai logic retry phức tạp.

4. **Hiện thực hóa Giải pháp Kiến trúc tại Tầng PostgreSQL**:
   - Xây dựng migration `supabase/migrations/20260928000004_atomic_inventory_concurrency.sql`:
     - Stored Procedure `reserve_stock_atomic`: Sử dụng `SELECT ... FOR UPDATE` trên bảng `products`, tính toán tồn kho khả dụng và insert `stock_reservations` trong cùng một transaction nguyên tử.
     - Stored Procedure `commit_reservation_atomic`: Khóa bản ghi reservation, kiểm tra TTL, trừ kho vật lý và chuyển trạng thái sang `COMMITTED`.
   - Nâng cấp `SupabaseInventoryRepository` trong `src/modules/inventory/adapters/supabase.ts` để gọi RPC với cơ chế ánh xạ mã lỗi database ('P0001', 'P0002', 'P0004') sang Domain Errors chuẩn mực (`InsufficientStockError`, `ProductNotFoundError`, `InvalidReservationStateError`).

5. **Bộ Kiểm thử Tự động Kiểm chứng Toàn diện**:
   - Thiết lập bộ test suite tại `src/modules/inventory/concurrency.test.ts`:
     - Tái hiện chính xác hiện tượng Over-selling khi sử dụng Read-Modify-Write không khóa dưới tải đồng thời.
     - Kiểm chứng cơ chế Row-level Lock Atomic RPC: 2 khách hàng đồng thời tranh mua 1 sản phẩm cuối cùng &rarr; Đúng 1 yêu cầu thành công, 1 yêu cầu bị từ chối sạch sẽ với `InsufficientStockError`.
     - Kịch bản stress test: 10 yêu cầu đồng thời tranh mua 2 sản phẩm còn lại &rarr; Đúng 2 yêu cầu thành công, 8 yêu cầu bị từ chối an toàn, tồn kho khả dụng bảo toàn con số 0, tuyệt đối không bị âm.
   - Toàn bộ 35/35 automated tests trong Vitest đều pass trong 554ms, TypeScript typecheck (`tsc --noEmit`) đạt 0 lỗi.
