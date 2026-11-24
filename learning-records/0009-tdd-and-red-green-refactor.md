# Kỹ năng /tdd & /migrate-to-shoehorn: Chu trình Red - Green - Refactor

Nội dung làm chủ kỹ năng `/tdd`, `/implement`, và `/migrate-to-shoehorn` theo phương pháp Matt Pocock:

1. **Bản chất của TDD & Kiểm thử qua Seam**:
   - Thấu hiểu nguyên lý cốt lõi: Kiểm thử xác nhận hành vi hệ thống thông qua public interface, không phụ thuộc vào chi tiết triển khai nội bộ (implementation details).
   - Nhận diện và phòng tránh 3 anti-patterns phổ biến:
     - *Implementation-coupled*: Tránh mock quá mức và không kiểm thử các thành phần private.
     - *Tautological*: Giá trị kỳ vọng phải lấy từ nguồn độc lập quy định trong Spec, không tính toán lại bằng chính thuật toán cần kiểm thử.
     - *Horizontal Slicing*: Tránh tạo hàng loạt test case suy đoán trước khi code; thay vào đó phát triển theo từng Vertical Slice (1 test &rarr; 1 đoạn mã tối thiểu để pass &rarr; lặp lại).
   - Tuân thủ chu trình Red &rarr; Green: Viết bài test thất bại trước để kiểm chứng khả năng phát hiện lỗi, sau đó viết mã nguồn tối thiểu để bài test chuyển sang trạng thái thành công.

2. **Quản lý Test Fixtures với `@total-typescript/shoehorn`**:
   - Nhận diện rủi ro của ép kiểu `as` trong mã kiểm thử: làm mất tính an toàn của hệ thống kiểu dữ liệu, che giấu lỗi khi schema thay đổi và buộc phải khởi tạo các trường dữ liệu không phục vụ ca kiểm thử.
   - Ứng dụng `fromPartial<Product>`: Cho phép khởi tạo fixture bán phần với các trường cần thiết (ví dụ `id`, `physicalStock`) một cách an toàn kiểu dữ liệu, bảo đảm tính độc lập của test khi schema thực thể mở rộng.

3. **Hiện thực hóa trong dự án ERP**:
   - Xây dựng bộ kiểm thử tại `src/modules/inventory/inventory.test.ts` gồm 16 unit tests kiểm tra 4 nhóm hành vi:
     - *Slice 1*: Truy vấn tồn kho khả dụng (`getAvailableStock`), bảo toàn bất biến `Available Stock = Physical Stock - Active Reservations`.
     - *Slice 2*: Đặt trước hàng (`reserveStock`) với thời hạn TTL 15 phút và ngăn chặn bán vượt tồn kho (Anti-overselling).
     - *Slice 3*: Xác nhận thanh toán (`settleReservation` với `action: 'COMMIT'`) trừ tồn kho vật lý; phát hiện và xử lý ràng buộc từ chối khi phiên đặt trước đã hết hạn TTL (chu trình Red &rarr; Green thực tế).
     - *Slice 4*: Hủy đơn và hoàn hàng (`settleReservation` với `action: 'RELEASE'`), khôi phục tồn kho khả dụng.
   - Toàn bộ 16 bài kiểm thử chạy trên Vitest hoàn tất trong khoảng 10ms thông qua Seam `InMemoryInventoryRepository`, kiểm tra kiểu dữ liệu đạt 100% sạch với `tsc --noEmit`.
