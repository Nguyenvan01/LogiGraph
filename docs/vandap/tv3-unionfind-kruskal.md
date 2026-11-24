# Vấn đáp TV3 — Disjoint Set, Kruskal, Prim, phân cụm, liên thông

Module M3. Mã nguồn: `logigraph/core/dsu.py`, `logigraph/core/network.py`. Test: `tests/test_dsu.py`, `tests/test_network.py`. Phần báo cáo: `report/sections/04-network.tex`.

Yêu cầu của đề cho TV3: cài Disjoint Set (Union-Find tối ưu bằng path compression và union by rank) kết hợp Kruskal tìm MST cho mạng xương sống giữa các kho trung chuyển; kiểm tra liên thông và phân vùng giao hàng; phân tích độ phức tạp hàm Ackermann ngược.

---

## 1. Bức tranh chung (nói trong 30 giây)

- Một cấu trúc dữ liệu (Disjoint Set), ba ứng dụng:
  1. **Backbone Network** giữa 24 Hub (mỗi phường một Hub) — MST bằng Kruskal trên đồ thị Hub vô hướng đầy đủ.
  2. **Delivery Cluster** cho 400 Parcel — Kruskal dừng khi còn k tập (single-linkage).
  3. **Liên thông** — số thành phần liên thông yếu của Road Network, và liên thông nội bộ từng phường.
- Từ 1/7/2025 không còn cấp quận, nên "District" trong code (`g.district`, `district_components`) là **phường**. Dữ liệu có 24 phường, 38.604 Intersection, 69.411 Road Segment.
- Lõi chỉ dùng `list` và `bytearray`, không `dict`/`set` (có test quét AST chặn).

Demo gọi các hàm này trong `app/server.py`:

| API | Dòng | Gọi gì |
|---|---|---|
| `/api/backbone` | `app/server.py:123` | `distance_matrix` (24 Dijkstra) → `hub_backbone` (Kruskal) → vẽ mỗi tuyến bằng Route ngắn nhất thật |
| `/api/clusters` | `app/server.py:136` | đồ thị đầy đủ 400 Parcel, trọng số haversine (79.800 cạnh) → `k_clusters` |
| `/api/districts` | `app/server.py:159` | `connected_components` + `district_components` |
| chọn Hub | `app/server.py:47` | `_hubs`: Intersection của phường gần trọng tâm (theo tọa độ) nhất |
| sinh Parcel | `app/server.py:62` | `_hotspot_parcels`: 6 điểm nóng chọn bằng farthest-point, Gauss σ = 400 m, cắt ở 2σ |

---

## 2. Đi qua từng hàm

### `logigraph/core/dsu.py`

**`class DisjointSet`** — `dsu.py:19`
- `__slots__` (`dsu.py:22`): không có `__dict__` cho mỗi object, tiết kiệm bộ nhớ, và không lén dùng dict.
- `__init__(n, path_compression=True, union_by_rank=True)` — `dsu.py:24-33`
  - `n < 0` → `ValueError`.
  - `parent = list(range(n))`: mỗi phần tử là gốc của chính nó. O(n).
  - `rank = bytearray(n)`: 1 byte/phần tử. Đủ vì rank ≤ ⌊log₂ n⌋, muốn vượt 255 cần n ≥ 2²⁵⁶.
  - `count = n`: số tập hiện có. Kruskal dùng để dừng sớm, `k_clusters` dùng để dừng ở k.
  - `steps = 0`: số lần nhảy con trỏ ở lượt 1 của `find` — thước đo cho benchmark, không phụ thuộc máy.
  - Hai cờ → 4 biến thể: (F,F) không tối ưu, (F,T) chỉ rank, (T,F) chỉ nén, (T,T) cả hai.
- `find(x)` — `dsu.py:35-53`
  - Kiểm tra biên `0 <= x < n`, sai → `IndexError` (`dsu.py:43-44`).
  - Lượt 1 (`dsu.py:46-49`): đi lên tới gốc, đếm `steps`.
  - Lượt 2 (`dsu.py:50-52`): nếu bật nén, đi lại đường đó, cho từng nút trỏ thẳng về gốc.
  - Dòng `parent[x], x = root, parent[x]` (`dsu.py:52`): vế phải tính trước thành `(root, cha_cũ_của_x)`, rồi gán trái sang phải: `parent[x] = root` (x vẫn là x cũ), sau đó `x = cha_cũ`. Không cần biến tạm.
  - Lặp, không đệ quy: biến thể không tối ưu có thể cho chuỗi dài 10⁶ − 1, vượt giới hạn đệ quy 1000 của Python.
- `union(a, b)` — `dsu.py:55-70`
  - Hai lần `find`. Cùng gốc → trả `False` (Kruskal dùng để phát hiện chu trình).
  - Union by rank (`dsu.py:63-67`): đổi chỗ để `rank[ra] <= rank[rb]`; nếu bằng nhau thì tăng `rank[rb]`. Gắn `parent[ra] = rb` (`dsu.py:68`). Chỉ rank của **gốc** bị sửa.
  - Không bật rank: luôn gắn gốc của a dưới gốc của b (có thể tạo chuỗi).
  - `count -= 1`, trả `True`.
- `connected(a, b)` — `dsu.py:72-74`: `find(a) == find(b)`.

**`class QuickFind`** — `dsu.py:77`: baseline "mảng cơ bản".
- `__init__` — `dsu.py:82-88`: `label = list(range(n))`. `steps` ở đây đếm **số lần ghi nhãn** trong `union` (khác đơn vị với `DisjointSet.steps`).
- `find` — `dsu.py:90-94`: trả `label[x]`, O(1).
- `union` — `dsu.py:96-107`: quét **toàn bộ** mảng, đổi nhãn la → lb. Luôn Θ(n) vì vòng `for` chạy hết n phần tử, dù tập nhỏ.
- `connected` — `dsu.py:109-111`: O(1).

### `logigraph/core/network.py`

Quy ước (`network.py:3-5`): đồ thị vô hướng cho dưới dạng `edges[i] = (w, u, v)`. MST trả về `(tổng trọng số, danh sách chỉ số cạnh được chọn)`. Không liên thông → rừng khung nhỏ nhất.

- **`kruskal_mst(n, edges)`** — `network.py:18-35`
  - Sắp **mảng chỉ số** theo trọng số (`network.py:24-25`), không sắp bản thân danh sách cạnh, để trả về chỉ số gốc. `list.sort` là Timsort, ổn định, O(E log E).
  - Mỗi cạnh: `dsu.union(u, v)` trả True → nhận (`network.py:30-32`). Khuyên u = v: `union` trả False, bị bỏ tự nhiên.
  - Dừng sớm khi `dsu.count == 1` (`network.py:33-34`).
  - O(E log E + E·α(V)) thời gian, O(V + E) bộ nhớ.
- **`prim_mst_array(n, edges)`** — `network.py:38-71`
  - Ma trận `best[u][v]` = chỉ số cạnh u–v nhẹ nhất (`network.py:47-52`), xử lý được cạnh song song, bỏ khuyên, kiểm tra biên → `IndexError`.
  - `in_tree` (bytearray), `key`, `via` (cạnh tốt nhất nối vào cây).
  - n vòng, mỗi vòng quét O(V) tìm đỉnh ngoài cây có `key` nhỏ nhất (`network.py:58-61`), rồi cập nhật theo một hàng của ma trận (`network.py:66-70`).
  - Không còn đỉnh có key hữu hạn → đỉnh được chọn có `via = -1`, bắt đầu cây mới → rừng.
  - O(V² + E) thời gian, O(V²) bộ nhớ. Không có phiên bản Prim dùng heap trong code.
- **`k_clusters(n, edges, k)`** — `network.py:74-90`
  - `k` ngoài 1..n → `ValueError`.
  - Giống Kruskal nhưng dừng khi `dsu.count == k` (kiểm tra **trước** khi hợp, `network.py:87-88`).
  - Đồ thị có hơn k thành phần → trả về đúng số thành phần đó.
  - Trả nhãn 0..k−1 qua `_labels`.
- **`hub_backbone(dist)`** — `network.py:93-112`
  - Ma trận không vuông → `ValueError`.
  - Đồ thị Hub vô hướng đầy đủ, trọng số `(d[i][j] + d[j][i]) / 2`; cặp nào có một chiều `inf` thì bỏ (`network.py:107-110`).
  - **Gọi `kruskal_mst`** (`network.py:111`), đúng yêu cầu đề. O(H² log H) thời gian, O(H²) bộ nhớ. Trả `(tổng, [(i, j, w)])`.
  - Docstring ghi rõ: lý thuyết Prim mảng O(H²) tốt hơn trên đồ thị đầy đủ, nhưng đo thực tế Kruskal nhanh hơn ~2× ở H ≤ 400 (Q23).
- **`connected_components(g)`** — `network.py:115-127`
  - Dựng DSU mới, hợp mọi Road Segment không Closure, coi như vô hướng → liên thông **yếu**.
  - Trả `(số thành phần, nhãn)`. O(V + E·α(V)). Đo trên dữ liệu thật: ~0,07 s.
- **`district_components(g)`** — `network.py:130-157`
  - Chỉ hợp cạnh không Closure có hai đầu **cùng phường** (`network.py:142`).
  - Một DSU chung đủ, vì không phép hợp nào vượt ranh giới, nên mỗi tập nằm gọn trong một phường.
  - Đếm kích thước mỗi gốc (`network.py:144-146`); với mỗi phường đếm số gốc và kích thước lớn nhất (`network.py:149-156`).
  - Trả `[(tên, số Intersection, số thành phần, thành phần lớn nhất)]`. O(V + E·α(V) + D). Đo: ~0,09 s.
- **`_labels(dsu, n)`** — `network.py:160-171`: đổi gốc thành nhãn liên tục 0..count−1 theo thứ tự xuất hiện, dùng mảng `root_label` thay dict.

Liên quan, không thuộc M3 nhưng hay bị hỏi:
- `distance_matrix` — `logigraph/core/routing.py:88`: 24 lần Dijkstra, ma trận Travel Time (giây), bất đối xứng.
- `largest_scc` — `tools/prepare_osm.py:64`, gọi ở `tools/prepare_osm.py:147`: Kosaraju lặp, chỉ giữ SCC lớn nhất. Ngoài lõi.

---

## 3. Bảng độ phức tạp

n phần tử, m thao tác. Bộ nhớ mọi biến thể O(n).

| Biến thể | `find` | `union` | Ghi chú |
|---|---|---|---|
| QuickFind (mảng nhãn) | O(1) | Θ(n) | union quét toàn mảng; n − 1 phép union tốn Θ(n²) |
| Không tối ưu | O(n) | O(n) | cây suy biến thành chuỗi |
| Chỉ union by rank | O(log n) | O(log n) | chiều cao ≤ ⌊log₂ n⌋ (Bổ đề rank) |
| Chỉ path compression | O(log n) khấu hao | O(log n) khấu hao | một thao tác riêng lẻ vẫn có thể O(n) |
| Cả hai | O(α(n)) khấu hao | O(α(n)) khấu hao | Tarjan 1975; m thao tác tốn O(n + m·α(n)) |

| Thuật toán | Thời gian | Bộ nhớ | Thắng khi |
|---|---|---|---|
| Kruskal | O(E log E) = O(E log V) | O(V + E) | đồ thị thưa; đo thực tế thắng cả đồ thị đầy đủ tới V = 400 |
| Prim mảng | O(V² + E) | O(V²) | lý thuyết: đồ thị đầy đủ E = Θ(V²); trong code chỉ là lời giải đối chiếu |
| k_clusters | O(E log E) | O(V + E) | với 400 Parcel: E = 79.800 |

### Số liệu benchmark

Nguồn: `bench/results/dsu.csv`, `mst_dense.csv`, `mst_sparse.csv`; báo cáo: Mục 6 (`sec:experiments`, Bảng `tab:dsu`, Hình `fig:dsu-mst`). Máy arm macOS, Python 3.14, trung vị 5 lần, timeout 120 s.

DSU — workload: n phép union ngẫu nhiên, mỗi phép kèm một find (2n thao tác). Số bước nhảy `steps` / thao tác:

| n | cả hai | chỉ rank | chỉ nén | không tối ưu | QuickFind |
|---|---|---|---|---|---|
| 10³ | 1,17 | 1,55 | 1,93 | 21,4 | — |
| 10⁴ | 1,19 | 1,70 | 2,18 | 162 | 3,8 s (≈ 340× chậm hơn "cả hai") |
| 10⁵ | 1,18 | 1,70 | 2,50 | timeout | không chạy |
| 10⁶ | 1,19 | 1,72 | 2,80 | không chạy | không chạy |

Đọc bảng: "cả hai" phẳng (đúng α(n)); "chỉ rank" cũng gần phẳng vì cây ngẫu nhiên nông hơn nhiều so với cận log₂ n; "chỉ nén" tăng chậm theo log; "không tối ưu" tăng gần tuyến tính. Cột QuickFind không có `steps` cùng đơn vị (Q21), nên so bằng thời gian.

MST đồ thị đầy đủ (điểm ngẫu nhiên trong hình vuông):

| V | E | Kruskal | Prim mảng |
|---|---|---|---|
| 50 | 1.225 | 0,38 ms | 0,70 ms |
| 100 | 4.950 | 1,28 ms | 2,74 ms |
| 200 | 19.900 | 5,63 ms | 10,7 ms |
| 400 | 79.800 | 24,5 ms | 48,0 ms |

MST đồ thị thưa giống đường bộ (E ≈ 5V): V ≈ 10³: Kruskal 3,5 ms, Prim mảng 105 ms; V = 10⁴: Kruskal 46 ms, Prim mảng timeout; V ≈ 5·10⁴: Kruskal 0,27 s. Mọi ô có cả hai đều cho cùng tổng trọng số.

---

## 4. Chạy tay Kruskal + DSU trên đồ thị 6 đỉnh

Đã chạy đúng code (`kruskal_mst`, cả hai tối ưu) để đối chiếu từng bước.

Cạnh `(w, u, v)`:

| Chỉ số | e0 | e1 | e2 | e3 | e4 | e5 | e6 | e7 |
|---|---|---|---|---|---|---|---|---|
| (w,u,v) | (4,0,1) | (1,1,2) | (3,0,2) | (2,2,3) | (5,3,4) | (2,4,5) | (6,3,5) | (7,1,4) |

Thứ tự sau sắp xếp (Timsort ổn định, e3 trước e5 vì cùng w = 2): `e1, e3, e5, e2, e0, e4, e6, e7`.

Ban đầu: `parent = [0,1,2,3,4,5]`, `rank = [0,0,0,0,0,0]`, `count = 6`.

| Bước | Cạnh | find(u), find(v) | Quyết định | parent | rank | count |
|---|---|---|---|---|---|---|
| 1 | e1 (1,2) w=1 | 1, 2 — rank bằng nhau | nhận; rank[2] = 1, parent[1] = 2 | [0,2,2,3,4,5] | [0,0,1,0,0,0] | 5 |
| 2 | e3 (2,3) w=2 | 2 (rank 1), 3 (rank 0) | nhận; đổi chỗ, parent[3] = 2 | [0,2,2,2,4,5] | [0,0,1,0,0,0] | 4 |
| 3 | e5 (4,5) w=2 | 4, 5 — rank bằng nhau | nhận; rank[5] = 1, parent[4] = 5 | [0,2,2,2,5,5] | [0,0,1,0,0,1] | 3 |
| 4 | e2 (0,2) w=3 | 0 (rank 0), 2 (rank 1) | nhận; parent[0] = 2 | [2,2,2,2,5,5] | [0,0,1,0,0,1] | 2 |
| 5 | e0 (0,1) w=4 | 2, 2 | **bỏ** — tạo chu trình 0–1–2 | không đổi | không đổi | 2 |
| 6 | e4 (3,4) w=5 | 2 (rank 1), 5 (rank 1) | nhận; rank[5] = 2, parent[2] = 5 | [2,2,5,2,5,5] | [0,0,1,0,0,2] | 1 |

`count == 1` → dừng, không xét e6, e7. Kết quả `kruskal_mst` = `(13.0, [1, 3, 5, 2, 4])`, tổng 1 + 2 + 2 + 3 + 5 = 13.

Minh họa path compression sau đó:
- Trước: cây gốc 5; 2 → 5; 0, 1, 3 → 2. Chiều cao 2, rank[5] = 2.
- `find(1)`: lượt 1 đi 1 → 2 → 5 (2 bước). Lượt 2 gán parent[1] = 5. parent = `[2,5,5,2,5,5]`.
- `find(0)`, `find(3)` tương tự → parent = `[5,5,5,5,5,5]`. Chiều cao còn 1, nhưng **rank[5] vẫn là 2** và rank[2] vẫn là 1. Đây là ví dụ "rank ≠ chiều cao sau khi nén".

---

## 5. Câu hỏi hội đồng dự kiến

**Q1. α(n) là gì? Có phải hằng số không?**
Hàm ngược của hàm Ackermann: α(n) = min{k : A_k(1) ≥ n}, với A_0(j) = j + 1, A_k(j) = A_{k−1} lặp j + 1 lần tại j. A_1(1) = 3, A_2(1) = 7, A_3(1) = 2047, A_4(1) > 2²⁰⁴⁸ ≫ 10⁸⁰. Nên α(n) ≤ 4 với mọi n thực tế. Không phải hằng số: α(n) → ∞, chỉ tăng cực chậm, chậm hơn cả log* n. Nói "gần như hằng số" chứ không nói "O(1)".

**Q2. Kết quả O(m·α(n)) là trường hợp xấu nhất hay trung bình?**
Khấu hao trong trường hợp xấu nhất: tổng m thao tác bất kỳ tốn O(n + m·α(n)). Một `find` riêng lẻ vẫn có thể tốn O(log n). Tarjan còn chứng minh cận này chặt cho chính thuật toán này.

**Q3. Rank, size, height khác nhau thế nào? Sau path compression rank còn đúng không?**
- Height: chiều cao thật của cây. Size: số phần tử. Rank: số nguyên lưu ở gốc, chỉ tăng khi hợp hai gốc cùng rank.
- Chỉ union by rank: rank = height chính xác.
- Có nén: height giảm nhưng rank không cập nhật → rank chỉ là **cận trên** của height. Không cần sửa vì phép phân tích chỉ dùng tính chất "rank tăng nghiêm ngặt dọc đường lên gốc" và "gốc rank r có ≥ 2^r phần tử", cả hai vẫn đúng. Ví dụ ở mục 4.
- Code không lưu size. Union by size cho cùng cận O(log n) và cùng α(n) khi kèm nén.

**Q4. Chứng minh chiều cao ≤ log₂ n?**
Quy nạp: gốc chỉ lên rank r + 1 khi hợp hai gốc rank r, mỗi tập ≥ 2^r → ≥ 2^(r+1). Vậy 2^r ≤ n, r ≤ ⌊log₂ n⌋. Chiều cao ≤ rank vì rank tăng nghiêm ngặt dọc đường đi lên.

**Q5. Vì sao `find` viết lặp mà không đệ quy?**
Biến thể không tối ưu có chuỗi dài tới n − 1 (n = 10⁶ trong benchmark), vượt giới hạn đệ quy mặc định 1000 của Python → `RecursionError`. Lặp hai lượt cho đúng kết quả nén như bản đệ quy, bộ nhớ O(1) thay vì O(độ sâu) cho stack, và tránh chi phí gọi hàm.

**Q6. Tại sao rank dùng `bytearray`?**
rank ≤ ⌊log₂ n⌋; muốn vượt 255 cần n ≥ 2²⁵⁶. 1 byte/phần tử thay vì 8 byte con trỏ trong `list`. Đồng thời thỏa yêu cầu chỉ dùng mảng.

**Q7. Tại sao DSU không xóa cạnh được? Cấm đường thì làm sao?**
Rừng `parent` không lưu cạnh nào gây ra phép hợp, và path compression còn làm mất cấu trúc cây gốc, nên không biết tách tập ở đâu, cũng không biết còn đường khác nối hai phần không (bài toán decremental connectivity). Giải pháp: dựng lại DSU từ đầu, bỏ các cạnh `closed[e] = 1` — `connected_components` (`network.py:115`), O(V + E·α(V)), ~0,07 s trên 38.604 đỉnh / 69.411 cạnh. Chấp nhận được vì Closure hiếm.

**Q8. Kruskal hay Prim, khi nào dùng cái nào?**
Thưa (E = O(V)): Kruskal O(E log E) ≈ O(V log V), Prim mảng O(V²) → Kruskal. Dày/đầy đủ (E = Θ(V²)): về lý thuyết Prim mảng O(V²) tuyến tính theo đầu vào, Kruskal O(V² log V) vì phải sắp xếp → Prim. Đo thực tế chỉ xác nhận chiều thứ nhất; ở đồ thị đầy đủ tới V = 400, Kruskal vẫn nhanh hơn ~2× (Q23).

**Q9. Đồ thị Hub là đồ thị đầy đủ, sao backbone không dùng Prim?** *(câu dễ bị hỏi nhất)*
`hub_backbone` gọi `kruskal_mst` (`network.py:111`), đúng yêu cầu đề "Union-Find kết hợp Kruskal". Câu hỏi hợp lý vì lý thuyết Prim mảng O(H²) tốt hơn Kruskal O(H² log H) trên đồ thị đầy đủ. Trả lời: (1) đo thực tế Kruskal nhanh hơn ~2× tới 400 đỉnh (Q23); (2) với 24 Hub, 276 cạnh, cả hai chạy dưới 1 ms, chi phí thật nằm ở 24 lần Dijkstra tính ma trận; (3) `prim_mst_array` vẫn có trong code làm lời giải đối chiếu: cùng tổng trọng số trên 120 đồ thị ngẫu nhiên trong test, và trên dữ liệu demo cho **cùng tập 23 tuyến**.

**Q10. MST trên đồ thị có hướng?**
MST chỉ định nghĩa cho đồ thị vô hướng. Bản có hướng là minimum spanning arborescence (cây khung có hướng từ một gốc, thuật toán Chu–Liu/Edmonds) — bài toán khác. Kruskal không áp dụng được: chọn tham lam cạnh nhẹ nhất không bảo đảm mỗi đỉnh có đúng một cạnh đi vào và mọi đỉnh tới được từ gốc. Vì vậy ta không chạy MST trên Road Network mà trên đồ thị Hub vô hướng.

**Q11. Vì sao lấy trung bình (d_ij + d_ji)/2?**
Ma trận Dijkstra bất đối xứng do đường một chiều (trên dữ liệu demo cả 552 cặp có thứ tự đều lệch, lệch tới ~42%). Một tuyến backbone được khai thác hai chiều, nên chi phí hợp lý là trung bình hai chiều = nửa vòng đi về. Kết quả đối xứng theo cách xây dựng, đúng điều kiện của MST. Có thể chọn max (thận trọng) hoặc min, nhưng sẽ thiên về một chiều. Cặp có một chiều `inf` bị bỏ (không xảy ra vì dữ liệu là SCC, chỉ là bảo vệ). Trọng số là Travel Time (giây), không phải tiền.

**Q12. Phát biểu và chứng minh cut property?**
A ⊆ một MST T, lát cắt (S, V∖S) không bị cạnh nào của A đi qua, e là cạnh nhẹ nhất qua lát cắt → A ∪ {e} ⊆ một MST. Chứng minh đổi cạnh: nếu e ∉ T, T + e có chu trình, chu trình qua lát cắt số chẵn lần nên có cạnh f ≠ e qua lát cắt, f ∉ A. T' = T + e − f là cây khung, w(T') ≤ w(T) → T' là MST chứa A ∪ {e}.
Áp vào Kruskal: S = tập DSU chứa u. Mọi cạnh nhẹ hơn qua lát cắt đã được xét trước; lúc đó hai đầu khác tập (tập chỉ lớn dần) nên đã được nhận, mâu thuẫn → e nhẹ nhất qua lát cắt.

**Q13. Kruskal phát hiện chu trình thế nào?**
`union(u, v)` trả False khi `find(u) == find(v)`: u, v đã nối với nhau qua các cạnh đã nhận, thêm u–v sẽ tạo chu trình. Mỗi kiểm tra O(α(V)) khấu hao, thay vì DFS O(V) mỗi cạnh.

**Q14. Đồ thị đầu vào không liên thông?**
Kruskal không bao giờ đạt `count == 1`, duyệt hết cạnh, trả về rừng khung nhỏ nhất n − c cạnh (c = số thành phần). Prim mảng bắt đầu cây mới khi hết đỉnh có key hữu hạn. Test `test_kruskal_matches_prim[False]` và `assert_spanning_forest` kiểm tra đúng điều này.

**Q15. Độ phức tạp Kruskal, phần nào chiếm nhiều nhất?**
Sắp xếp O(E log E). log E < 2 log V với đồ thị đơn nên = O(E log V). DSU chỉ O(E·α(V)). Nếu cạnh đã sắp sẵn (hoặc trọng số nguyên nhỏ, dùng counting sort) thì Kruskal gần tuyến tính.

**Q16. k-clustering bằng Kruskal đúng ở nghĩa nào? Có nhược điểm gì?**
Dừng khi còn k tập = bỏ k − 1 cạnh nặng nhất của MST = single-linkage (Gower & Ross 1969). Phân hoạch này tối đa hóa khoảng cách nhỏ nhất giữa hai cụm (spacing). Nhược điểm: **chaining** — hai vùng nối nhau bởi một dãy điểm sát nhau bị gộp thành một cụm. Với 400 Parcel rải đều, thử thực tế được một cụm 328/400 và vài cụm 1–53 điểm. Vì vậy demo sinh Parcel quanh 6 điểm nóng (k = 6: các cụm 104, 100, 93, 57, 32, 14). Đây là giả định dữ liệu, không phải sửa thuật toán; cụm không bị giới hạn kích thước, bước Knapsack sau đó mới chọn kiện theo tải trọng.

**Q17. Vì sao k_clusters dùng haversine mà không dùng Dijkstra?**
Cần khoảng cách cho 79.800 cặp; Dijkstra cho 400 nguồn trên 38.604 đỉnh tốn nhiều hơn rất nhiều. Phân cụm chỉ cần "gần nhau về địa lý". Haversine là khoảng cách trên mặt cầu, `12_742_000` trong code là đường kính Trái Đất (2R, m). Hệ quả: hai điểm gần nhau nhưng cách sông có thể vào cùng cụm.

**Q18. Liên thông yếu và mạnh khác nhau thế nào? DSU tính được cái nào?**
Yếu: bỏ hướng thì liên thông. Mạnh: mọi u, v có đường đi có hướng cả hai chiều. `union` đối xứng nên DSU chỉ cho liên thông **yếu**. Liên thông mạnh cần DFS (Kosaraju/Tarjan SCC). Bước chuẩn bị dữ liệu chạy Kosaraju lặp và chỉ giữ SCC lớn nhất, nên ban đầu mọi Route đều tồn tại và `connected_components` trả 1. Sau Closure: nhiều hơn 1 thành phần yếu → chắc chắn có vùng bị cô lập; còn 1 thành phần yếu → chưa chắc liên thông mạnh.

**Q19. Kết quả `district_components` nói gì?**
Chỉ Bồ Đề và Hoàn Kiếm liên thông nội bộ; các phường khác tách 2–22 mảnh (Hồng Hà 22 mảnh, lớn nhất 3001/3110; Thanh Liệt 3 mảnh, lớn nhất chỉ 1003/1691). Vì toàn mạng liên thông mạnh, các mảnh vẫn nối nhau nhưng phải đi qua đường của phường bên cạnh. Ý nghĩa: Hub của một phường không phục vụ được hết phường nếu chỉ dùng đường nội bộ, nên không nên chia vùng cứng theo ranh giới hành chính.

**Q20. Vì sao một DSU chung đủ cho 24 phường?**
Chỉ hợp cạnh có hai đầu cùng phường, nên mọi tập nằm gọn trong một phường; gốc của tập thuộc đúng phường đó. Đếm gốc theo phường là ra số thành phần. Không cần 24 DSU riêng hay đánh số lại đỉnh.

**Q21. `steps` đo cái gì? So QuickFind với DisjointSet theo `steps` được không?**
`DisjointSet.steps` = số bước nhảy con trỏ ở lượt 1 của find. `QuickFind.steps` = số lần ghi nhãn trong union. Hai đơn vị khác nhau, không so trực tiếp; so QuickFind bằng thời gian chạy. `steps` dùng để so 4 biến thể DisjointSet với nhau, không bị nhiễu bởi máy.

**Q22. Phác thảo cận O(m log* n)?**
Chia rank thành nhóm theo tháp 1, 2, 4, 16, 65536 (O(log* n) nhóm). Bước nhảy tới gốc hoặc sang nhóm khác: tính cho phép toán, O(log* n) mỗi find. Bước còn lại: tính cho nút; mỗi lần nén, cha mới có rank lớn hơn, nên nút nhóm g bị tính ≤ t_g lần. Số nút nhóm g ≤ n/t_g (vì có ≤ n/2^r nút rank r). Mỗi nhóm tốn ≤ n, tổng O(n log* n). Cộng lại O((m + n) log* n).

**Q23. Vì sao Kruskal nhanh hơn Prim trên đồ thị đầy đủ dù lý thuyết ngược lại?**
Big-O bỏ hằng số; ở đây hằng số chênh rất lớn. Kruskal tốn chủ yếu ở `list.sort` (Timsort viết bằng C, chạy trên mảng chỉ số với key lấy sẵn), phần còn lại là E lần `union` bằng Python. Prim mảng tốn V lần quét O(V) để tìm min cộng V lần quét một hàng ma trận, tức khoảng 2V² vòng lặp Python thuần, mỗi vòng có nhiều phép so sánh và truy cập mảng; thêm bước dựng ma trận `best` V×V. Hệ số log V chỉ khoảng 9 khi V = 400, nhỏ hơn chênh lệch tốc độ giữa C và trình thông dịch Python. Khi V tăng đủ lớn, log V sẽ thắng hằng số và Prim sẽ vượt lên, nhưng bộ nhớ O(V²) của Prim cũng tăng theo. Kết luận trung thực: phân tích tiệm cận đúng, nhưng ở quy mô và ngôn ngữ của đồ án, đo đạc mới là căn cứ chọn thuật toán. Nếu cài cùng bằng C/C++ thì kỳ vọng Prim mảng thắng trên đồ thị đầy đủ.

---

## 6. Số liệu thật trên dữ liệu demo (đã chạy, để trả lời khi bị hỏi)

- Road Network: 38.604 Intersection, 69.411 Road Segment, 24 phường, 1 thành phần liên thông yếu.
- Backbone: 24 Hub, 276 cạnh, 23 tuyến, tổng trọng số ≈ 4618 s (tổng nửa vòng đi về). Prim mảng cho cùng tập tuyến.
- Phân cụm: 400 Parcel, 79.800 cạnh, `k_clusters` k = 6 ≈ 46 ms.
- `connected_components` ≈ 0,07 s; `district_components` ≈ 0,09 s.

## 7. Điểm cần lưu ý

- `hub_backbone` đã chuyển sang `kruskal_mst`; câu hỏi "sao không dùng Prim" xem Q9 và Q23.
- Kế hoạch ghi "prim_mst (dùng APQ)", nhưng code chỉ có `prim_mst_array`. Không nói có Prim dùng heap.
- Tổng Kruskal và Prim có thể lệch ở chữ số thập phân cuối (cộng số thực theo thứ tự khác nhau: 4618.441000000001 so với 4618.441). Test dùng trọng số nguyên nên so `==` vẫn đúng; với số thực nên dùng `math.isclose`.
- `CONTEXT.md` còn định nghĩa District là "quận/huyện", dữ liệu thật là phường.
