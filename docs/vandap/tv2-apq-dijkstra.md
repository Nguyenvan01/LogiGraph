# Vấn đáp TV2 — Adaptable Priority Queue, Dijkstra, Reroute

Phạm vi: `logigraph/core/apq.py`, `logigraph/core/heaps.py`, `logigraph/core/routing.py` (cùng các chỗ liên quan trong `graph.py`, `bench/run.py`). Phần báo cáo tương ứng: `report/sections/03-routing.tex`.

Yêu cầu đề: cài đặt Adaptable Priority Queue có Locator, kết hợp Dijkstra để tìm đường đi ngắn nhất khi trọng số thay đổi động; benchmark Dijkstra + Adaptable Heap, Dijkstra + Standard Heap, Bellman-Ford.

Ký hiệu: V = số Intersection, E = số Road Segment, n = số phần tử đang trong heap, L = số Road Segment của Route.

---

## 1. Đi qua mã nguồn

### 1.1. `apq.py` — AdaptableHeapPQ

| Thành phần | Dòng | Làm gì | Chi phí |
|---|---|---|---|
| `Locator` | `apq.py:15-23` | Bộ ba `key`, `value`, `index`. `index` là ô hiện tại trong mảng `_data`; `-1` nghĩa là đã rời heap. Dùng `__slots__` để mỗi đối tượng nhỏ, cố định. | O(1) |
| `AdaptableHeapPQ.__init__` | `apq.py:29-31` | `_data` là `list[Locator]`; `peak` ghi kích thước lớn nhất từng đạt, chỉ phục vụ benchmark. | O(1) |
| `__len__`, `is_empty` | `apq.py:33-39` | Số phần tử, kiểm tra rỗng. | O(1) |
| `add(key, value)` | `apq.py:41-49` | Tạo Locator với `index = len(data)`, `append` vào cuối, cập nhật `peak`, gọi `_upheap`. Trả về Locator cho người gọi giữ. | O(log n) |
| `min()` | `apq.py:51-56` | Đọc `_data[0]`. Heap rỗng → `IndexError`. | O(1) |
| `remove_min()` | `apq.py:58-62` | Heap rỗng → `IndexError`; ngược lại `_remove_at(0)`. | O(log n) |
| `update(loc, newkey, newvalue=None)` | `apq.py:64-73` | `_validate`, gán khóa mới (và value nếu khác `None`), gọi `_bubble`. Dùng được cho cả tăng và giảm khóa. | O(log n) |
| `remove(loc)` | `apq.py:75-78` | `_validate`, rồi `_remove_at(loc.index)`. Xóa phần tử bất kỳ. | O(log n) |
| `_validate(loc)` | `apq.py:81-84` | Hợp lệ khi `0 <= loc.index < len` **và** `_data[loc.index] is loc`. Bắt được stale Locator (index = -1) và Locator của heap khác. Sai → `ValueError`. | O(1) |
| `_remove_at(j)` | `apq.py:86-95` | `pop` phần tử cuối; nếu `j` không phải ô cuối thì đặt phần tử cuối vào `j`, sửa `index`, gọi `_bubble(j)`. Gán `index = -1` cho phần tử bị xóa. | O(log n) |
| `_bubble(j)` | `apq.py:97-101` | Nếu `j > 0` và khóa nhỏ hơn khóa cha → `_upheap`, ngược lại `_downheap`. Chỉ một trong hai chạy. | O(log n) |
| `_upheap(j)` | `apq.py:103-117` | Kỹ thuật dời lỗ: giữ phần tử đang xét ngoài mảng, kéo cha xuống ô trống (sửa `parent.index`), cuối cùng ghi phần tử một lần. So sánh `<` nghiêm ngặt. | O(log n) |
| `_downheap(j)` | `apq.py:119-137` | Dời lỗ đi xuống, chọn con nhỏ hơn; khi hai con bằng nhau chọn con trái (`data[c+1].key < data[c].key` mới đổi sang phải). | O(log n) |

Hai Invariant cần nói được khi bị hỏi:
- **(I1) Heap order**: khóa ở ô cha ≤ khóa ở ô con.
- **(I2) Locator nhất quán**: `_data[j].index == j` với mọi j; Locator đã rời heap có `index == -1`. Test `tests/test_apq.py:43-44` kiểm tra đúng điều này sau **mỗi** thao tác.

### 1.2. `heaps.py` — LazyBinaryHeap (Standard Heap baseline)

| Thành phần | Dòng | Làm gì | Chi phí |
|---|---|---|---|
| `LazyBinaryHeap.__init__` | `heaps.py:17-19` | `_data` là `list[tuple[key, value]]`, có `peak`. | O(1) |
| `__len__` | `heaps.py:21-23` | Số phần tử (kể cả bản sao cũ). | O(1) |
| `push(key, value)` | `heaps.py:25-40` | Append rồi upheap dời lỗ, viết inline. Không trả về handle → không có decrease-key. | O(log n) |
| `pop()` | `heaps.py:42-65` | Lấy gốc, đưa phần tử cuối lên gốc, downheap dời lỗ. Rỗng → `IndexError`. | O(log n) |

Cùng kỹ thuật dời lỗ và cùng cách phá hòa với APQ để phép so sánh công bằng (điểm G của plan). Khác biệt duy nhất về thuật toán: không có Locator, nên Dijkstra phải đẩy bản sao.

### 1.3. `routing.py`

| Thành phần | Dòng | Làm gì | Chi phí |
|---|---|---|---|
| `PQ_KINDS` | `routing.py:16` | `("adaptable", "lazy", "array")`. | — |
| `shortest_path(g, s, t=None, pq="adaptable")` | `routing.py:19-44` | Kiểm tra đỉnh, chọn biến thể, khởi tạo `dist = inf`, `parent = -1`, `dist[s] = 0`. Có `t` thì dừng sớm khi chốt `t`. `pq` sai → `ValueError`. | xem bảng mục 2 |
| `_dijkstra_adaptable` | `routing.py:205-229` | `done` (bytearray), `locs[v]` (Locator của mỗi đỉnh). Đỉnh mới → `heap.add`, đỉnh đã có trong heap → `heap.update` (decrease-key). Bỏ qua cạnh `closed` và đỉnh đã `done`. | O((V+E) log V) |
| `_dijkstra_lazy` | `routing.py:232-254` | Mỗi lần nới lỏng thành công → `heap.push`. Lấy ra đỉnh đã `done` → `continue` (bản sao cũ, dòng 239-240). | O(E log E) |
| `_dijkstra_array` | `routing.py:257-277` | Mỗi vòng quét `dist` tìm đỉnh chưa chốt nhỏ nhất (dòng 262-265); không còn đỉnh hữu hạn → dừng. | O(V² + E) |
| `bellman_ford(g, s)` | `routing.py:47-70` | Tối đa V−1 lượt, nới lỏng mọi cạnh không `closed`, dừng khi một lượt không đổi gì (`changed`). Không kiểm tra chu trình âm (trọng số luôn ≥ 0). | O(VE), tốt nhất O(E) |
| `path_edges(g, parent_edge, t)` | `routing.py:73-85` | Lần ngược `parent_edge` qua `g.tail`, đảo lại. Rỗng nếu `t` là nguồn hoặc không tới được. | O(L) |
| `distance_matrix(g, points)` | `routing.py:88-98` | Một Dijkstra đầy đủ cho mỗi điểm. Không đối xứng khi có đường một chiều. | O(k (V+E) log V), bộ nhớ O(k² + V) |
| `Route` | `routing.py:101-109` | `total_s`, `edges`, `nodes` (`nodes[0]` là vị trí xuất phát). | — |
| `Router.__init__` | `routing.py:126-132` | Giữ `current`, bộ đếm `recomputes`/`skips`, `_target`, mặt nạ `_on_route = bytearray(g.m)`. Lưu ý dòng 132: mặt nạ cố định theo `g.m` lúc tạo. | O(E) |
| `Router.route(s, t)` | `routing.py:134-147` | Dijkstra dừng sớm tại `t`, dựng `edges`, `nodes`, cập nhật mặt nạ. Không tới được: `total_s = inf`, `edges = []`, `nodes = [s]`. | O((V+E) log V) |
| `Router.incident(edge_id, travel_s=None, close=False, at=None)` | `routing.py:149-175` | (1) `_position(at)` + `_suffix` cắt phần đã đi (dòng 163-165); (2) `increase_only` tính **trước** khi ghi vào đồ thị (dòng 166); (3) ghi `set_travel_time` / `close`; (4) chỉ tăng và không trên Route → skip (dòng 171-173), ngược lại `route(nodes[0], target)`. | skip O(L), reroute O((V+E) log V) |
| `Router._position(at)` | `routing.py:178-183` | Tìm `at` trên `nodes`; không có → `ValueError`. | O(L) |
| `Router._suffix(pos)` | `routing.py:185-192` | Cộng lại Travel Time của hậu tố theo đúng thứ tự Dijkstra cộng, để số thực khớp tuyệt đối với lần chạy mới. | O(L) |
| `Router._set_route(new)` | `routing.py:194-201` | Xóa bit của Route cũ, bật bit của Route mới. | O(L) |

Biên dữ liệu (quan trọng cho câu hỏi trọng số âm): `graph.py:58-59` (`add_edge`) và `graph.py:83-84` (`set_travel_time`) từ chối giá trị âm và NaN. Closure là cờ `closed[e]` (`graph.py:87-90`), không phải `inf`.

Quy tắc cấm `dict`/`set`/`heapq`: `tests/test_core_rules.py:8-10` (danh sách cấm và whitelist import), test quét AST ở `tests/test_core_rules.py:57`.

Đường tham chiếu `heapq`: `bench/run.py:81` (`dijkstra_heapq`), chỉ nằm trong `bench/`, không nằm trong lõi.

---

## 2. Bảng độ phức tạp

| Thao tác / thuật toán | Thời gian | Bộ nhớ thêm | Ghi chú |
|---|---|---|---|
| APQ `add`, `remove_min`, `update`, `remove` | O(log n) xấu nhất | O(1) mỗi phần tử | `list.append/pop` cuối mảng là O(1) khấu hao |
| APQ `min`, `len`, `is_empty`, `_validate` | O(1) | — | |
| Lazy `push`, `pop` | O(log n) | O(1) | n gồm cả bản sao cũ |
| Dijkstra + APQ | O((V+E) log V) | O(V): `locs` + ≤ V Locator | heap ≤ V; ≤ V add, ≤ V remove_min, ≤ E update |
| Dijkstra + lazy | O(E log E) = O(E log V) | O(E) heap | ≤ E+1 push; log E ≤ 2 log V khi không có cạnh song song |
| Dijkstra + mảng | O(V² + E) = O(V²) | O(V) | không có heap |
| Bellman-Ford dừng sớm | O(VE) xấu nhất, O(E) tốt nhất | O(V) | |
| `path_edges` | O(L) | O(L) | |
| `distance_matrix` (k điểm) | O(k (V+E) log V) | O(k² + V) | không đối xứng |
| `Router.incident` bỏ qua | O(L) (O(1) nếu `at` là điểm đầu Route) | — | kiểm tra `on_route[e]` là O(1) |
| `Router.incident` Reroute | O((V+E) log V) xấu nhất | O(V) | dừng sớm tại đích |

Số đo sơ bộ (định tính, số chính thức ở mục thực nghiệm): trên bản đồ thật 38.604 đỉnh / 69.411 cạnh, heap lớn nhất chỉ vài trăm phần tử cho cả hai biến thể; skip ≈ 0,4 ms, Reroute ≈ 110 ms.

---

## 3. Ví dụ chạy tay: Dijkstra trên đồ thị 5 đỉnh

Cạnh có hướng, theo thứ tự thêm vào (thứ tự này quyết định thứ tự duyệt `out[u]`):

| edge_id | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| cạnh | 0→1 | 0→2 | 1→3 | 1→4 | 2→1 | 2→3 | 3→4 |
| w | 4 | 1 | 1 | 6 | 2 | 5 | 3 |

Nguồn s = 0. Kết quả đúng: `dist = [0, 3, 1, 4, 7]`, Route tới 4 là 0→2→1→3→4. Các trạng thái dưới đây lấy từ chạy thật mã nguồn (mảng heap theo thứ tự ô 0, 1, 2, ...; phần tử ghi dạng (key, đỉnh)).

### 3.1. Biến thể adaptable

| Bước | Thao tác | Mảng heap sau thao tác | dist |
|---|---|---|---|
| 0 | add (0, 0) | [(0,0)] | [0, ∞, ∞, ∞, ∞] |
| 1 | remove_min → (0,0), chốt 0 | [] | |
| | 0→1: 4 < ∞, add (4,1) | [(4,1)] | [0, 4, ∞, ∞, ∞] |
| | 0→2: 1 < ∞, add (1,2) → upheap | [(1,2), (4,1)] | [0, 4, 1, ∞, ∞] |
| 2 | remove_min → (1,2), chốt 2 | [(4,1)] | |
| | 2→1: 1+2 = 3 < 4, **update** locs[1] → 3 | [(3,1)] | [0, 3, 1, ∞, ∞] |
| | 2→3: 1+5 = 6, add (6,3) | [(3,1), (6,3)] | [0, 3, 1, 6, ∞] |
| 3 | remove_min → (3,1), chốt 1 | [(6,3)] | |
| | 1→3: 3+1 = 4 < 6, **update** locs[3] → 4 | [(4,3)] | [0, 3, 1, 4, ∞] |
| | 1→4: 3+6 = 9, add (9,4) | [(4,3), (9,4)] | [0, 3, 1, 4, 9] |
| 4 | remove_min → (4,3), chốt 3 | [(9,4)] | |
| | 3→4: 4+3 = 7 < 9, **update** locs[4] → 7 | [(7,4)] | [0, 3, 1, 4, 7] |
| 5 | remove_min → (7,4), chốt 4 | [] | xong |

`peak = 2`. Ba lần decrease-key, mỗi lần tìm phần tử qua `locs[v].index` trong O(1).

### 3.2. Biến thể lazy, cùng đồ thị

| Bước | Thao tác | Mảng heap sau thao tác |
|---|---|---|
| 1 | pop (0,0), chốt 0; push (4,1), push (1,2) | [(1,2), (4,1)] |
| 2 | pop (1,2), chốt 2; push (3,1), push (6,3) | [(3,1), (4,1), (6,3)] |
| 3 | pop (3,1), chốt 1; push (4,3), push (9,4) | [(4,1), (6,3), (4,3), (9,4)] |
| 4 | pop (4,1): 1 đã chốt → **bỏ qua** | [(4,3), (6,3), (9,4)] |
| 5 | pop (4,3), chốt 3; push (7,4) | [(6,3), (9,4), (7,4)] |
| 6 | pop (6,3): **bỏ qua** | [(7,4), (9,4)] |
| 7 | pop (7,4), chốt 4 | [(9,4)] |
| 8 | pop (9,4): **bỏ qua** | [] |

`peak = 4` so với 2 của adaptable, 8 lần pop so với 5 lần remove_min. Đây là hình ảnh thu nhỏ của "lazy heap ≤ E+1, APQ ≤ V".

### 3.3. Dừng sớm với t = 3

Thuật toán dừng ngay sau bước 4 (chốt 3). Khi đó `dist = [0, 3, 1, 4, 9]`: `dist[3] = 4` là đúng, nhưng `dist[4] = 9` chỉ là cận trên (đúng là 7). Đúng như docstring `routing.py:27`.

### 3.4. Dùng chính ví dụ này cho câu hỏi Reroute

Route 0→4 là 0→2→1→3→4, tổng 7.
- Tăng 1→4 (edge 3, ngoài Route) từ 6 lên 50: bỏ qua, Route vẫn 7. Đúng theo bổ đề.
- **Giảm** 1→4 từ 6 xuống 2: đường 0→2→1→4 = 1+2+2 = 5 < 7. Cạnh ngoài Route nhưng giảm → phải tính lại.
- Tăng 3→4 (edge 6, trên Route) từ 3 lên 10: Route cũ thành 14, đường 0→2→1→4 = 9 rẻ hơn → phải tính lại.

---

## 4. Câu hỏi hội đồng có thể hỏi

**Q1. Vì sao Dijkstra sai khi có trọng số âm? Hệ thống chặn ở đâu?**
Chứng minh greedy choice cần bước "đoạn đường từ y tới u không âm nên δ(s,y) ≤ δ(s,u)". Có cạnh âm thì bước này hỏng. Phản ví dụ: 0→1 (2), 0→2 (3), 2→1 (−2). Dijkstra chốt 1 với 2, sau đó chốt 2 với 3 và cạnh 2→1 bị bỏ qua vì 1 đã chốt, trong khi đúng là δ(0,1) = 1. Hệ thống chặn ở biên dữ liệu: `add_edge` (`graph.py:58`) và `set_travel_time` (`graph.py:83`) từ chối giá trị âm và NaN. Closure dùng cờ `closed`, không dùng số đặc biệt.

**Q2. Locator dùng để làm gì? Sao không dùng `dict` vertex → index?**
Để `update`/`remove` một phần tử ở giữa heap, phải biết nó ở ô nào. Không có thông tin đó thì phải quét O(n). Locator tự giữ `index`, đọc ra O(1) trường hợp xấu nhất (hash map chỉ O(1) kỳ vọng). Đề bài cấm `dict`/`set` thay CTDL lõi, và `tests/test_core_rules.py` quét AST để chặn. Dijkstra lưu `locs[v]` trong một `list` vì đỉnh đánh số liên tục 0..V−1 (ADR-0002). Cái giá: mỗi lần dời phần tử phải ghi thêm `index`, và mỗi phần tử có thêm một đối tượng.

**Q3. Stale Locator là gì, code xử lý thế nào?**
Là Locator của phần tử đã rời heap (qua `remove_min` hoặc `remove`), hoặc của một heap khác. `_remove_at` gán `index = -1` (`apq.py:94`). `_validate` (`apq.py:81-84`) kiểm tra cả khoảng chỉ số lẫn `_data[index] is loc`, nên ngay cả khi `index` rơi đúng vào một ô hợp lệ của heap khác, phép `is` vẫn phát hiện. Kết quả: `ValueError`, có test ở `tests/test_apq.py:59-73`.

**Q4. Tại sao `update` cần cả upheap và downheap? Increase-key xử lý ra sao?**
Giảm khóa chỉ có thể vi phạm quan hệ với cha → upheap. Tăng khóa chỉ có thể vi phạm quan hệ với con → downheap. `_bubble` (`apq.py:97-101`) chọn đúng một chiều. Trong Dijkstra chỉ xảy ra decrease-key (điều kiện `nd < dist[v]`), nên increase-key của heap không được dùng ở đây. Khi Travel Time của một cạnh **tăng** trên bản đồ, đó là việc của `Router`: hoặc bỏ qua theo quy tắc, hoặc chạy lại Dijkstra từ đầu tại vị trí xe; không sửa khóa trong một heap cũ.

**Q5. Chứng minh update là O(log n)?**
Mảng là cây nhị phân đầy đủ, cao ⌊log₂ n⌋. Upheap mỗi vòng lên một tầng, downheap mỗi vòng xuống một tầng với tối đa 2 phép so sánh, `_bubble` chỉ chạy một trong hai, `_validate` O(1). Nên O(log n).

**Q6. `remove(loc)` ở giữa heap: đưa phần tử cuối vào lỗ, sao chỉ cần một chiều bubble là đủ?**
Gọi x là phần tử cuối được đặt vào ô j. Nếu x < cha(j) thì x cũng nhỏ hơn mọi phần tử trong cây con của j (vì cha(j) ≤ chúng), nên chỉ cần upheap. Ngược lại quan hệ với cha đúng, chỉ cần downheap.

**Q7. Lazy heap có đúng không? Độ phức tạp có tệ hơn không?**
Đúng. Với mỗi đỉnh chưa chốt, heap luôn có một bản sao mang khóa `dist[v]` hiện tại; các bản sao cũ có khóa lớn hơn. Nên bản sao đầu tiên của v được lấy ra mang đúng khóa nhỏ nhất, các bản sao sau bị bỏ qua nhờ `done[u]` (`routing.py:239-240`). Số push ≤ E+1 → O(E log E). Không có cạnh song song thì E ≤ V² nên log E ≤ 2 log V, tức O(E log V): cùng bậc với APQ. Khác nhau ở bộ nhớ heap: O(E) so với O(V).

**Q8. Vậy APQ có nhanh hơn lazy heap không?**
Không nhất thiết, và báo cáo nói thẳng điều đó. Trên đồ thị dạng đường bộ, frontier hẹp, heap lớn nhất chỉ vài trăm phần tử ngay cả ở 50.000 đỉnh, rất ít bản sao cũ, nên hai biến thể nhanh tương đương; trên bản đồ thật lazy còn nhanh hơn một chút (không phải ghi `index` mỗi lần dời). Trên đồ thị dày E ≈ V²/4, decrease-key xảy ra nhiều, lazy heap lớn hơn khoảng 4 lần và chậm hơn. Lợi thế thật của APQ: heap bị chặn bởi V, và có `update`/`remove` phần tử bất kỳ.

**Q9. Tại sao trên đồ thị đường bộ APQ lại tốn bộ nhớ hơn?**
Vì mỗi đỉnh đã tới được có một đối tượng Locator, và mảng `locs` (`routing.py:208`) giữ các Locator đó tới hết lần chạy, kể cả khi chúng đã rời heap. Tổng là O(số đỉnh tới được). Lazy heap lưu tuple `(key, value)`, tuple được giải phóng ngay khi pop; vì heap đỉnh chỉ vài trăm phần tử nên lượng bộ nhớ sống cùng lúc nhỏ. Tức là "heap ≤ V" không có nghĩa "tổng bộ nhớ ít hơn": khi lazy heap không phình thì chi phí Locator chiếm phần lớn.

**Q10. `heapq` của Python nhanh hơn heap của nhóm, vậy sao không dùng?**
`heapq` viết bằng C, nên nhanh hơn mọi heap viết bằng Python thuần dù cùng thuật toán; so với nó là so ngôn ngữ chứ không so thuật toán. Ngoài ra `heapq` không có decrease-key/Locator, và đề yêu cầu tự cài đặt. Trong dự án, `heapq` chỉ có ở `bench/run.py:81` làm đường tham chiếu; test quy tắc lõi cấm import nó trong `core/`. Baseline công bằng là `LazyBinaryHeap`, Python thuần, cùng kỹ thuật dời lỗ.

**Q11. Khi nào dùng Dijkstra mảng O(V²)?**
Khi đồ thị dày, E = Θ(V²): heap cho O(V² log V), mảng cho O(V²). Trên bản đồ đường bộ E = O(V), mảng thua xa. Trong dự án, Prim cho Backbone Network trên đồ thị Hub đầy đủ cũng dùng mảng vì cùng lý do (`network.py:93-110`).

**Q12. Dừng sớm tại t có đúng không? Các đỉnh khác thì sao?**
Đúng cho t: theo bổ đề greedy, khi t được lấy ra thì `dist[t] = δ(s,t)`. Chuỗi `parent` của t chỉ đi qua đỉnh đã chốt (cạnh cha luôn xuất phát từ đỉnh đã chốt, và `parent` của đỉnh đã chốt không đổi nữa), nên Route dựng lại cũng đúng. Các đỉnh chưa chốt chỉ có cận trên (ví dụ mục 3.3: dist[4] = 9 thay vì 7). Test `tests/test_routing.py:37` so dừng sớm với chạy đầy đủ cho cả ba biến thể.

**Q13. Bellman-Ford dùng khi nào? Vì sao nó chịu được trọng số âm?**
Dùng khi có cạnh âm (không có chu trình âm). Chứng minh của nó là quy nạp theo số cạnh: sau lượt i, `dist[v]` ≤ đường ngắn nhất dùng ≤ i cạnh; không có bước "chốt" tham lam nào nên không cần w ≥ 0. Trong dự án Travel Time luôn ≥ 0, nên Bellman-Ford chỉ là lời giải đối chứng độc lập (`tests/test_routing.py:20`: 150 đồ thị ngẫu nhiên, so bằng tuyệt đối) và là baseline O(VE) trong benchmark. Cài đặt không chạy lượt thứ V để phát hiện chu trình âm, vì không cần.

**Q14. Bellman-Ford dừng sớm có làm sai không?**
Không. Nếu một lượt không đổi `dist` nào, `dist` đã là điểm bất động của phép nới lỏng, các lượt sau cũng không đổi gì. Tốt nhất O(E) (một lượt + lượt kiểm tra), xấu nhất vẫn O(VE).

**Q15. Phát biểu và chứng minh quy tắc bỏ qua của Router.**
Nếu chỉ một cạnh e ∉ R thay đổi, và chỉ tăng hoặc bị Closure, thì R vẫn tối ưu. Vì e ∉ R nên chi phí R không đổi; mọi đường P khác có chi phí không giảm (mọi cạnh không giảm), mà trước đó c(P) ≥ c(R), nên vẫn c'(P) ≥ c'(R). Closure chỉ loại bớt ứng viên. Cắt phần đã đi giữ tối ưu nhờ tính chất đường con của đường ngắn nhất. Quy nạp trên dãy sự cố: Route trong Router luôn tối ưu từ vị trí xe theo trọng số hiện tại. Test ngẫu nhiên `tests/test_routing.py:103`: 40 đồ thị × 25 sự cố, so với Dijkstra mới sau mỗi sự cố.

**Q16. Khi nào quy tắc bỏ qua không an toàn?**
- Travel Time **giảm** trên cạnh ngoài Route (mục 3.4: 1→4 giảm từ 6 xuống 2 tạo đường 5 < 7). Code tính lại.
- Sự cố trên chính Route (tăng hoặc Closure). Code tính lại.
- Thay đổi không đi qua `Router.incident`, ví dụ gọi thẳng `g.reopen(e)` (là một kiểu giảm) hoặc `g.set_travel_time` từ bên ngoài: Router không biết nên Route có thể không còn tối ưu. Quy tắc chỉ đúng khi mọi Traffic Incident đi qua `incident`.
- Nhiều cạnh đổi cùng lúc: quy tắc vẫn đúng nếu tất cả đều chỉ tăng và đều ngoài Route (lập luận giống hệt), nhưng code xử lý từng sự cố một.
- `_on_route` có kích thước cố định theo `g.m` lúc tạo Router (`routing.py:132`): thêm cạnh sau đó thì phải tạo Router mới.

**Q17. Tại sao sự cố tăng trên Route thì luôn tính lại, dù có khi R vẫn tối ưu?**
Đó là lựa chọn bảo thủ: muốn biết R còn tối ưu hay không thì cũng phải so với các đường khác, tức là gần như chạy lại Dijkstra. Incremental SSSP (cập nhật cây đường đi ngắn nhất theo từng thay đổi) nằm ngoài phạm vi.

**Q18. Chi phí skip và Reroute khác nhau thế nào?**
Kiểm tra `on_route[e]` là O(1). Cả lần skip là O(L) vì phải tìm vị trí xe trên Route và cộng lại hậu tố (O(1) nếu xe đang ở điểm đầu Route, vì `pos = 0` thì không cắt). Reroute là O((V+E) log V) xấu nhất, có dừng sớm. Trên bản đồ 38.604 đỉnh: khoảng 0,4 ms so với khoảng 110 ms.

**Q19. A\* khác Dijkstra thế nào? Nhóm có cài A\* không?**
Không cài; A\* nằm trong danh sách phần thưởng của plan nhưng chưa làm. A\* là Dijkstra với khóa `dist[v] + h(v)`, trong đó h là heuristic chấp nhận được (không vượt quá khoảng cách thật tới đích) và nhất quán; trên bản đồ có thể dùng khoảng cách haversine chia cho tốc độ lớn nhất. Nó vẫn đúng và thường chốt ít đỉnh hơn khi chỉ cần một đích. Với `distance_matrix` cần khoảng cách tới nhiều điểm thì Dijkstra đầy đủ phù hợp hơn.

**Q20. Vì sao ma trận khoảng cách không đối xứng, và ảnh hưởng gì?**
Đường một chiều làm d(i,j) ≠ d(j,i). Test `tests/test_routing.py:80`: chu trình một chiều 0→1→2→0 mỗi cạnh 10 s cho d(0,1) = 10, d(1,0) = 20. Hệ quả: TSP của TV4 là ATSP (Held-Karp vẫn đúng); Backbone Network của TV3 dùng trọng số trung bình hai chiều (`network.py:93-110`) để có đồ thị vô hướng cho MST.

**Q21 (nếu bị hỏi vặn). Giá trị `None` trong `update`?**
`update(loc, newkey, newvalue=None)`: `None` nghĩa là giữ value cũ (`apq.py:71`). Hệ quả phụ: không thể đổi value thành `None` qua `update`. Dijkstra không bị ảnh hưởng vì chỉ đổi khóa.

---

## 5. Những điểm code khác với tài liệu khác

- `plan.md` mục 4 ghi `Router.reroute(incident, current_node)`; code thật là `Router.incident(edge_id, travel_s=None, close=False, at=None)` (`routing.py:149`). Khi trả lời, dùng tên trong code.
- `plan.md` mục 4 ghi `heaps.py` có `ArrayPQ`; code thật chỉ có `LazyBinaryHeap`, biến thể mảng nằm trực tiếp trong `_dijkstra_array` (`routing.py:257`).
- Đẳng thức O(E log E) = O(E log V) cần E ≤ V², tức là không có quá nhiều cạnh song song. `RoadNetwork` cho phép cạnh song song (`find_edge` chọn cạnh rẻ nhất, `graph.py:45-51`), nhưng trên bản đồ E = O(V) nên không ảnh hưởng.
- Trên bản đồ thật (`bench/results/sssp_osm.csv`), lazy heap nhanh hơn APQ một chút chứ không chỉ "tương đương"; heap lớn nhất 276 (APQ) so với 289 (lazy). Nói "cùng bậc, lazy có thể nhanh hơn một chút" là an toàn.
