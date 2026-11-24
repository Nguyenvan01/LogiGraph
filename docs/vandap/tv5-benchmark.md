# Phiếu vấn đáp TV5 — Thực nghiệm và so sánh (`bench/`)

## 1. TV5 phải giải thích được những gì

| File | Phần | Nội dung |
|---|---|---|
| `bench/run.py` | `road_like(n)` | Đồ thị giống mạng đường: lưới k×k lệch ngẫu nhiên, cạnh 2 chiều tới 4 láng giềng, thêm cạnh 1 chiều tới đỉnh trong bán kính 2 ô cho đủ 5 cạnh ra ⇒ E ≈ 5V (10k đỉnh ≈ 50k cạnh, đúng quy mô đề). Trọng số = độ dài / vận tốc ngẫu nhiên. |
| | `dense(n)` | Mỗi đỉnh n/4 cạnh ra, trọng số ngẫu nhiên: trường hợp decrease-key xảy ra nhiều. |
| | `dijkstra_heapq` | Đường **tham chiếu** dùng `heapq` (C). Chỉ được phép nằm trong `bench/`, không nằm trong lõi. |
| | `prepare(spec)` | Dựng dữ liệu (không tính giờ), trả về hàm cần đo + hàm lấy số liệu phụ. Seed cố định = 7. |
| | `heap_peak` | Chạy lại Dijkstra với từng loại heap để lấy kích thước heap lớn nhất (`peak`). |
| | `measure(spec)` | Chạy 5 lần, lấy **trung vị** thời gian (`perf_counter`). Chạy lần thứ 6 với `tracemalloc` để lấy bộ nhớ đỉnh. |
| | `run_experiment` | Mỗi cấu hình là **một subprocess riêng**, timeout 120 s. Kết quả ghi `bench/results/<exp>.csv`, dòng đầu ghi cấu hình máy. |
| `bench/plot.py` | | Vẽ `report/figures/*.png`. Màu cố định theo biến thể, có marker + kiểu nét để in đen trắng vẫn đọc được. `heapq` vẽ nét chấm. |

Lệnh: `.venv/bin/python -m bench.run [tên thí nghiệm]` rồi `.venv/bin/python -m bench.plot`. Chạy toàn bộ mất khoảng 30–40 phút.

## 2. Số liệu chính (Apple M1, Python 3.14.7)

| Thí nghiệm | Kết quả | Ý nghĩa |
|---|---|---|
| SSSP bản đồ thật 38.604 đỉnh | APQ 115 ms / 3.956 KB; lazy 94,5 ms / 1.544 KB; heapq 35,7 ms; mảng: timeout; Bellman-Ford 2.957 ms | Trên mạng đường, APQ không thắng lazy heap |
| Heap lớn nhất, mạng đường V = 49.729 | APQ 462, lazy 691 (< 1,5% V) | Mặt sóng Dijkstra mỏng ⇒ lazy không phình tới O(E) |
| Đồ thị dày V = 2000, E ≈ 10⁶ | APQ 123,6 ms / 269 KB / heap 1.974; lazy 146,6 ms / 747 KB / heap 8.737 | Ở đây APQ thắng: heap nhỏ hơn 4,4×, nhanh hơn 16% |
| Dijkstra mảng O(V²), V = 10.000 | 5,14 s (chậm 146×) | Baseline "cấu trúc cơ bản" |
| DSU bước/thao tác, n = 10³ → 10⁶ | Có cả 2 tối ưu: 1,17–1,19 (gần hằng số) | Minh chứng thực nghiệm cho O(α(n)) |
| Quick-Find n = 10⁴ | 3,8 s (chậm 340×) | Baseline mảng |
| MST đồ thị đầy đủ 400 Hub | Kruskal 24,5 ms, Prim mảng 48,0 ms | Ngược lý thuyết vì `list.sort` chạy bằng C |
| Knapsack n = 5000, W = 15.000 | DP 6,33 s / 74 MB; B&B 23 ms; tham lam thiếu 0,05% | B&B nhanh trên dữ liệu ngẫu nhiên, xấu nhất vẫn là hàm mũ |
| TSP n = 15 | Held-Karp 293 ms; vét cạn n = 10 đã 345 ms; NN dài hơn tối ưu 5–41% | 2ⁿ so với n! |
| Reroute | Bỏ qua 0,4 ms; tính lại khoảng 110 ms | O(L) so với O((V+E) log V) |

## 3. Câu hỏi dự kiến

1. **Vì sao mỗi phép đo chạy trong một subprocess riêng?** Để bộ nhớ, bộ đệm và garbage collector của lần đo trước không ảnh hưởng lần sau, và để timeout cắt được một phép đo mà không làm dừng cả chương trình.
2. **Vì sao lấy trung vị mà không lấy trung bình?** Trung vị ít bị ảnh hưởng bởi một lần chạy bất thường (hệ điều hành chen ngang, GC).
3. **`tracemalloc` đo cái gì?** Đỉnh bộ nhớ do Python cấp phát trong lúc giải thuật chạy, bắt đầu đo sau khi đồ thị đã dựng xong. Nó không đo RSS của cả tiến trình. Đo bộ nhớ ở lần chạy riêng vì `tracemalloc` làm chậm chương trình.
4. **Vì sao không dùng `heapq` làm baseline "Standard Heap"?** `heapq` viết bằng C, nhanh hơn heap Python thuần 2,6–3,2 lần chỉ vì hằng số. Baseline công bằng là `LazyBinaryHeap` viết bằng Python giống hệt phong cách APQ. `heapq` chỉ vẽ nét chấm để tham chiếu.
5. **Đề nói APQ tốt hơn, sao kết quả trên bản đồ thật lại ngược?** Lợi thế của APQ là heap không vượt quá V và có decrease-key. Trên mạng đường, mỗi đỉnh chỉ có vài cạnh vào nên ít khi bị cập nhật nhiều lần, heap lazy chỉ hơn vài trăm phần tử. Trong khi đó APQ phải tạo một Locator cho mỗi đỉnh. Trên đồ thị dày thì ngược lại (câu 6). Báo cáo trình bày cả hai.
6. **Làm sao chứng minh APQ có ích?** Thí nghiệm `sssp_dense`: E ≈ V²/4, lazy heap lớn gấp 4,4 lần, APQ nhanh hơn 16% và dùng ít hơn 2,8 lần bộ nhớ.
7. **Vì sao Dijkstra mảng O(V²) thua cả trên đồ thị dày, nơi lý thuyết nói nó tối ưu?** Vòng quét V phần tử chạy trong trình thông dịch Python. Hằng số này lớn hơn hệ số log V của heap ở V ≤ 2000.
8. **Bellman-Ford O(VE) mà chỉ chậm 26 lần, có mâu thuẫn không?** Không. Bản cài đặt dừng khi một vòng không relax được cạnh nào. Số vòng thực tế bằng số cạnh của đường đi ngắn nhất dài nhất (vài trăm), không phải V.
9. **Đồ thị sinh có giống mạng đường không?** Giống ở những điểm ảnh hưởng tới giải thuật: gần phẳng, bậc nhỏ (≈ 5), có đường một chiều. Kết quả trên đồ thị sinh và trên bản đồ thật cùng xu hướng (APQ ≈ lazy).
10. **Vì sao Kruskal nhanh hơn Prim trên đồ thị đầy đủ?** Bước sắp xếp `list.sort` chạy bằng C. Ở H ≤ 400, hệ số log H ≈ 9 nhỏ hơn chênh lệch hằng số giữa C và Python. Bài học: Big-O dự đoán xu hướng khi n lớn, không dự đoán thứ hạng ở một kích thước cụ thể.
11. **Nhánh cận nhanh hơn DP 270 lần, vậy cần DP làm gì?** B&B chỉ nhanh trên dữ liệu "dễ" (khối lượng và cước độc lập). Trường hợp xấu nhất của nó là O(2ⁿ). DP luôn đảm bảo O(nW). Nhóm chưa thử dữ liệu tương quan chặt, đây là giới hạn đã nêu trong báo cáo.
12. **Bộ dữ liệu có đủ quy mô đề yêu cầu (≥ 10.000 đỉnh, 50.000 cạnh) không?** Có: bản đồ thật 38.604 / 69.411; đồ thị sinh tới 49.729 / 248.645.
13. **Kết quả có lặp lại được không?** Có. Seed cố định cho mọi bộ sinh, cấu hình máy ghi ở dòng đầu mỗi CSV, chỉ cần chạy lại một lệnh.
14. **Các ô timeout xử lý thế nào?** Vẫn giữ trong bảng với giá trị `timeout`, không bỏ đi. Timeout cũng là một kết quả: nó cho biết baseline không dùng được ở quy mô đó.
15. **Giới hạn của thực nghiệm?** Cài đặt bằng Python (hằng số trình thông dịch), một máy, dữ liệu ngẫu nhiên, `tracemalloc` chỉ đếm cấp phát của Python, số đo reroute lấy từ một lần thao tác trên demo.
