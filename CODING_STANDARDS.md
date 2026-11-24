# Coding Standards — LogiGraph

Tiêu chuẩn cho mã nguồn đồ án (Python ≥ 3.12, pytest). Phần review dùng file này làm trục Standards.

---

## 1. Quy tắc lõi (bắt buộc theo đề bài)

1. `logigraph/core/` **không dùng** `dict`, `set`, `frozenset` (kể cả dạng literal/comprehension), không import `heapq`, `collections`, `functools`, `bisect`, `queue` hay thư viện ngoài. Danh sách import được phép nằm trong `tests/test_core_rules.py`. Test này chạy cùng bộ test và phải luôn xanh.
2. Chỉ dùng mảng: `list`, `bytearray`, tuple. Intersection và Road Segment được đánh số nguyên liên tục, nên mọi tra cứu là truy cập chỉ số (ADR-0002).
3. Thư viện ngoài (osmnx, matplotlib, …) chỉ được dùng trong `tools/`, `bench/`, `app/`.

## 2. Deep Modules

1. Mỗi file trong `core/` là một module của một thành viên, có interface công khai nhỏ (3–6 hàm/phương thức). Hàm nội bộ đặt tên bắt đầu bằng `_`.
2. Module giải thuật nhận dữ liệu thuần (đồ thị, danh sách cạnh, ma trận khoảng cách) và không đọc file. Chỉ `RoadNetwork.from_csv` và `tools/` được đọc ghi file.
3. Không viết abstraction "để dành". Biến thể chỉ được thêm khi benchmark cần (ví dụ cờ `path_compression` của `DisjointSet`).

## 3. Đặt tên và kiểu

1. Tên lấy từ `CONTEXT.md` (`Intersection`, `RoadSegment`, `travel_time`, `Parcel`, `Trip`…). Không dùng các từ trong mục _Avoid_.
2. Có type hint cho mọi hàm công khai. Class tạo nhiều đối tượng (Locator, nút heap) dùng `__slots__` để giảm bộ nhớ, vì đề có đo Memory Footprint.
3. Docstring của mỗi hàm công khai ghi độ phức tạp thời gian/bộ nhớ. Báo cáo IEEE và vấn đáp lấy từ đây.

## 4. Kiểm tra dữ liệu vào

1. Travel Time âm → `ValueError`. Closure được biểu diễn bằng cờ `closed`, không dùng trọng số âm.
2. Chỉ số Intersection/Road Segment nằm ngoài khoảng → `IndexError` với thông báo rõ ràng.
3. Khối lượng Parcel và tải trọng Truck phải là số nguyên dương.

## 5. Kiểm thử

1. TDD: viết test đỏ trước, rồi làm cho xanh, rồi refactor. Unit test của cả repo chạy dưới 5 giây.
2. Mỗi giải thuật có **test đối chiếu** với lời giải chuẩn trên dữ liệu ngẫu nhiên có seed: Dijkstra ↔ Bellman-Ford, Kruskal ↔ Prim, Knapsack ↔ vét cạn, Held-Karp ↔ hoán vị, DSU ↔ BFS.
3. Benchmark không đặt trong `tests/` mà đặt trong `bench/`.

## 6. Benchmark

1. Mỗi phép đo chạy trong một subprocess riêng. Thời gian đo bằng `time.perf_counter`, bộ nhớ đỉnh bằng `tracemalloc`. Mỗi điểm lấy trung vị của ≥ 5 lần chạy, dùng seed cố định.
2. Baseline phải viết bằng Python thuần giống như bản nâng cao. `heapq` chỉ là đường tham chiếu, ghi chú rõ trên biểu đồ.
3. Ghi cấu hình máy (CPU, RAM, phiên bản Python) vào đầu mỗi file kết quả. Lần chạy nào quá thời gian thì ghi `timeout`, không bỏ khỏi bảng.

## 7. Code smells

Loại bỏ theo Fowler: Mysterious Name, Duplicated Code, Long Function, Speculative Generality, Primitive Obsession (dùng tên rõ ràng cho chỉ số: `u`, `v`, `edge_id`), Dead Code.
