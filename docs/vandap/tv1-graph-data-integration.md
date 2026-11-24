# Chuẩn bị vấn đáp TV1: đồ thị, dữ liệu, tích hợp, demo

Phạm vi TV1: `logigraph/core/graph.py`, `logigraph/core/trip.py`, `tools/prepare_osm.py`, `app/server.py` + `app/index.html`, và test `tests/test_graph.py`, `tests/test_trip.py`, `tests/test_core_rules.py`. Phần báo cáo: `report/sections/01-intro.tex`, `report/sections/02-graph.tex`.

Số dòng dưới đây đúng với code tại ngày 2026-11-24. Nếu sửa code thì kiểm tra lại.

---

## 1. Số liệu cần thuộc

| Đại lượng | Giá trị |
|---|---|
| Vùng | khung (20,990; 105,800)–(21,045; 105,865), lấy trọn 24 phường giao với khung |
| Way tải về | 10.168 way, 13 lớp `highway` dành cho ô tô |
| Đồ thị thô | 40.266 đỉnh, 71.689 Road Segment |
| Sau khi giữ SCC lớn nhất | **38.604 Intersection, 69.411 Road Segment** (bỏ 1.662 đỉnh, 2.278 cạnh) |
| Bậc ra trung bình / lớn nhất | 1,80 / 5 |
| Đỉnh có đúng 2 hàng xóm (shape point) | 30.216 (78,3%) |
| Đỉnh có ≥ 3 hàng xóm (giao lộ thật) | 6.854; điểm cụt: 1.534 |
| Way một chiều | 4.064 / 10.168; 14.441 Road Segment không có cạnh ngược |
| Way có `maxspeed` | 4.856 (chủ yếu 60 và 50 km/h) |
| Độ dài Road Segment | trung vị 18,2 m, trung bình 26,6 m; tổng mạng 1.847 km |
| Bộ nhớ đồ thị sau khi nạp | khoảng 19 MB (`tracemalloc`) |
| Ma trận kề nếu dùng | 38.604² ≈ 1,49·10⁹ ô (1,49 GB nếu 1 byte/ô, ~11,9 GB nếu 8 byte/ô) |
| Nạp CSV | khoảng 0,2 s; khởi động server khoảng 0,3–0,4 s |
| Một lần Dijkstra đầy đủ trên đồ thị thật | khoảng 0,1–0,14 s |
| Lõi | khoảng 1.300 dòng Python (1.260 dòng trong `core/`), 81 test pytest |

---

## 2. `graph.py` từng phương thức

`RoadNetwork` (`logigraph/core/graph.py:15`) dùng `__slots__` (`:16-17`), nên đối tượng không có `__dict__` riêng. Đây cũng là một chi tiết "không dùng dict".

| Phương thức | Dòng | Làm gì | Độ phức tạp |
|---|---|---|---|
| `__init__(n)` | `:19-32` | Từ chối `n < 0`. Cấp mảng đỉnh `lat`, `lon`, `district` (−1 = chưa gán), `_out` = n danh sách rỗng. Mảng cạnh `tail`, `head`, `length_m`, `travel_s` (list) và `closed` (bytearray) khởi đầu rỗng. | O(n) |
| `m` (property) | `:35-38` | Số Road Segment = `len(head)`. | O(1) |
| `out_edges(u)` | `:40-43` | Kiểm tra u rồi trả về **chính** `_out[u]` (không copy, người gọi không được sửa). Dijkstra đọc thẳng `g._out` để bỏ chi phí kiểm tra mỗi lần (`routing.py:206`). | O(1), duyệt O(deg u) |
| `find_edge(u, v)` | `:45-51` | Quét cạnh ra của u, trả về edge_id u→v có Travel Time nhỏ nhất (xử lý cạnh song song), −1 nếu không có. Server dùng để khử trùng cạnh hai chiều khi vẽ (`server.py:85`). | O(deg u) |
| `add_edge(u, v, length_m, travel_s)` | `:54-67` | Kiểm tra hai đỉnh, từ chối giá trị âm, append vào 5 mảng song song và `_out[u]`, trả về edge_id mới = `len(head)` cũ. | O(1) khấu hao |
| `set_district(u, name)` | `:69-77` | Tìm tuyến tính `name` trong `district_names`; chưa có thì thêm. Lưu chỉ số vào `district[u]`. Không dùng dict nên là quét mảng. | O(D), D = 24 |
| `set_travel_time(e, s)` | `:80-85` | Congestion. Kiểm tra e, từ chối `s < 0` hoặc NaN, ghi đè `travel_s[e]`. | O(1) |
| `close(e)` / `reopen(e)` | `:87-94` | Closure: đặt `closed[e]` = 1 / 0. Cạnh vẫn nằm trong `_out`, Dijkstra tự bỏ qua (`routing.py:217`). | O(1) |
| `from_csv(nodes, edges)` | `:97-114` | Đọc `nodes.csv`, bắt buộc id = 0..n−1 đúng thứ tự (sai thì `ValueError`), gán lat/lon/phường. Đọc `edges.csv`, gọi `add_edge` từng dòng. | O(V·D + E) |
| `_check_vertex`, `_check_edge` | `:117-123` | Chỉ số ngoài khoảng → `IndexError`. | O(1) |

Test: `tests/test_graph.py` kiểm tra kề + `find_edge` (`:16`), cập nhật tại chỗ (`:24`), từ chối −1 và NaN (`:33`), chỉ số ngoài khoảng (`:39`), đọc CSV và gán District (`:47`).

**Chỗ cần biết trước khi bị hỏi:** `add_edge` chỉ chặn số âm, không chặn NaN (`NaN < 0` là False). `set_travel_time` thì chặn cả hai. Dữ liệu CSV do script sinh ra luôn hữu hạn nên thực tế không gặp, nhưng nếu bị hỏi thì nói thẳng là biên `add_edge` chưa chặn NaN.

---

## 3. `trip.py` từng bước

`Trip` (`logigraph/core/trip.py:14-24`) chỉ là bản ghi kết quả: `parcels` (chỉ số Parcel được chọn), `stops` (Hub, các Delivery Point, Hub), `total_s`, `edges` (dãy Road Segment của cả vòng, để vẽ), `fee`, `weight`.

`plan_trip(g, hub, points, weights, fees, capacity, max_stops=12)` (`:27-74`):

1. **Kiểm tra** (`:35-38`): `max_stops` trong 1..15 vì Held-Karp nhận tối đa 16 đỉnh (Hub + 15 điểm). Ba mảng đầu vào phải cùng độ dài.
2. **Knapsack** (`:39`): `knapsack_dp(weights, fees, capacity)` của TV4, O(n·W), trả về danh sách Parcel được chọn.
3. **Gom theo Delivery Point** (`:41-51`): mảng `slot` cỡ `g.n` (−1 = chưa thấy) thay cho dict. Nhiều Parcel cùng một điểm chỉ thành một điểm dừng, cước cộng dồn vào `stop_fee`. O(n + V) vì phải cấp mảng cỡ V.
4. **Cắt theo `max_stops`** (`:53-61`): sắp các điểm theo tổng cước giảm dần, giữ `max_stops` điểm đầu, đánh dấu bằng `bytearray keep`, loại Parcel ở điểm bị bỏ. O(p log p). Có comment `ponytail:` ghi rõ giới hạn.
5. **Không còn điểm** (`:63-64`): trả Trip rỗng `[hub, hub]`.
6. **Ma trận + Held-Karp** (`:66-68`): `nodes = [hub] + stops`, `distance_matrix` chạy k+1 lần Dijkstra đầy đủ (`routing.py:88-98`), rồi `held_karp(D, 0)` của TV4 trả về `(cost, tour)` với tour bắt đầu và kết thúc ở chỉ số 0 (Hub).
7. **Nở từng chặng** (`:69-72`): với mỗi cặp liên tiếp (a, b) chạy lại `shortest_path(g, a, b)` (dừng sớm tại b) và `path_edges` để lấy dãy edge_id.
8. **Trả kết quả** (`:73-74`).

Độ phức tạp: thời gian O(n·W + V + p log p + k(V+E) log V + k²·2ᵏ); bộ nhớ O(n·W) byte (bảng `keep` của Knapsack) + O(W + V + k·2ᵏ). Tổng số lần Dijkstra là **2(k+1)**, không phải k+1 như docstring ở `:32` gợi ý: k+1 lần cho ma trận, k+1 lần dừng sớm cho các chặng, vì `distance_matrix` bỏ mảng cha. Cùng bậc, khác hằng số.

Đo thực tế (13 đỉnh): dựng ma trận ≈ 1,6 s, Held-Karp ≈ 0,06 s. Chi phí nằm ở Dijkstra, không ở DP.

Test: `tests/test_trip.py:22` (tôn trọng tải trọng, vòng khép kín bắt đầu và kết thúc ở Hub, các cạnh nối liền nhau, tổng Travel Time khớp, mọi Parcel được chọn nằm trên vòng), `:45` (không chọn được gì → Trip rỗng), `:50` (`max_stops=20` → `ValueError`).

---

## 4. Quy trình dữ liệu (`tools/prepare_osm.py`)

Chạy: `.venv/bin/python tools/prepare_osm.py`. Ngoài lõi nên được dùng `dict` (`:5`). Chỉ dùng thư viện chuẩn, không dùng osmnx (ADR-0003 ghi osmnx là kế hoạch ban đầu; code cuối dùng `urllib`).

1. **Hằng số** (`:20-26`): `BBOX`, ba mirror Overpass, bảng tốc độ `SPEED` (km/h): motorway 80, trunk 50, primary 40, secondary 35, tertiary 30, unclassified 25, residential 20, living_street 10.
2. **Gọi Overpass có cache** (`overpass`, `:31-47`): nếu `data/raw/<id>.json` đã có thì đọc file, không gọi mạng. Nếu chưa: POST tới từng mirror, lỗi thì thử mirror khác, hết vòng thì chờ `5 * 2**attempt` giây, tối đa 6 vòng.
3. **Lấy phường** (`:108-109`): `rel["boundary"="administrative"]["admin_level"="6"](bbox)` → 24 phường.
4. **Lấy đường từng phường** (`:110-122`): `area(3600000000 + relation_id)` rồi `way(area.a)["highway"~"^(...)$"]; (._;>;)` để lấy way kèm toàn bộ node. 13 lớp: 8 lớp trong `SPEED` + `_link` của motorway, trunk, primary, secondary, tertiary (`:105`). Không lấy `service`, `track`, `footway`... Node nhận tên phường đầu tiên trả về nó (`setdefault`, `:122`), bỏ tiền tố "Phường ".
5. **Sinh cạnh** (`:124-139`): với mỗi cặp node liên tiếp trong way:
   - `oneway == "-1"` thì đảo thứ tự node (`:128-129`). Trong dữ liệu hiện tại không có way nào như vậy.
   - Một chiều nếu `oneway ∈ {yes, true, 1, -1}`, hoặc `junction=roundabout`, hoặc `highway=motorway` (`:130`). Ngược lại sinh thêm cạnh ngược (`:138-139`).
   - Độ dài = `haversine` (`:50-54`, R = 6.371.000 m). Travel Time = độ dài / (km/h ÷ 3,6).
   - Vận tốc `speed_kmh` (`:57-61`): lấy số đầu tiên của `maxspeed`; không đọc được thì tra `SPEED` theo lớp (bỏ hậu tố `_link`), mặc định 30.
   - Id OSM → id liên tục bằng `index.setdefault(a, len(index))` (`:135`).
6. **SCC** (`largest_scc`, `:64-101`): Kosaraju lặp. Lượt 1 DFS bằng ngăn xếp `(u, i)` (i = chỉ số hàng xóm tiếp theo) để ghi thứ tự kết thúc. Lượt 2 trên đồ thị ngược `radj`, theo thứ tự kết thúc giảm dần, gán nhãn thành phần, nhớ thành phần lớn nhất. O(V+E). Viết lặp vì DFS đệ quy sâu cỡ V sẽ vượt giới hạn đệ quy mặc định (1000) của Python.
7. **Đánh lại id và ghi CSV** (`:141-165`): `keep` theo thứ tự id cũ tăng dần, `new[old] = i`. Chỉ ghi cạnh có hai đầu cùng thuộc SCC. In: `Toàn bộ: 40266 đỉnh, 71689 cạnh. SCC lớn nhất: 38604 đỉnh, 69411 cạnh.`

---

## 5. Demo app (`app/server.py`) tóm tắt

- `State.__init__` (`:33-40`): nạp đồ thị, `Router`, chọn Hub, sinh 400 Parcel (seed 2026), khối lượng 10–800 (1–80 kg), cước 15–300 nghìn đồng. Xe van 4.000 đơn vị = 400 kg (`:23`).
- `_hubs` (`:47-60`): mỗi phường một Hub = Intersection gần tâm (trung bình lat/lon) của phường nhất → 24 Hub.
- `_hotspot_parcels` (`:62-74`): 6 điểm nóng chọn theo farthest-point trong các Hub, Parcel lấy mẫu loại bỏ theo Gauss (σ = 400 m). Lý do (`:63-64`): điểm phân bố đều làm single-linkage bị chaining.
- API: `/api/meta` (số liệu nhỏ, trang gọi khi mở), `/api/nearest?lat=&lon=` (Intersection gần điểm bấm, duyệt O(V) ≈ 20 ms), `/api/network` (hình học mạng đường đã gộp chuỗi đỉnh bậc 2 thành 11.710 polyline, tính và nén gzip **một lần** lúc khởi động: 212 KB thay vì 2 MB; trang chỉ tải khi bật lớp mạng đường), `/api/route`, `/api/incident?kind=jam_on|close_on|jam_off`, `/api/backbone`, `/api/clusters?k=`, `/api/trip?c=`, `/api/districts`, `/api/reset`. Font, Leaflet, CSS có `Cache-Control` nên mở lại trang không phải tải lại. Mở trang mất khoảng 0,1–0,2 s (trước tối ưu 0,7–1,5 s).
- `incident` (`:96-116`): xe coi như đã đi 1/4 tuyến; `jam_on` nhân Travel Time ×10 trên cạnh ở 3/5 tuyến; `close_on` cấm cạnh đó; `jam_off` chọn ngẫu nhiên một cạnh ngoài tuyến.
- `backbone` (`:123-134`): `distance_matrix` giữa 24 Hub → `hub_backbone` (của TV3, gọi **Kruskal** + Union-Find) → nở từng tuyến bằng Dijkstra. Mất khoảng 3 s lần đầu, sau đó cache.
- `trip` (`:145-157`): lấy các Parcel của cụm c, Hub gần tâm cụm nhất, gọi `plan_trip(..., max_stops=12)`.

---

## 6. Bảng độ phức tạp

| Thao tác | Thời gian | Bộ nhớ |
|---|---|---|
| `RoadNetwork(n)` | O(n) | O(n) |
| `add_edge` | O(1) khấu hao | O(1) thêm |
| `out_edges(u)` / duyệt | O(1) / O(deg u) | 0 |
| `find_edge(u, v)` | O(deg u) | O(1) |
| `set_travel_time`, `close`, `reopen` | O(1) | 0 |
| `set_district` | O(D) | O(1) |
| `from_csv` | O(V·D + E) | O(V + E) |
| Toàn bộ đồ thị | — | O(V + E) ≈ 19 MB |
| `largest_scc` (Kosaraju lặp) | O(V + E) | O(V + E) |
| `plan_trip` | O(nW + V + p log p + k(V+E) log V + k²2ᵏ) | O(nW) byte + O(W + V + k2ᵏ) |

So với ma trận kề: bộ nhớ O(V²), duyệt hàng xóm O(V), Dijkstra ≥ O(V²). So với Adjacency Map: cùng O(V+E), tìm cạnh O(1) kỳ vọng nhưng cần dict.

---

## 7. Câu hỏi hội đồng dự kiến

**1. Vì sao không dùng ma trận kề?**
V = 38.604 thì ma trận có ≈ 1,49·10⁹ ô, ít nhất 1,49 GB dù mỗi ô một byte, trong khi mỗi hàng trung bình chỉ có 1,8 cạnh. Duyệt hàng xóm trên ma trận là O(V), nên Dijkstra không thể dưới O(V²) ≈ 1,5·10⁹ bước mỗi truy vấn. Ma trận cũng không lưu được cạnh song song. Adjacency List: O(V+E), khoảng 19 MB.

**2. Vì sao không dùng dict (Adjacency Map như giáo trình Goodrich)?**
Đề cấm dùng dict/set dựng sẵn thay cho CTDL lõi. Hơn nữa khi id là số nguyên liên tục 0..n−1 thì chỉ số mảng chính là hàm băm hoàn hảo: không cần băm, không va chạm, tốn ít bộ nhớ hơn. Việc đổi id OSM sang id liên tục làm một lần ngoài lõi, trong `tools/`. Cái mất: `find_edge(u, v)` là O(deg u) thay vì O(1) kỳ vọng, nhưng bậc ra tối đa chỉ 5 và Dijkstra không cần thao tác này.

**3. Làm sao chứng minh lõi không dùng dict/set?**
`tests/test_core_rules.py:13-28` phân tích AST mọi file trong `core/`, báo lỗi khi gặp `ast.Dict`, `ast.Set`, `DictComp`, `SetComp`, lời gọi `dict()`, `set()`, `frozenset()`, hoặc import ngoài danh sách cho phép (`:10`: `__future__`, `math`, `random`, `typing`, `dataclasses`, `csv`, `pathlib`, `logigraph`). Có test tự kiểm tra bộ bắt lỗi (`:31-54`). Giới hạn cần nói thật: test không bắt được dict ngầm (ví dụ `**kwargs`, `vars()`), và lõi vẫn dùng `list.sort`/`sorted` (Timsort) ở Kruskal và `plan_trip`. Sắp xếp không phải CTDL thay thế cho cấu trúc mà đề yêu cầu tự cài.

**4. Vì sao chỉ giữ thành phần liên thông mạnh lớn nhất?**
Trên đồ thị có hướng, có đường s→t không có nghĩa là có đường t→s. Giữ SCC lớn nhất bảo đảm mọi cặp Intersection có Route hữu hạn (khi chưa có Closure). Nhờ vậy ma trận khoảng cách cho Held-Karp và Backbone luôn hữu hạn, demo chọn hai điểm ngẫu nhiên luôn có tuyến. Mất 1.662 đỉnh (4,1%) và 2.278 cạnh. Liên thông yếu không đủ.

**5. Vì sao Kosaraju, sao viết lặp?**
Kosaraju dễ viết đúng: hai lượt DFS, lượt hai trên đồ thị ngược, O(V+E). Viết lặp vì DFS đệ quy có thể sâu cỡ V (một con đường dài nhiều shape point), vượt giới hạn đệ quy 1000 của Python. Lưu ý: `tarjan1975` trong tài liệu tham khảo là bài về Union-Find, không phải SCC, đừng nhầm.

**6. Vì sao phân vùng theo phường, không theo quận như đề?**
Từ 01/07/2025 Việt Nam bỏ cấp quận/huyện. Trên OSM, `admin_level=6` ở Hà Nội nay là phường mới. Dùng quận cũ là dùng đơn vị đã hết hiệu lực, nên nhóm chủ động phân vùng theo 24 phường giao với vùng bản đồ. Đây là sai khác có lý do và được ghi trong báo cáo. Trong code, trường vẫn tên `district`.

**7. Bảng liên thông theo phường cho thấy nhiều phường có hơn một thành phần (Hồng Hà 22, Giảng Võ và Ngọc Hà 17). Có phải dữ liệu lỗi?**
Không phải lỗi giải thuật. Hai nguyên nhân: (a) nhãn phường là xấp xỉ, node nhận tên phường đầu tiên trả về way chứa nó, nên way cắt qua ranh giới bị gán trọn cho một phường; (b) đồ thị con chỉ gồm cạnh có hai đầu cùng phường, nên con đường đi ra khỏi phường rồi vào lại sẽ tách các mảnh nhỏ ở ven ranh giới. Thành phần lớn nhất của mỗi phường vẫn chứa phần lớn đỉnh (ví dụ Hồng Hà 3.001/3.110). Toàn mạng chỉ có 1 thành phần liên thông yếu.

**8. Đỉnh bậc 2 (shape point) là gì? Sao không simplify?**
Là node OSM nằm giữa một con đường, chỉ để mô tả hình dạng cong, có đúng hai hàng xóm. 78,3% số đỉnh là loại này. Không simplify vì: tuyến vẽ ra bám đúng hình đường; mỗi Road Segment ngắn (trung vị 18,2 m) nên đặt sự cố đúng vị trí; haversine trên đoạn ngắn gần như bằng chiều dài thật. Cái giá: V lớn hơn khoảng 4,6 lần, Dijkstra chậm tương ứng. Simplify (gộp chuỗi bậc 2 thành một cạnh) sẽ cho đồ thị cỡ 8–9 nghìn đỉnh, dưới ngưỡng 10.000 của đề (ước lượng theo số đỉnh không có đúng hai hàng xóm, không phải số đo sau khi simplify thật).

**9. Haversine khác chiều dài đường thật thế nào?**
Haversine là khoảng cách đường tròn lớn giữa hai điểm trên mặt cầu. Vì tính cho từng cặp node liên tiếp và giữ shape point, mỗi đoạn gần như thẳng, nên tổng dọc way xấp xỉ tốt chiều dài đường. Sai số còn lại: đoạn cong giữa hai node, mô hình Trái Đất hình cầu thay cho ellipsoid (sai số cỡ dưới 0,5%), không tính độ cao (cầu vượt). Lưu ý: server cũng dùng haversine giữa các Parcel làm khoảng cách cho phân cụm (`server.py:139`), đó là khoảng cách đường chim bay, khác với khoảng cách đường bộ.

**10. Vì sao trọng số là thời gian, không phải quãng đường?**
Mục tiêu giao hàng là nhanh nhất. Cùng 1 km, đường `primary` (40–60 km/h) và `residential` (20 km/h) khác nhau gấp 2–3 lần. Tắc đường được mô hình tự nhiên bằng tăng Travel Time (demo nhân ×10). Quãng đường `length_m` vẫn được lưu và hiển thị. Hạn chế: `maxspeed` là tốc độ tối đa theo luật, không phải tốc độ thực tế giờ cao điểm, nên Travel Time lạc quan. Một số way có giá trị lạ (5 way `maxspeed=2`) chưa được lọc.

**11. Muốn thêm một đỉnh (một kho mới) thì sao?**
API hiện tại không có `add_vertex`: n cố định lúc tạo vì bản đồ nạp một lần. Cách làm: append vào `lat`, `lon`, `district`, `_out` và tăng `n`, O(1) khấu hao, rồi `add_edge` nối với đường gần nhất. Lưu ý `Router._on_route` có kích thước cố định theo `g.m` lúc tạo (`routing.py:132`, có comment `ponytail:`), nên thêm cạnh thì phải tạo `Router` mới. Trong hệ thống hiện tại, kho được đặt **tại một Intersection có sẵn** (Hub = Intersection gần tâm phường nhất), nên không cần thêm đỉnh.

**12. Cấm đường xử lý thế nào? Sao không xóa cạnh?**
`close(e)` đặt `closed[e] = 1`, O(1). Dijkstra, Bellman-Ford, hàm liên thông bỏ qua cạnh có cờ. Xóa khỏi `_out[u]` tốn O(deg u), làm mất Travel Time gốc khi mở lại và thay đổi danh sách mà module khác đang tham chiếu. Cờ giữ edge_id ổn định, `reopen` O(1). Cái giá: mỗi lần duyệt cạnh đọc thêm một byte.

**13. Vì sao chặn trọng số âm và NaN? Còn vô cùng?**
Âm: Dijkstra giả định đỉnh đã chốt thì khoảng cách không giảm nữa, cạnh âm phá giả định đó. NaN: mọi phép so sánh với NaN đều False, phép nới lỏng không xảy ra, kết quả sai mà không báo lỗi. `math.inf` được chấp nhận (≥ 0) và về mặt tính toán giống cấm đường, nhưng hệ thống dùng `close()` cho Closure để rõ nghĩa và giữ Travel Time gốc. `add_edge` chỉ chặn số âm, chưa chặn NaN (xem mục 2).

**14. Cạnh song song xử lý ra sao?**
Được phép (multigraph). Dijkstra lưu `parent_edge[v]` (edge_id) chứ không lưu đỉnh cha, nên Route là dãy edge_id, không nhập nhằng. `find_edge` trả cạnh có Travel Time nhỏ nhất.

**15. `max_stops` giới hạn gì? Điểm yếu?**
Held-Karp O(n²2ⁿ) bằng Python chỉ chạy được tới khoảng 16 đỉnh, nên `max_stops ≤ 15` (`trip.py`), demo dùng 12. **Thứ tự hiện tại**: chọn tối đa 12 Delivery Point có tổng cước cao nhất → Knapsack trên các Parcel tại đó → Held-Karp. Phiên bản đầu làm ngược lại (Knapsack rồi cắt điểm), nên tải trọng giải phóng bị bỏ trống (chỉ còn 21% tải). Sau khi đổi thứ tự, với xe 400 kg sáu chuyến đạt 359–399 kg (90–100%), 10–12 điểm dừng. Vẫn là hai bước tách rời: tối ưu đồng thời là bài toán orienteering/VRP, ngoài phạm vi đề.

**16. Vì sao ma trận khoảng cách không đối xứng?**
Có 14.441 Road Segment một chiều. Đi A→B và B→A có thể theo hai tuyến khác nhau. Vì vậy TSP là ATSP; Held-Karp không giả định đối xứng nên vẫn đúng. Backbone thì cần đồ thị vô hướng, nên TV3 lấy trung bình hai chiều (d[i][j] + d[j][i]) / 2.

**17. `plan_trip` chạy bao nhiêu lần Dijkstra? Tối ưu được không?**
2(k+1): k+1 lần đầy đủ cho ma trận, k+1 lần dừng sớm để lấy cạnh từng chặng. Có thể bỏ nửa sau bằng cách giữ mảng cha từ lần dựng ma trận, đổi lại tốn O(k·V) bộ nhớ. Không đổi bậc độ phức tạp. Đo thực tế: ma trận 13 đỉnh ≈ 1,6 s, Held-Karp ≈ 0,06 s, nên Dijkstra là phần đắt.

**18. Đường một chiều được nhận diện thế nào?**
`oneway` là `yes`/`true`/`1`, hoặc `-1` (đảo chiều node), hoặc `junction=roundabout`, hoặc `highway=motorway` (`prepare_osm.py:127-130`). Mọi trường hợp khác coi là hai chiều. Trong dữ liệu: 4.045 way `oneway=yes`, không có `-1`, cả 22 way `motorway_link` đều có `oneway=yes`.

**19. Vì sao closed dùng bytearray mà không dùng list bool?**
Một byte mỗi cạnh, liền nhau trong bộ nhớ: 69.411 byte. List Python lưu con trỏ 8 byte mỗi phần tử. Cùng lý do, mặt nạ `_on_route` của Router và `keep` trong Knapsack cũng là bytearray.

**20. Tại sao `out_edges` trả về list nội bộ thay vì copy?**
Copy tốn O(deg) mỗi lần gọi, trong khi Dijkstra gọi cho mọi đỉnh được chốt. Đổi lại người gọi không được sửa list đó; điều này ghi trong docstring (`graph.py:41`).

---

## 8. Kịch bản demo 2 phút

Chuẩn bị trước: `cd` vào repo, chạy `.venv/bin/python -m app.server`. Terminal in `Nạp 38604 Intersection, 69411 Road Segment trong ...s` và `Demo: http://localhost:8000`. Mở trình duyệt. Nếu phòng không có mạng, bỏ chọn "Bản đồ nền (cần mạng)", trang vẫn vẽ toàn bộ Road Segment vì Leaflet nằm sẵn trong `app/vendor/`. Tập dượt chế độ này trước.

| Thời gian | Thao tác | Lời nói |
|---|---|---|
| 0:00–0:15 | Chỉ dòng tiêu đề bên trái: "38.604 Intersection · 69.411 Road Segment · 24 phường (OSM)". | "Đây là mạng đường ô tô nội thành Hà Nội lấy từ OpenStreetMap, đã giữ thành phần liên thông mạnh lớn nhất, nên mọi cặp điểm đều có tuyến. Đồ thị lưu bằng Adjacency List trên id nguyên, không dùng dict." |
| 0:15–0:35 | Bấm hai điểm cách xa nhau trên bản đồ (hoặc "Chọn ngẫu nhiên"). | "Dijkstra với Adaptable Heap tính Route theo Travel Time. Thời gian tính hiện ở đây, khoảng 0,1 giây trên 38 nghìn đỉnh." |
| 0:35–1:00 | Bấm "Tắc ngoài tuyến", sau đó "Tắc trên tuyến ×10", sau đó "Cấm đường trên tuyến". | "Sự cố tăng thời gian ngoài tuyến: hệ thống giữ tuyến cũ, chỉ tốn dưới 1 ms vì kiểm tra cạnh thuộc tuyến là O(1). Sự cố trên tuyến: tính lại từ vị trí xe (chấm cam). Cấm đường chỉ là bật một cờ O(1) trên Road Segment." |
| 1:00–1:20 | Bấm "Vẽ Backbone giữa các Hub". | "24 Hub, mỗi phường một Hub. Ma trận khoảng cách lấy từ 24 lần Dijkstra, rồi tìm cây khung nhỏ nhất. Phần này TV3 giải thích." |
| 1:20–1:45 | k = 6, bấm "Phân cụm (DSU)"; chọn một cụm, bấm "Lập Trip". | "Đây là module tích hợp của em: chọn 12 Delivery Point có tổng cước cao nhất, Knapsack chọn Parcel theo tải trọng xe 400 kg, Dijkstra dựng ma trận khoảng cách, Held-Karp sắp thứ tự, rồi nối các chặng. Giới hạn 12 điểm giao vì Held-Karp là hàm mũ." Chỉ vào số kg: gần đủ 400 kg, tức Knapsack thực sự phải chọn. |
| 1:45–2:00 | Bấm "Kiểm tra (DSU)" ở mục 5, rồi "Khôi phục mạng đường". | "Bảng liên thông theo phường bằng Union-Find; toàn mạng 1 thành phần. Nút khôi phục nạp lại đồ thị gốc, xóa mọi sự cố." |

Lưu ý khi demo:
- Bấm sự cố trước khi có tuyến sẽ báo "Chưa có tuyến". Luôn tìm Route trước.
- Backbone lần đầu mất khoảng 3 s (24 + 23 lần Dijkstra), các lần sau dùng cache. Lập Trip mất khoảng 1,7 s.
- Bấm sự cố nhiều lần liên tiếp vẫn chạy được: mỗi lần xe tiến thêm 1/4 phần tuyến còn lại. Nếu tuyến quá ngắn thì tìm tuyến mới.
- "Khôi phục mạng đường" nạp lại đồ thị từ CSV (bỏ mọi Congestion/Closure), tạo `Router` mới và xóa mọi lớp vẽ trên bản đồ. Kết quả Backbone vẫn được cache phía server nên bấm lại sẽ hiện ngay.

---

## 9. Những điểm nên chủ động nói trước khi bị hỏi

1. `hub_backbone` dùng **Kruskal** + Union-Find đúng như đề (trước đây dùng Prim mảng; đã đổi vì benchmark cho thấy Kruskal nhanh hơn khoảng 2× ngay cả trên đồ thị Hub đầy đủ). Prim mảng giữ làm lời giải đối chiếu trong test. Câu hỏi sâu thuộc TV3.
2. Bước cắt `max_stops` làm xe chở dưới tải (mục 7, câu 15).
3. Nhãn phường xấp xỉ ở giáp ranh (câu 7).
4. `add_edge` chưa chặn NaN (mục 2).
5. Travel Time dựa trên tốc độ tối đa theo luật, lạc quan so với thực tế (câu 10).
