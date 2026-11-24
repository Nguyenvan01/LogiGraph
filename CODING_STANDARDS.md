# Coding Standards — VibeCoding ERP Mini

Tài liệu này xác định các tiêu chuẩn kỹ thuật bắt buộc cho toàn bộ mã nguồn của dự án VibeCoding ERP Mini (Next.js 15, Supabase PostgreSQL, TypeScript, Vitest).

---

## 1. Kiến trúc Deep Modules & Seams (John Ousterhout)

1. **Giao diện hẹp, hiện thực sâu (Small Interface, Deep Implementation)**:
   - Mỗi module domain (như `InventoryService`, `LedgerService`) phải giấu toàn bộ độ phức tạp nghiệp vụ đằng sau một interface tối giản từ 3 đến 5 phương thức công khai.
   - Không để lộ chi tiết nội bộ (như cấu trúc bảng cơ sở dữ liệu, câu lệnh SQL thô, hoặc thuật toán tính toán) ra ngoài interface công khai.
2. **Điểm may kỹ thuật (Clean Seams)**:
   - Tầng domain logic tuyệt đối không phụ thuộc trực tiếp vào Next.js Server Actions hoặc Supabase Client.
   - Mọi tương tác dữ liệu phải đi qua interface kho dữ liệu (`IInventoryRepository`, `ILedgerRepository`).
   - Cung cấp tối thiểu 2 Adapter cho mỗi Seam:
     - `InMemoryAdapter`: Phục vụ unit test tốc độ cao (< 5ms) trong Vitest mà không cần mock mạng.
     - `SupabaseAdapter`: Kết nối trực tiếp cơ sở dữ liệu thật với đầy đủ Row-level Lock và RLS.

---

## 2. Quy tắc Kiểu dữ liệu & Type Safety (TypeScript)

1. **Strict Mode**: `tsconfig.json` bắt buộc bật `strict: true`. Không sử dụng kiểu `any` tùy tiện ngoại trừ các stub/mock cơ bản.
2. **Branded Types**: Định danh các thực thể quan trọng bằng branded type (`ProductId`, `OrderId`, `ReservationId`, `AccountCode`) để ngăn ngừa lỗi truyền nhầm kiểu chuỗi nguyên thủy (Primitive Obsession).
3. **Zod Validation Guards**: Mọi đầu vào từ người dùng vào Server Actions phải được validate qua Zod schema trước khi chuyển tiếp vào Domain Services.

---

## 3. Quản lý Concurrency & Tính toàn vẹn Dữ liệu (Database Engine)

1. **Anti-Overselling Invariant**: Tồn kho khả dụng phải luôn tuân thủ công thức:
   $$\text{Available Stock} = \text{Physical Stock} - \text{Active Reservations} \ge 0$$
2. **Row-level Locking**: Nghiêm cấm mô hình Check-Then-Act bằng các truy vấn đọc/ghi rời rạc trên tầng ứng dụng. Mọi thao tác đặt giữ hàng và trừ kho phải đóng gói trong Stored Procedure với `SELECT ... FOR UPDATE`.
3. **Double-Entry Balance Invariant**: Mọi giao dịch sổ cái phải bảo đảm tổng số tiền Nợ bằng tổng số tiền Có ($\sum \text{Debit} === \sum \text{Credit}$). Bảng sổ cái là Append-only, không cho phép `UPDATE` hoặc `DELETE`.

---

## 4. Kiểm thử Tự động (TDD & Vitest)

1. **Tốc độ thực thi**: Toàn bộ unit và integration test suite phải chạy trong dưới 1 giây.
2. **Shoehorn Utility**: Trong các file test, sử dụng `fromPartial<T>()` từ `@total-typescript/shoehorn` để khởi tạo dữ liệu kiểm thử, tránh ép kiểu thô bạo bằng `as T`.
3. **Không để sót debug probe**: Trước khi hoàn tất mã nguồn, toàn bộ log debug có tiền tố `[DEBUG-...]` phải được dọn dẹp sạch sẽ.

---

## 5. Fowler Code Smells Baseline (Refactoring, Ch.3)

Mã nguồn phải được rà soát định kỳ để loại bỏ 12 Code Smells kinh điển:
- `Mysterious Name` &rarr; Đặt tên tường minh theo Ubiquitous Language trong `CONTEXT.md`.
- `Duplicated Code` &rarr; Trích xuất logic dùng chung.
- `Feature Envy` &rarr; Chuyển phương thức về đúng đối tượng sở hữu dữ liệu.
- `Data Clumps` &rarr; Đóng gói các tham số thường đi cùng nhau thành một kiểu dữ liệu.
- `Primitive Obsession` &rarr; Thay thế chuỗi nguyên thủy bằng Branded Types hoặc Domain Value Objects.
- `Repeated Switches` &rarr; Thay thế bằng Strategy Pattern hoặc Dictionary Mapping.
- `Shotgun Surgery` &rarr; Gom các thành phần cùng thay đổi vào một module duy nhất.
- `Divergent Change` &rarr; Tách module nếu một file phải sửa đổi vì nhiều lý do không liên quan.
- `Speculative Generality` &rarr; Xóa bỏ các tham số, hook, abstraction dự phòng chưa có trong spec.
- `Message Chains` &rarr; Ẩn chuỗi truy cập lồng nhau đằng sau một phương thức trực tiếp.
- `Middle Man` &rarr; Loại bỏ các lớp trung gian không gia tăng giá trị.
- `Refused Bequest` &rarr; Ưu tiên Composition hơn Inheritance khi không sử dụng hết hành vi kế thừa.
