# Nghiên cứu & Đánh giá Thư viện Kéo thả (Drag & Drop) và Thuật toán Sắp xếp (Fractional Indexing) cho Kanban Board

Tài liệu này tổng hợp phân tích kỹ thuật, so sánh ưu/nhược điểm của 5 thư viện kéo thả React phổ biến và các chiến lược quản lý vị trí (Reorder) cho ứng dụng Kanban Dashboard.

---

## 1. So sánh Tổng quan 5 Thư viện Drag & Drop cho React

| Thư viện | Bundle Size | Cơ chế cốt lõi | Hỗ trợ Kanban đa cột | Trải nghiệm Animation | Mobile / Touch | Điểm đề xuất |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`@dnd-kit`** | ~12 KB | Hook-based (`useSortable`, sensor tree) | **Xuất sắc** (thuật toán `closestCorners`) | Rất mượt (CSS transform qua `DragOverlay`) | Hỗ trợ sensor gốc mượt mà | **9.5 / 10** (Khuyến nghị số 1) |
| **`@hello-pangea/dnd`** | ~35 KB | Component-based (Kế thừa `react-beautiful-dnd`) | **Tốt** (chuẩn Trello) | Đẹp tự nhiên (Physics spring có sẵn) | Tự động hỗ trợ | **8.5 / 10** (Tốt cho prototype nhanh) |
| **`pragmatic-drag-and-drop`** | ~4-8 KB | Native HTML5 Drag & Drop (Thế hệ mới của Atlassian) | **Rất tốt** (Jira/Confluence sử dụng) | Tự cấu hình bằng CSS/drop indicator | Hỗ trợ adapter mobile | **9.0 / 10** (Tối ưu hiệu năng quy mô lớn) |
| **`framer-motion`** | ~30 KB | `<Reorder.Group>` & layout animation | **Kém** (chỉ mạnh sắp xếp 1 danh sách đơn) | Xuất sắc nhất (FLIP spring animation) | Mượt | **7.0 / 10** (Khó xử lý chuyển thẻ giữa các cột) |
| **`react-dnd`** | ~25 KB | HTML5 DragDrop backend / monitors | **Trung bình** (cần tự code logic sortable) | Thô nếu không tự viết CSS phức tạp | Cần cài thêm touch-backend | **6.5 / 10** (Quá phức tạp, không hợp Kanban) |

---

## 2. Đánh giá Chi tiết Từng Thư viện

### 1. `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
* **Kiến trúc**: Thiết kế theo phong cách React hiện đại (Functional components & Custom hooks), hoàn toàn tương thích React 18 và React 19 (không bị lỗi StrictMode).
* **Ưu điểm lớn nhất**:
  * Cung cấp sẵn cơ chế **Multi-container Sortable**: Thẻ có thể bay mượt mà giữa các cột khác nhau nhờ thuật toán phát hiện va chạm linh hoạt (`closestCorners`, `rectIntersection`).
  * Có component `<DragOverlay>` giúp thẻ đang kéo được render ở tầng trên cùng (portal), không bị vỡ layout hay tràn khung cột.
  * Hỗ trợ Accessibility (bàn phím) và Touch Sensors tốt nhất hệ sinh thái.
* **Nhược điểm**: Phải thiết lập sensor (PointerSensor, KeyboardSensor) và DragOverlay bằng tay.
* **Kết luận**: **Lựa chọn tối ưu nhất cho Kanban Board full-stack.**

### 2. `@hello-pangea/dnd` (Bản kế thừa chính thức của `react-beautiful-dnd`)
* **Kiến trúc**: Chia layout thành `<DragDropContext>`, `<Droppable>`, `<Draggable>`.
* **Ưu điểm**: Là chuẩn mực cổ điển của Trello. Chỉ cần bọc component là có sẵn hiệu ứng co dãn, nhường chỗ rất tự nhiên mà không cần viết thêm CSS animation.
* **Nhược điểm**: Bundle size nặng (~35KB). Bắt buộc phải gắn `provided.innerRef` và `provided.draggableProps` vào DOM, khó tùy biến khi muốn dùng custom virtualized list.
* **Kết luận**: Rất phù hợp nếu muốn làm giao diện mẫu có sẵn animation vật lý đẹp mắt trong thời gian ngắn.

### 3. `@atlaskit/pragmatic-drag-and-drop` (Atlassian 2024)
* **Kiến trúc**: Thư viện thế hệ mới được Atlassian tạo ra để thay thế `react-beautiful-dnd`.
* **Ưu điểm**:
  * Siêu nhẹ (~4KB - 8KB core).
  * Chạy trực tiếp trên nền tảng HTML5 native nhưng vá toàn bộ các lỗi tương thích trình duyệt.
  * Hiệu năng cao nhất khi danh sách có hàng ngàn thẻ, hỗ trợ hoàn hảo việc cuộn ảo hóa (virtualization).
* **Nhược điểm**: API tầng thấp, lập trình viên phải tự quản lý hiệu ứng visual feedback (đường kẻ vị trí drop, drop indicator).
* **Kết luận**: Thích hợp cho dự án enterprise cần xử trị dữ liệu khổng lồ.

### 4. `framer-motion` (Reorder API)
* **Kiến trúc**: Component `<Reorder.Group>` và `<Reorder.Item>`.
* **Ưu điểm**: Animation mượt mà và đẹp mắt nhất không thư viện nào sánh bằng.
* **Nhược điểm**: Cực kỳ khó khăn khi chuyển thẻ qua lại giữa nhiều cột (Cross-container transfer). Dễ gặp race condition trong React state khi kéo nhanh qua nhiều cột.
* **Kết luận**: Không nên dùng cho Kanban nhiều cột phức tạp.

### 5. `react-dnd`
* **Kiến trúc**: Higher-Order Components hoặc Hooks (`useDrag`, `useDrop`) gắn với HTML5 DnD backend.
* **Nhược điểm**: Rất nhiều boilerplate code, không thiết kế chuyên cho việc sắp xếp danh sách (Sortable). Cần cấu hình riêng biệt cho desktop và mobile.
* **Kết luận**: Lỗi thời đối với bài toán Kanban hiện đại.

---

## 3. Đánh giá Thuật toán Sắp xếp Vị trí (Fractional Indexing)

Khi người dùng kéo một thẻ chèn vào giữa 2 thẻ đã có, hệ thống cần gán vị trí mới cho thẻ đó.

| Chiến lược | Cơ chế | Ưu điểm | Nhược điểm | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **`fractional-indexing` (Steve Ruiz / Figma)** | Chuỗi Base-62 (`a0`, `a1`, `a0V`...) | Cực nhẹ (< 2KB), API 1 hàm `generateKeyBetween(prev, next)`, không bao giờ xung đột, DB chỉ update đúng 1 dòng | Chuỗi dài ra theo thời gian nếu chèn hàng trăm lần liên tục cùng 1 chỗ (rất hiếm trong thực tế) | **10 / 10 (Khuyên dùng)** |
| **`lexorank` (Atlassian Jira)** | Chuỗi Base-36 kèm Bucket (`0|010000:`) | Chuẩn hóa theo chuẩn Jira, có cơ chế Rebalancing chia bucket tự động | Thư viện phức tạp, chuỗi dài hơn, API cồng kềnh | **8.5 / 10** |
| **Float Midpoint (`(prev + next) / 2`)** | Số thực trong DB | Rất dễ code | Giới hạn độ chính xác số thực IEEE 754 sau khoảng 50 lần chèn giữa, dẫn đến mất khả năng phân biệt thứ tự | **5.0 / 10 (Không an toàn)** |
| **Integer Gap (`1000, 2000, 3000`)** | Số nguyên có khoảng cách | Trực quan | Khi chèn hết khoảng trống (khoảng cách còn 0) phải chạy lệnh update lại toàn bộ cột (lag và lock DB) | **6.0 / 10** |

---

## 4. Kết luận & Đề xuất Cặp Công nghệ Tối ưu

Sau khi đối chiếu yêu cầu của dự án Kanban Dashboard:
1. **Frontend Drag & Drop**: Chọn **`@dnd-kit`** (`@dnd-kit/core` + `@dnd-kit/sortable`).
   * *Lý do*: Hỗ trợ kéo thả đa cột chuẩn xác, tương thích React 18+, bundle size nhẹ, có `<DragOverlay>` giúp thẻ kéo không bị giật lag, hỗ trợ touch mobile mượt mà.
2. **Thuật toán Vị trí Backend & Client**: Chọn thư viện **`fractional-indexing`**.
   * *Lý do*: Nhẹ, tin cậy (Figma đang dùng), chỉ cần gọi `generateKeyBetween(prevRank, nextRank)` là có chuỗi rank mới, chỉ cần cập nhật đúng 1 record duy nhất trong PostgreSQL.
