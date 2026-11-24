# Mission: LogiGraph — Tối ưu hóa mạng lưới giao hàng logistics và định tuyến vận tải đô thị

## Why
Bảo vệ đồ án nhóm (5 học viên) kết thúc học phần *Cấu trúc dữ liệu và Giải thuật nâng cao*, Đề tài 4. Đồ án chứng minh năng lực tự cài đặt Weighted Graph, Adaptable Priority Queue, Disjoint Set và Quy hoạch động, áp dụng vào bài toán giao hàng thực tế trên bản đồ đô thị. Quá trình làm tiếp tục dùng khung Golden Flow của bộ skill Matt Pocock đã học.

## Success looks like
- Mỗi thành viên tự cài đặt và giải thích được từng dòng của module mình: đồ thị và dữ liệu bản đồ, Dijkstra + Adaptable Heap có Locator, Union-Find + Kruskal, 0/1 Knapsack + TSP Held-Karp, benchmark.
- Bản đồ thực tế ≥ 10.000 đỉnh, đồ thị sinh giả lập ≥ 10.000 đỉnh / 50.000 cạnh. Benchmark so sánh trung thực với baseline: Standard Heap, Bellman-Ford, mảng/danh sách.
- Demo trực tiếp: tìm tuyến, gây tắc/cấm đường rồi tính lại tuyến, mạng xương sống MST giữa các kho, phân cụm giao hàng, xếp hàng lên xe.
- Báo cáo IEEE 12–18 trang, slide 20–25 trang, bảng phân công.

## Constraints
- Python ≥ 3.12. Lõi (`logigraph/core/`) không dùng `dict`/`set` dựng sẵn hay thư viện ngoài (ADR-0001).
- Mọi giải thuật có test đối chiếu với một lời giải chuẩn (vét cạn, Bellman-Ford, Prim, BFS).
- Tài liệu và báo cáo viết bằng tiếng Việt theo `NOTES.md`.

## Out of scope
- Incremental SSSP, Contraction Hierarchies, dữ liệu giao thông live.
- VRP nhiều xe có time window. Chỉ làm TSP quy mô nhỏ cho từng chuyến.

## Parallel project
Không. Sản phẩm chính là đồ án này. Kế hoạch chi tiết ở `.scratch/logigraph/plan.md`.
