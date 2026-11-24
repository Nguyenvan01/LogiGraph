# TV4 – Chuẩn bị vấn đáp: 0/1 Knapsack và TSP (Held-Karp)

Phạm vi: `logigraph/core/loading.py`, `logigraph/core/tsp.py`, phần gọi M4 trong `logigraph/core/trip.py`. Phần báo cáo tương ứng: `report/sections/05-dp.tex`.

Quy ước: `n` = số Parcel (Knapsack) hoặc số đỉnh tính cả Hub (TSP), `W` = tải trọng (đơn vị 0,1 kg), `m = n - 1` trong Held-Karp, `V`, `E` = số Intersection và Road Segment.

---

## 1. Đi qua code

### 1.1 `loading.py`

Mọi hàm trả về `(tổng cước tốt nhất, danh sách chỉ số Parcel tăng dần)` và đều gọi `_check` trước.

**`_check`** (`loading.py:14-25`). Kiểm tra ở biên module: `weights` và `values` cùng độ dài; `capacity` là `int` ≥ 0 (loại `bool`); mỗi khối lượng là `int` > 0; mỗi cước ≥ 0. Sai thì `ValueError`. Khối lượng phải dương vì vòng DP chạy `range(capacity, w - 1, -1)`, với `w = 0` ô `best[c - 0]` là chính nó và ý nghĩa "lấy một lần" bị phá.

**`_by_ratio`** (`loading.py:28-32`). Trả về chỉ số Parcel sắp giảm dần theo `values[i] / weights[i]`, O(n log n). Dùng chung cho B&B và greedy. Không chia cho 0 vì `_check` đã chặn `w <= 0`.

**`knapsack_dp`** (`loading.py:35-61`). Lời giải chính, được `plan_trip` gọi.
- `:44-46` – `width = W + 1`; `best = [0] * width` là mảng một chiều; `keep = bytearray(n * width)` là bảng truy vết phẳng, ô `(i, c)` ở vị trí `i * width + c`.
- `:47-53` – với mỗi Parcel `i`, duyệt `c` từ `W` xuống `w`. Nếu `best[c - w] + v > best[c]` thì cập nhật và đặt `keep[row + c] = 1`. So sánh `>` (không phải `>=`) nên khi bằng nhau thì không lấy.
- `:54-61` – truy vết: `c = W`, đi `i` từ `n-1` về `0`, gặp `keep[i][c] = 1` thì lấy `i` và `c -= weights[i]`; cuối cùng đảo để chỉ số tăng dần.
- Thời gian O(nW). Bộ nhớ O(W) số + `n(W+1)` byte.

**`knapsack_bnb`** (`loading.py:64-96`). Branch and Bound duyệt sâu, lời giải chính xác thứ hai.
- `:75-77` – sắp Parcel theo tỉ lệ giảm dần, `w_sorted`, `v_sorted` là bản đã sắp.
- `:81-82` – `take` (bytearray n) giữ quyết định trên đường đi hiện tại; mỗi phần tử của stack là `(level, value, room, decision)`, trong đó `decision` là quyết định cho Parcel `level - 1`.
- `:84-86` – pop một nút và ghi `take[level-1] = decision`. Các ô `< level-1` vẫn đúng vì nút cha được pop trước các nút con (DFS) và các nút anh em đã duyệt xong thì không ảnh hưởng tiền tố của nút này.
- `:87-88` – mọi nút đều là một nghiệm hợp lệ (các Parcel chưa quyết định coi như không lấy), nên cập nhật nghiệm tốt nhất ngay tại nút.
- `:89-90` – cắt nhánh nếu đã hết Parcel hoặc cận phân số `<= best_value`.
- `:91-93` – đẩy nhánh "không lấy" trước, nhánh "lấy" (chỉ khi còn vừa) sau, nên nhánh "lấy" được pop trước. Đường đi đầu tiên chính là nghiệm greedy, nên có mốc cắt nhánh tốt ngay từ đầu.
- `:94-96` – đổi chỉ số đã sắp về chỉ số gốc và sắp tăng dần.
- Thời gian xấu nhất O(n·2ⁿ), bộ nhớ O(n). Không đệ quy nên chạy được n = 1000 (`tests/test_loading.py:65`).

**`_fractional_bound`** (`loading.py:99-108`). Cận trên = `value` + nghiệm Knapsack phân số trên các Parcel từ `level` trở đi: lấy trọn khi còn vừa, Parcel đầu tiên không vừa thì lấy phần `room / w`. O(n) mỗi lần gọi.

**`knapsack_greedy`** (`loading.py:111-124`). Baseline: theo tỉ lệ giảm dần, Parcel nào còn vừa thì lấy. O(n log n). Không tối ưu.

**`knapsack_brute`** (`loading.py:127-145`). Vét cạn `2ⁿ` bitmask, O(n·2ⁿ), chỉ nhận `n <= 22` (`BRUTE_MAX_N`, `loading.py:11`). Dùng làm lời giải chuẩn trong test.

### 1.2 `tsp.py`

Ma trận `dist[u][v]` là Travel Time ngắn nhất, `math.inf` là không tới được. Mọi hàm trả về `(chi phí, tour)` với tour bắt đầu và kết thúc tại `start`, ví dụ `[0, 2, 1, 0]`; không có chu trình Hamilton thì `(math.inf, [])`.

**`_check`** (`tsp.py:17-27`). Ma trận khác rỗng, vuông, `0 <= start < n`. Sai kích thước thì `ValueError`, `start` sai thì `IndexError`.

**`held_karp`** (`tsp.py:30-82`).
- `:39-42` – từ chối `n > 16` (`HELD_KARP_MAX_N`, `tsp.py:13`); `n = 1` trả về `(0, [start, start])`.
- `:43-47` – `others` là các đỉnh khác `start`, `m = n - 1`, `full = 2^m - 1`. Hai list phẳng `cost`, `parent` kích thước `m·2^m`, ô `(mask, j)` ở vị trí `mask*m + j`.
- `:48-49` – trường hợp cơ sở `cost[{j}][j] = dist[start][others[j]]`.
- `:51-64` – duyệt `mask` tăng dần; với mỗi `j` thuộc `mask` có chi phí hữu hạn, thử mọi `k` chưa thuộc `mask` và cập nhật ô `(mask | 1<<k, k)`, ghi `parent = j`. Đây là công thức truy hồi viết theo kiểu đẩy xuôi.
- `:66-72` – đóng vòng: `min_j cost[full][j] + dist[others[j]][start]`. Nếu không có `j` nào hữu hạn thì `(inf, [])`.
- `:73-82` – truy vết: từ `(full, last)` thêm `others[j]` vào tour, lấy `parent`, tắt bit `j` (`mask ^= 1 << j`), lặp tới khi `j == -1`; thêm `start` hai đầu và đảo ngược.
- Thời gian O(n²·2ⁿ), bộ nhớ O(n·2ⁿ).

**`nearest_neighbour`** (`tsp.py:85-111`). Baseline: luôn đi tới đỉnh chưa thăm gần nhất. `:100-101` bị kẹt (mọi đỉnh còn lại đều `inf`) thì trả `(inf, [])`; `:106-109` cung quay về Hub bằng `inf` cũng trả `(inf, [])`. O(n²), bộ nhớ O(n).

**`tsp_brute`** (`tsp.py:114-145`). Vét cạn `(n-1)!` hoán vị các đỉnh khác `start` bằng thuật toán Heap dạng lặp (`:127-142`), mỗi hoán vị tính chi phí bằng `_tour_cost` (`tsp.py:148-154`) trong O(n). Tổng O(n·(n-1)!) = O(n!). Chỉ nhận `n <= 10`.

### 1.3 `trip.py` (module tích hợp của TV1, phần TV4 cần nắm)

**`Trip`** (`trip.py:14-24`). Lớp dữ liệu dùng `__slots__`: `parcels` (chỉ số Parcel được chọn), `stops` (Hub, các Delivery Point theo thứ tự, Hub), `total_s` (tổng Travel Time của vòng), `edges` (dãy Road Segment để vẽ), `fee`, `weight`.

**`plan_trip`** (`trip.py:29-85`).
1. `:39-42` – kiểm tra `1 <= max_stops <= 15` (tối đa 16 đỉnh tính cả Hub, khớp giới hạn `held_karp`) và ba danh sách cùng độ dài.
2. `:43-52` – **Bước 1**: gom mọi Parcel ứng viên theo Delivery Point bằng mảng `slot` kích thước `g.n` (không dùng `dict`), cộng cước từng điểm (`point_fee`).
3. `:54-59` – **Bước 2**: giữ tối đa `max_stops` điểm có tổng cước cao nhất; `cand` = các Parcel tại những điểm đó.
4. `:61-68` – **Bước 3**: `knapsack_dp` trên `cand` với tải trọng `capacity`; điểm dừng = Delivery Point của các Parcel được chọn (mảng `used` để bỏ trùng). Nghiệm Knapsack được dùng trọn, không cắt sau.
5. – không còn điểm dừng thì trả Trip rỗng `[hub, hub]`.
6. `:74-77` – `distance_matrix(g, [hub] + stops)` (một Dijkstra đầy đủ từ mỗi đỉnh) rồi `held_karp(..., 0)`; chi phí vô hạn (có điểm không tới được, ví dụ do Closure) → `ValueError`.
7. `:80-82` – mở rộng từng chặng bằng `shortest_path(g, a, b)` có dừng sớm và `path_edges`.
8. – tạo `Trip`; `total_s` là chi phí Held-Karp.

*Vì sao chọn điểm trước Knapsack?* Bản đầu chạy Knapsack trước rồi cắt về 12 điểm, nên tải trọng vừa giải phóng bị bỏ trống (demo chỉ còn 21% tải). Đổi thứ tự thì nghiệm Knapsack được dùng trọn: sáu chuyến demo đạt 359–399 kg trên xe 400 kg.

Demo (`app/server.py:23, 38-39, 153-154`): 400 Parcel, Truck là xe van 400 kg (`W = 4 000`), khối lượng 10–800 (1–80 kg), cước 15–300 nghìn đồng, `max_stops = 12`. Parcel ứng viên của một Trip là các Parcel cùng một Delivery Cluster (Kruskal k-cluster).

---

## 2. Bảng độ phức tạp

| Hàm | Thời gian | Bộ nhớ | Ghi chú |
|---|---|---|---|
| `knapsack_dp` | O(nW) | O(W) số + n(W+1) byte | pseudo-polynomial |
| `knapsack_bnb` | O(n log n) + O(n) mỗi nút, xấu nhất O(n·2ⁿ) | O(n) | không phụ thuộc W |
| `knapsack_greedy` | O(n log n) | O(n) | không tối ưu |
| `knapsack_brute` | O(n·2ⁿ) | O(n) | n ≤ 22 |
| `held_karp` | O(n²·2ⁿ) | O(n·2ⁿ) | n ≤ 16 |
| `nearest_neighbour` | O(n²) | O(n) | không tối ưu, có thể kẹt |
| `tsp_brute` | O(n!) | O(n) | n ≤ 10 |
| `plan_trip` | O(nW) + O(k(V+E) log V) + O(k²·2ᵏ) | O(nW + V + k·2ᵏ) | k ≤ max_stops + 1 |

Bậc số phép toán (bảng trong báo cáo):

| n | n²·2ⁿ | n·2ⁿ | n! |
|---|---|---|---|
| 10 | 1,02·10⁵ | 1,02·10⁴ | 3,63·10⁶ |
| 15 | 7,37·10⁶ | 4,92·10⁵ | 1,31·10¹² |
| 20 | 4,19·10⁸ | 2,10·10⁷ | 2,43·10¹⁸ |

---

## 3. Câu hỏi hội đồng hay hỏi

**Q1. Knapsack O(nW) có phải thuật toán đa thức không?**
Không. W là giá trị, trong input chỉ tốn O(log W) bit, nên kích thước input là O(n log W). nW = n·2^(log W) là hàm mũ theo độ dài input. Gọi là pseudo-polynomial: đa thức theo độ lớn con số, không đa thức theo số bit. Bài toán 0/1 Knapsack là NP-hard nên điều này không mâu thuẫn gì. Chỉ khi W bị chặn bởi một đa thức theo n thì thuật toán mới thành đa thức.

**Q2. Vì sao duyệt c từ W xuống w_i?**
Để khi tính `best[c]` thì `best[c - w_i]` vẫn là giá trị của hàng cũ (chưa có Parcel i). Duyệt tăng thì `best[c - w_i]` đã có thể chứa Parcel i, Parcel bị lấy nhiều lần – đó là Knapsack không giới hạn. Ví dụ một Parcel w=2, v=3, W=4: duyệt tăng cho best[4] = 6.

**Q3. Mảng một chiều thì truy vết thế nào?**
Bản thân `best` không truy vết được vì đã mất các hàng cũ. Code lưu `keep` (bytearray n·(W+1)), `keep[i][c] = 1` khi lượt i cải thiện `best[c]`. Truy vết từ c = W, i từ n-1 về 0: gặp 1 thì lấy i và trừ c đi w_i (`loading.py:54-61`). Cách khác: lưu cả bảng 2 chiều (tốn ít nhất 8 lần bộ nhớ vì mỗi ô list là một con trỏ 8 byte), hoặc dùng bitset (nhỏ hơn 8 lần nữa, nhóm chưa cài).

**Q4. Bảng keep tốn bao nhiêu bộ nhớ?**
n(W+1) byte. n = 1000, W = 15 000 → khoảng 15 MB. Trong demo W = 10 000 và mỗi cụm cỡ vài chục đến hơn trăm Parcel, nên chỉ cỡ 1 MB.

**Q5. Vì sao khối lượng là số nguyên đơn vị 0,1 kg?**
DP dùng tải trọng làm chỉ số mảng nên phải là số nguyên. 0,1 kg đủ chính xác cho Parcel 1–80 kg và giữ W = 4 000 cho xe 400 kg. Đổi sang 0,01 kg thì W = 40 000, thời gian và bộ nhớ keep tăng 10 lần. Code từ chối số thực (`_check`); nếu dữ liệu gốc là số thực thì khi quy đổi nên làm tròn lên để không vượt tải thật.

**Q6. Knapsack phân số khác 0/1 thế nào?**
Phân số cho phép lấy một phần Parcel; greedy theo tỉ lệ cho nghiệm tối ưu (đổi khối lượng từ Parcel tỉ lệ thấp sang tỉ lệ cao không làm giảm cước). 0/1 không cho chia nên greedy sai, phải dùng DP hoặc B&B. Nghiệm phân số luôn ≥ nghiệm 0/1, nên được dùng làm cận trên.

**Q7. Vì sao cận phân số là cận trên hợp lệ?**
Mọi cách hoàn thiện 0/1 của một nút đều là nghiệm hợp lệ của bài toán phân số trên các Parcel còn lại (vì {0,1} ⊂ [0,1]). Greedy theo tỉ lệ cho nghiệm phân số tối ưu, nên giá trị này ≥ mọi cách hoàn thiện 0/1. Cắt khi cận ≤ nghiệm tốt nhất là an toàn. Điều kiện: các Parcel phải được sắp theo tỉ lệ giảm dần, nếu không thì `_fractional_bound` không còn là nghiệm phân số tối ưu.

**Q8. B&B tệ nhất thế nào?**
O(n·2ⁿ): có thể phải duyệt cả cây 2ⁿ lá, mỗi nút O(n) để tính cận. Xảy ra khi cận yếu, ví dụ các Parcel có tỉ lệ cước/khối lượng gần bằng nhau, cận phân số gần như luôn cao hơn nghiệm hiện có nên hầu như không cắt được. B&B lợi khi W lớn vì không phụ thuộc W.

**Q9. Vì sao B&B dùng stack tường minh?**
Đệ quy sâu n mức sẽ chạm giới hạn đệ quy mặc định của Python (khoảng 1000). Stack tường minh chỉ giữ tối đa n+1 nút, test chạy n = 1000 (`tests/test_loading.py:65`).

**Q10. Cho ví dụ greedy theo tỉ lệ sai.**
w = (6, 5, 5), v = (7, 5, 5), W = 10. Greedy lấy Parcel 0 (tỉ lệ 7/6), còn 4 đơn vị không vừa gì → 7. Tối ưu lấy Parcel 1 và 2 → 10 (`tests/test_loading.py:49-53`). Ví dụ 4 Parcel ở mục 4.1 cũng cho greedy 8, tối ưu 9.

**Q11. Vì sao Held-Karp cần bitmask?**
Trạng thái phải ghi nhận *tập* đỉnh đã thăm. Bitmask mã hóa một tập con thành số nguyên 0..2^m-1, nên dùng được làm chỉ số mảng (không cần dict/set), kiểm tra thuộc tập bằng `mask >> j & 1` trong O(1), thêm đỉnh bằng `mask | 1 << k`. Duyệt mask tăng dần là đủ để mọi tập con được xử lý trước tập cha, vì tập con thực sự luôn có giá trị nguyên nhỏ hơn.

**Q12. Vì sao Held-Karp nhanh hơn n! mà vẫn đúng?**
Chi phí phần còn lại của tour chỉ phụ thuộc vào tập đã thăm và đỉnh đang đứng, không phụ thuộc thứ tự thăm bên trong tập. Mọi thứ tự có cùng (S, j) được gộp thành một trạng thái, chỉ giữ cái rẻ nhất. Số trạng thái (n-1)·2^(n-1) thay vì (n-1)! thứ tự. Ở n = 15: khoảng 7,4·10⁶ so với 1,3·10¹² phép toán.

**Q13. Bộ nhớ và thời gian ở n = 16?**
m = 15, mỗi bảng 15·2¹⁵ = 491 520 ô. List Python tốn 8 byte con trỏ mỗi ô → khoảng 3,9 MB mỗi bảng, cộng các object float của `cost`. Bộ nhớ chưa phải vấn đề; giới hạn thực tế là thời gian: đo thử trên máy phát triển, n = 15 khoảng 0,3 s, n = 16 khoảng 0,6 s, mỗi lần thêm một đỉnh thời gian tăng hơn gấp đôi. Ở n = 20 mỗi bảng khoảng 10⁷ ô (vài trăm MB tính cả object) và cỡ chục giây trở lên. Vì vậy `HELD_KARP_MAX_N = 16`, `max_stops ≤ 15`, demo dùng 12. (Số liệu chính thức ở phần thực nghiệm.)

**Q14. Vì sao ma trận khoảng cách không đối xứng? Held-Karp có phải sửa không?**
Road Network có hướng vì có đường một chiều, nên Travel Time ngắn nhất u→v và v→u khác nhau. Đây là ATSP. Held-Karp không cần sửa: công thức dùng `dist[others[j]][others[k]]` theo đúng chiều đi, không giả định đối xứng. Hệ quả: một tour và tour ngược có chi phí khác nhau (`tests/test_tsp.py:37-41`: 0→1→2→0 tốn 3, chiều ngược tốn 150), nên không dùng được mẹo cố định chiều để giảm một nửa như TSP đối xứng.

**Q15. Ví dụ nearest-neighbour không tối ưu?**
Ma trận 4 đỉnh ở mục 4.2: NN đi 0→1→3→2→0 = 12 vì cung đầu 0→1 rẻ nhất, nhưng cuối phải trả 2→0 = 9. Held-Karp cho 0→2→1→3→0 = 5.

**Q16. Nearest-neighbour có thể không tìm được tour không?**
Có. d(0,1)=1, d(0,2)=5, d(1,0)=1, d(2,1)=1, d(1,2)=d(2,0)=∞. NN đi 0→1 rồi không còn cung hữu hạn tới 2, trả `(inf, [])` (`tsp.py:100-101`). Held-Karp tìm được 0→2→1→0 = 7.

**Q17. Hai Parcel cùng một Delivery Point thì sao?**
`plan_trip` gom theo Delivery Point bằng mảng `slot` (`trip.py:41-51`): cùng điểm chỉ tạo một điểm dừng, cước điểm dừng là tổng cước. Held-Karp chạy trên điểm dừng, không trên Parcel, nên không có đỉnh trùng với khoảng cách 0. Khi cắt `max_stops`, điểm được xếp hạng theo tổng cước này.

**Q18. Vì sao không chọn Parcel theo cả vị trí?**
Knapsack chỉ nhìn khối lượng và cước. Tối ưu đồng thời tập điểm và thứ tự đi (cân bằng cước với thời gian) là bài toán Orienteering/VRP, cũng NP-hard và ngoài phạm vi đề. Hạn chế hiện tại: bước cắt `max_stops` bỏ Parcel sau Knapsack và không lấp lại phần tải trọng vừa trống, nên kết quả không tối ưu cho bài toán "cước lớn nhất với tải trọng W và tối đa 12 điểm". Demo giảm ảnh hưởng bằng cách chỉ lấy Parcel trong cùng một Delivery Cluster.

**Q19. Đề nói "nhánh cận/DP cho TSP", sao nhóm dùng DP?**
Held-Karp có thời gian xấu nhất xác định O(n²·2ⁿ), đủ cho n ≤ 15. B&B cho TSP thường nhanh nhưng xấu nhất là O(n!) và phụ thuộc chất lượng cận. Nhóm dùng B&B cho Knapsack, nơi cận phân số đơn giản và chặt.

**Q20. Làm sao biết code đúng?**
Test đối chiếu chéo: DP, B&B, greedy với vét cạn trên 80 bộ ngẫu nhiên n ≤ 15 (`tests/test_loading.py:23-34`), B&B = DP ở n = 60; Held-Karp = vét cạn hoán vị với n = 2..8, ma trận không đối xứng có 20% ô `inf`, `start` ngẫu nhiên, và NN luôn ≥ Held-Karp (`tests/test_tsp.py:21-34`). `plan_trip` được kiểm tra không vượt tải, tour đóng và các Road Segment nối liền (`tests/test_trip.py:22-42`).

**Q21. Nếu Held-Karp trả inf trong plan_trip thì sao?**
Trả lời thật: `plan_trip` hiện không xử lý riêng trường hợp này. `held_karp` trả `(inf, [])`, `order_nodes` rỗng, nên Trip có `stops = []`, `total_s = inf`, `edges = []` nhưng `parcels` và `fee` vẫn là các Parcel đã chọn. Trên dữ liệu chuẩn bị (giữ thành phần liên thông mạnh lớn nhất) mọi ô đều hữu hạn; chỉ xảy ra khi Closure làm một điểm dừng không tới được hoặc không quay về được Hub.

---

## 4. Chạy tay

### 4.1 Knapsack 4 Parcel

w = (1, 3, 4, 5), v = (1, 4, 5, 7), W = 7. Đánh số Parcel 0..3 như trong code.

Giá trị `best[c]` sau mỗi lượt (đồng thời là hàng B[i][c] của bảng 2 chiều) và hàng `keep`:

| sau Parcel | c=0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| khởi tạo | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 (w=1, v=1) | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| keep[0] | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 1 (w=3, v=4) | 0 | 1 | 1 | 4 | 5 | 5 | 5 | 5 |
| keep[1] | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 1 |
| 2 (w=4, v=5) | 0 | 1 | 1 | 4 | 5 | 6 | 6 | 9 |
| keep[2] | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| 3 (w=5, v=7) | 0 | 1 | 1 | 4 | 5 | 7 | 8 | 9 |
| keep[3] | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |

Vài ô cần giải thích:
- Lượt 1, c = 4: `best[4-3] + 4 = 1 + 4 = 5 > 1` → 5. Vì duyệt giảm, `best[1]` lúc này vẫn là giá trị của lượt 0.
- Lượt 2, c = 7: `best[3] + 5 = 4 + 5 = 9 > 5` → 9, keep = 1.
- Lượt 3, c = 7: `best[2] + 7 = 1 + 7 = 8`, không lớn hơn 9 → giữ 9, keep = 0.

Truy vết từ c = 7: i = 3, keep 0 → bỏ; i = 2, keep[2][7] = 1 → lấy, c = 3; i = 1, keep[1][3] = 1 → lấy, c = 0; i = 0, keep[0][0] = 0 → bỏ. Kết quả {1, 2}, khối lượng 7, cước 9.

So sánh: greedy theo tỉ lệ (7/5 > 4/3 > 5/4 > 1) lấy Parcel 3 (còn 2), bỏ Parcel 1 và 2 vì không vừa, lấy Parcel 0 → {0, 3}, cước 8 < 9.

Nếu duyệt c *tăng dần* ở lượt 0 thì best[c] = c (Parcel 0 bị lấy c lần) – minh họa cho Q2.

### 4.2 Held-Karp 4 điểm (ma trận trong `tests/test_tsp.py:51-53`)

Hub = 0. Hàng là điểm đi, cột là điểm đến:

| | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| 0 | 0 | 1 | 2 | 9 |
| 1 | 9 | 0 | 9 | 1 |
| 2 | 9 | 1 | 0 | 9 |
| 3 | 1 | 9 | 1 | 0 |

`others = [1, 2, 3]`, bit 0 ↔ đỉnh 1, bit 1 ↔ đỉnh 2, bit 2 ↔ đỉnh 3.

|S| = 1 (cơ sở, C({j}, j) = d(0, j)):
- C({1}, 1) = 1; C({2}, 2) = 2; C({3}, 3) = 9. Parent = Hub.

|S| = 2:
- C({1,2}, 1) = C({2},2) + d(2,1) = 2 + 1 = 3, parent 2
- C({1,2}, 2) = C({1},1) + d(1,2) = 1 + 9 = 10, parent 1
- C({1,3}, 1) = C({3},3) + d(3,1) = 9 + 9 = 18, parent 3
- C({1,3}, 3) = C({1},1) + d(1,3) = 1 + 1 = 2, parent 1
- C({2,3}, 2) = C({3},3) + d(3,2) = 9 + 1 = 10, parent 3
- C({2,3}, 3) = C({2},2) + d(2,3) = 2 + 9 = 11, parent 2

|S| = 3:
- C({1,2,3}, 1) = min(C({2,3},2) + d(2,1), C({2,3},3) + d(3,1)) = min(10+1, 11+9) = 11, parent 2
- C({1,2,3}, 2) = min(C({1,3},1) + d(1,2), C({1,3},3) + d(3,2)) = min(18+9, 2+1) = 3, parent 3
- C({1,2,3}, 3) = min(C({1,2},1) + d(1,3), C({1,2},2) + d(2,3)) = min(3+1, 10+9) = 4, parent 1

Đóng vòng: 11 + d(1,0) = 20; 3 + d(2,0) = 12; 4 + d(3,0) = 5 → OPT = 5, đỉnh cuối 3.

Truy vết: ({1,2,3}, 3) → parent 1 → ({1,2}, 1) → parent 2 → ({2}, 2) → parent Hub. Đảo ngược: **0 → 2 → 1 → 3 → 0**, chi phí 2 + 1 + 1 + 1 = 5.

Đối chiếu vét cạn 3! = 6 tour: 0-1-2-3-0 = 20, 0-1-3-2-0 = 12, 0-2-1-3-0 = 5, 0-2-3-1-0 = 29, 0-3-1-2-0 = 36, 0-3-2-1-0 = 20. Tour ngược của nghiệm tối ưu (0-3-1-2-0) tốn 36: ví dụ rõ về ma trận không đối xứng.

Nearest-neighbour: từ 0 đi 1 (1), từ 1 đi 3 (1), từ 3 đi 2 (1), về 0 (9) → 12.

---

## 5. Điểm cần nói thật nếu bị hỏi

- `plan_trip` không xử lý riêng trường hợp Held-Karp trả `inf` (Q21).
- Docstring `plan_trip` (`trip.py:32`) ghi "k ≤ max_stops+1 lần Dijkstra"; thực tế có k lần Dijkstra đầy đủ cho ma trận và thêm k lần Dijkstra dừng sớm để mở rộng chặng. Bậc O(k(V+E) log V) không đổi.
- Cắt `max_stops` sau Knapsack làm mất tính tối ưu của tổng thể (Q18).
