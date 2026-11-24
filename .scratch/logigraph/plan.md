# Kế hoạch chuyển dự án sang Đề tài 4: LogiGraph

Status: ready-for-human. D1–D7 đã chốt ngày 2026-11-24, nhóm 5 người, P0 xong. Còn chờ ngày bảo vệ và vùng bản đồ (R1).

Nguồn đề bài: `../De_Tai_Nhom_Thi_Ket_Thuc_HP_CTDL_GT_Nang_Cao.pdf`, Đề tài 4 — *Hệ thống tối ưu hóa mạng lưới giao hàng logistics và định tuyến vận tải đô thị*.

---

## 1. Destination

Một đồ án nhóm bảo vệ được trước hội đồng, gồm 4 sản phẩm bắt buộc của đề:

1. Mã nguồn tự cài đặt Weighted Graph, Adaptable Priority Queue (có Locator), Disjoint Set, Dijkstra, Kruskal, 0/1 Knapsack, TSP (DP) — kèm bản đồ trực quan hóa đường đi ngắn nhất và cây khung nhỏ nhất.
2. Bộ dữ liệu mạng giao thông ≥ 10.000 đỉnh (thực tế) và đồ thị sinh giả lập ≥ 10.000 đỉnh / 50.000 cạnh, kèm báo cáo benchmark.
3. Báo cáo IEEE 12–18 trang (có phân tích hàm Ackermann ngược của Union-Find, Adaptable Heap, Quy hoạch động).
4. Slide 20–25 trang + bảng phân công nhiệm vụ.

Rubric quyết định thứ tự ưu tiên: CTDL tự cài đặt (25%) và vấn đáp cá nhân (25%) nặng nhất → mỗi module phải **nhỏ, sạch, do một người viết và giải thích được từng dòng**. Benchmark + báo cáo (20%) đứng thứ ba.

---

## 2. Đọc đề cho kỹ: những điểm hội đồng sẽ hỏi

Đây là phần "suy nghĩ sâu". Mỗi điểm dưới đây dẫn tới một quyết định thiết kế ở mục 3.

| # | Điểm dễ bị bỏ qua | Hệ quả cho thiết kế |
|---|---|---|
| A | **Cấm dùng `dict`/`set` thay CTDL lõi.** Adjacency Map kiểu sách Goodrich dùng `dict` → có thể bị hỏi vặn. | Đỉnh đánh số liên tục `0..n-1`, mọi cấu trúc lõi chỉ dùng mảng (`list`, `bytearray`). Có test tự động quét AST thư mục `core/` để chặn `dict`/`set`. |
| B | **Đường một chiều** → đồ thị có hướng → ma trận khoảng cách giữa các điểm giao **không đối xứng**. | TSP là **ATSP**. Held-Karp vẫn đúng với ma trận không đối xứng; nearest-neighbour baseline cũng vậy. Ghi rõ trong báo cáo. |
| C | **MST chỉ định nghĩa cho đồ thị vô hướng**, còn bản đồ là có hướng. | Kruskal chạy trên **đồ thị kho trung chuyển** (vô hướng, đầy đủ), trọng số = chi phí xây tuyến = khoảng cách đường bộ trung bình hai chiều (lấy từ Dijkstra). Đây cũng là điểm tích hợp M2 → M3. |
| D | **Union-Find không hỗ trợ xóa cạnh**, nhưng "cấm đường" là xóa cạnh. | Sau mỗi sự cố cấm đường thì dựng lại DSU từ đầu: O(E·α(V)), khoảng 50.000 thao tác, chạy dưới 0,1 giây. Ghi rõ đây là giới hạn của DSU và lý do chấp nhận. |
| E | **Liên thông trên đồ thị có hướng là liên thông mạnh**, DSU chỉ cho liên thông yếu. | Lúc chuẩn bị dữ liệu chỉ giữ thành phần liên thông mạnh lớn nhất để mọi truy vấn đường đi đều có đáp án. DSU dùng cho: (1) kiểm tra liên thông trong từng quận trên đồ thị con vô hướng, (2) mô phỏng cô lập khu vực khi cấm đường, (3) phân cụm. |
| F | **"Phân vùng cụm giao hàng"** dùng lại Kruskal được. | Single-linkage clustering: chạy Kruskal, dừng khi còn k thành phần ⇒ k cụm giao hàng. Cùng DSU, cùng Kruskal, thêm một tính năng mà không thêm CTDL. |
| G | **So sánh Adaptable Heap với Standard Heap rất dễ ra kết quả sai.** `heapq` của Python viết bằng C, nên sẽ nhanh hơn một heap viết bằng Python thuần dù thuật toán kém hơn. | Baseline "Standard Heap" phải là **heap nhị phân Python thuần, lazy deletion**, viết cùng phong cách với APQ. `heapq` chỉ là đường tham chiếu, ghi chú rõ. Đo thêm số thao tác heap và kích thước heap lớn nhất (lazy heap phình lên cỡ O(E), APQ giữ ở O(V)). |
| H | **Kết quả benchmark trung thực:** về lý thuyết hai cách là như nhau, O((V+E) log V) so với O((V+E) log E) và log E ≤ 2 log V. Trên đồ thị đường bộ thưa, lazy heap có thể **nhanh hơn**. | Báo cáo trình bày đúng như vậy: APQ thắng về bộ nhớ và về khả năng cập nhật/xóa phần tử tùy ý (cần cho reroute). Hội đồng đánh giá phân tích đúng cao hơn một biểu đồ "đẹp". |
| I | **Bellman-Ford O(VE)** trên 10k đỉnh / 50k cạnh viết bằng Python có thể chạy rất lâu. | Dừng sớm khi một vòng lặp không relax được cạnh nào, đặt timeout cho mỗi lần chạy, ô nào quá giờ thì ghi "timeout". Thêm baseline Dijkstra dùng mảng chưa sắp xếp O(V²), vì đề yêu cầu so với CTDL cơ bản. |
| J | **"Tính lại lộ trình tức thời"** khi trọng số thay đổi. | Bậc 1: chạy lại Dijkstra từ **vị trí hiện tại của xe**, dừng khi tới đích. Bậc 2: nếu trọng số **tăng** trên một cạnh **không nằm trên tuyến hiện tại** thì bỏ qua, vì tuyến cũ vẫn tối ưu (các đường khác chỉ đắt lên). Kiểm tra bằng mảng `on_route[edge_id]` trong O(1). Incremental SSSP (Ramalingam–Reps) để ngoài phạm vi. |
| K | **Knapsack là pseudo-polynomial O(nW)**, cần trọng lượng là số nguyên. | Quy đổi khối lượng sang đơn vị nguyên (0,1 kg). Bảng truy vết dùng `bytearray` n×W (1 byte mỗi ô). Có thêm nhánh cận (cận trên lấy từ fractional greedy) cho W lớn, đúng như đề nhắc. |
| L | **Held-Karp O(n²·2ⁿ)** viết bằng Python chỉ chạy được tới khoảng n ≈ 15–16. | Giới hạn mỗi chuyến tối đa 12–15 điểm giao, đúng với cụm "TSP quy mô nhỏ" trong đề. So sánh với vét cạn n! (n ≤ 10) và nearest-neighbour (đo % chênh lệch). |
| M | **Trọng số âm** làm Dijkstra sai; đóng đường là một kiểu trọng số đặc biệt. | Chặn ngay tại biên dữ liệu vào: `update_weight` từ chối giá trị âm, còn đóng đường đặt `closed[edge]` hoặc dùng `inf`. Có test cho cả hai. |
| N | Chạy demo với **bản đồ nền online** có thể mất mạng lúc bảo vệ. | Leaflet vẽ polyline bằng canvas, không cần tile. Có chế độ offline vẽ trực tiếp các cạnh của đồ thị. |

---

## 3. Quyết định (đã chốt 2026-11-24)

Đã ghi thành ADR: D1 → ADR-0001, D2 → ADR-0002, D3 + D4 → ADR-0003 (vùng bản đồ chờ R1), D5 → ADR-0004. D6 đã thực hiện xong: commit `a6efe49`, tag `erp-mini-final`.

| ID | Quyết định | Đề xuất | Lý do chính |
|---|---|---|---|
| D1 | Ngôn ngữ | **Python 3.12 + pytest**. Lõi không phụ thuộc thư viện ngoài. | Đề khuyến khích Python/C++/Java/C#, TypeScript không có trong danh sách. Có sẵn `tracemalloc` để đo bộ nhớ, matplotlib/Jupyter để vẽ biểu đồ, code dễ đọc khi vấn đáp. Đổi lại phải giới hạn quy mô TSP và Bellman-Ford (điểm I, L). |
| D2 | Biểu diễn đồ thị | Adjacency List trên **đỉnh nguyên liên tục**. Cạnh có `edge_id` và các mảng song song `head`, `length_m`, `travel_s`, `closed`. | Thỏa điểm A. Cập nhật trọng số O(1) qua `edge_id`. Đúng với gợi ý "Adjacency List" trong đề. |
| D3 | Dữ liệu thực | OpenStreetMap, mạng đường cho ô tô của một nhóm quận nội thành **Hà Nội**, mục tiêu ~20k đỉnh (để số cạnh thực tế tiến gần 50k). | Có phân chia quận/huyện thật để làm tính năng phân vùng. Hưng Yên một mình có thể chưa đủ 10k đỉnh (cần kiểm chứng bằng ticket R1). |
| D4 | Công cụ chuẩn bị dữ liệu | `osmnx` **chỉ dùng trong `tools/`**, chạy một lần rồi commit file CSV. | Thư viện ngoài không chạm tới lõi, nên không vi phạm yêu cầu cài đặt. Thành viên khác không phải cài osmnx. |
| D5 | Trực quan hóa / demo | `app/server.py` dùng `http.server` của stdlib, trả JSON. `app/index.html` là một file Leaflet duy nhất (giống mẫu `dashboard/index.html` cũ). Thêm CLI để demo nhanh. | Không cần framework web. Demo được thao tác trực tiếp: chọn điểm, gây tắc đường, xem tuyến được tính lại. |
| D6 | Xử lý phần ERP cũ | `git init` → commit toàn bộ hiện trạng làm mốc → xóa phần ERP. Lịch sử git giữ lại bản cũ. | Thư mục hiện **chưa phải git repo**, nên xóa thẳng là mất luôn. Cần nhóm đồng ý trước khi xóa. |
| D7 | Thứ tự làm | Làm một **tracer bullet** xuyên suốt trước (đồ thị nhỏ → Dijkstra đơn giản → vẽ tuyến), sau đó mới làm sâu từng module song song. | Phát hiện sớm rủi ro ở dữ liệu, giao diện và tích hợp. Đúng phương pháp `/to-tickets` của khung. |

---

## 4. Kiến trúc (Deep Modules, interface nhỏ)

```
logigraph/
  core/                      # KHÔNG dict/set, KHÔNG thư viện ngoài
    graph.py        (M1)  RoadNetwork: neighbors(u), set_weight(e,w), close(e), from_csv()
    apq.py          (M2)  AdaptableHeapPQ: add→Locator, min, remove_min, update(loc,k), remove(loc)
    heaps.py        (M5)  LazyBinaryHeap, ArrayPQ  — baseline cho benchmark
    routing.py      (M2)  shortest_path(g,s,t), Router.reroute(incident, current_node), bellman_ford
    dsu.py          (M3)  DisjointSet(n, path_compression, union_by_rank)  — cờ để benchmark 4 biến thể
    network.py      (M3)  kruskal_mst, prim_mst (dùng APQ, để đối chiếu), k_clusters, district_components
    loading.py      (M4)  knapsack_dp, knapsack_bnb, knapsack_greedy, knapsack_brute
    tsp.py          (M4)  held_karp(dist), nearest_neighbour, tsp_brute
    trip.py         (M1)  plan_trip(depot, parcels, truck) — ghép Knapsack → Dijkstra → Held-Karp
  tests/            mỗi module một file + test đối chiếu chéo + test cấm dict/set
tools/prepare_osm.py         OSM → data/{nodes,edges,hubs,parcels}.csv
bench/                       generators, harness (mỗi lần đo một subprocess riêng + tracemalloc), plots
app/                         server.py + index.html
report/                      LaTeX IEEEtran
```

**Test đối chiếu chéo** (rẻ, đáng tin, đồng thời là luận điểm khi bảo vệ):
- Dijkstra (APQ) = Dijkstra (lazy) = Bellman-Ford trên đồ thị ngẫu nhiên có seed.
- Kruskal và Prim cho cùng tổng trọng số MST.
- Knapsack DP = vét cạn (n ≤ 15). Held-Karp = vét cạn hoán vị (n ≤ 8).
- Số thành phần DSU = số thành phần tìm bằng BFS.

**Luồng demo tích hợp** (câu chuyện kể khi bảo vệ):
Đơn hàng → phân cụm theo khu vực (Kruskal k-cluster) → chọn kiện lên xe theo tải trọng (Knapsack) → ma trận khoảng cách giữa các điểm giao (Dijkstra) → thứ tự giao (Held-Karp) → vẽ tuyến → gây tắc đường trên tuyến → tính lại tuyến (APQ) → vẽ lại. Song song: mạng xương sống giữa các kho trung chuyển (MST).

---

## 5. Phân công theo quy mô nhóm

| Vai trò | Nhóm 5 (đúng đề) | Nhóm 4 | Nhóm 3 |
|---|---|---|---|
| M1 – Đồ thị, dữ liệu, trực quan hóa, tích hợp `trip.py` (trưởng nhóm) | TV1 | TV1 (+ harness benchmark) | TV1 (+ DSU/Kruskal/phân cụm) |
| M2 – APQ + Locator, Dijkstra, reroute | TV2 | TV2 (+ benchmark Dijkstra) | TV2 (+ harness benchmark) |
| M3 – DSU, Kruskal, Prim, liên thông, phân cụm | TV3 | TV3 (+ benchmark DSU) | — (gộp vào TV1) |
| M4 – Knapsack (DP, B&B), TSP Held-Karp | TV4 | TV4 (+ benchmark DP) | TV3 (+ benchmark DP) |
| M5 – Bộ sinh dữ liệu, harness, baseline heap, Bellman-Ford, biểu đồ | TV5 | chia đều, mỗi người tự benchmark module mình | chia đều |

Mỗi người viết phần báo cáo về module của mình, kèm danh sách câu hỏi vấn đáp tự chuẩn bị (mục 7).

---

## 6. Lộ trình theo khung Golden Flow

Thời lượng tính theo tuần, mặc định 7 tuần. Lịch cụ thể chờ ngày bảo vệ (mục 8).

| Giai đoạn | Skill của khung | Việc làm | Đầu ra |
|---|---|---|---|
| P0 – Chuyển khung (T1) ✅ | — | Mốc git, dọn ERP, viết lại `MISSION.md`, `CONTEXT.md` (Ubiquitous Language cho logistics), `CODING_STANDARDS.md` (Python, quy tắc cấm dict), ADR-0001…0004, dựng khung `pyproject` + pytest + test cấm dict | Xong: repo sạch, `pytest` 3/3 xanh |
| P1 – Khám phá (T1) | `/wayfinder`, `/research`, `/grill-with-docs` | Các research ticket ở mục 7. Grilling chốt D1–D7 | `.scratch/logigraph/map.md` |
| P2 – Đặc tả (T1–T2) | `/to-spec` | User stories cho điều phối viên, người lập kế hoạch mạng, người phân tích; seams; chiến lược test | `.scratch/logigraph/spec.md` |
| P3 – Ticket (T2) | `/to-tickets`, `/triage` | Ticket tracer bullet, đánh dấu `Blocked by` | `.scratch/logigraph/issues/NN-*.md` |
| P4 – Thi công (T2–T4) | `/tdd`, `/implement` | Các module chạy song song theo đồ thị phụ thuộc bên dưới | `core/` + `tests/` |
| P5 – Benchmark (T4–T5) | `/diagnosing-bugs` khi kết quả bất thường | Đo trên các kích thước 1k → 100k, mỗi điểm lấy trung vị nhiều lần chạy, mỗi lần một subprocess, ghi lại cấu hình máy | `bench/results/*.csv`, biểu đồ |
| P6 – Demo (T5) | `/prototype` cho giao diện | Web map + CLI, kịch bản demo 5 phút | `app/` |
| P7 – Báo cáo, slide, vấn đáp (T6–T7) | `/code-review`, `/writing-shape` | IEEE 12–18 trang, slide 20–25, tập dượt vấn đáp, đóng băng code ở cuối T6 | `report/`, slide, bảng phân công |

**Đồ thị phụ thuộc ticket (nháp):**

```
01 Chuyển khung repo sang Python
 ├─ 02 Tracer bullet: đồ thị mẫu nhỏ → Dijkstra đơn giản → vẽ tuyến
 │   └─ 03 RoadNetwork đầy đủ + loader CSV ──┬─ 06 Dijkstra + reroute ──┬─ 08 Kruskal backbone kho + Prim đối chiếu
 │                                           │   (cần 05)               ├─ 12 trip.py tích hợp (cần 10, 11)
 │                                           ├─ 09 Liên thông theo quận + k-cluster (cần 07)
 │                                           └─ 13 Bench harness + bộ sinh đồ thị ── 14 Benchmark từng module
 ├─ 04 Dữ liệu OSM ≥10k đỉnh (sau R1)
 ├─ 05 AdaptableHeapPQ + Locator
 ├─ 07 DisjointSet 4 biến thể
 ├─ 10 Knapsack DP / B&B / baseline
 └─ 11 Held-Karp + baseline
15 Web demo (cần 06, 08, 09, 12)   16 Báo cáo IEEE (cần 14)   17 Slide + kịch bản demo + vấn đáp (cần 15, 16)
```

Ticket 05, 07, 10, 11 chỉ phụ thuộc 01, nên M2, M3, M4 bắt đầu được ngay từ tuần 2 mà không phải chờ dữ liệu bản đồ.

---

## 7. Ticket khám phá (frontier của P1)

- **R1 – Research:** Số đỉnh/cạnh sau khi simplify của mạng đường ô tô OSM cho Hưng Yên và cho từng nhóm quận nội thành Hà Nội; chọn vùng sao cho ≥ 10k đỉnh. Lấy ranh giới quận từ đâu.
- **R2 – Research:** Mô hình thời gian di chuyển: `maxspeed` của OSM hay tốc độ mặc định theo loại đường; vận tốc giờ cao điểm để mô phỏng tắc đường.
- **R3 – Research:** Đối chiếu giáo trình môn học (có vẻ bám Goodrich–Tamassia, *Data Structures and Algorithms in Python*, Ch.3–15) cho APQ/Locator và chứng minh α(n) của Union-Find. Chọn mức chứng minh đưa vào báo cáo (cận O(log* n) dễ trình bày hơn, nêu kết quả Tarjan α(n)).
- **R4 – Research:** Template IEEEtran trên Overleaf và quy ước trích dẫn.
- **G1 – Grilling:** Chốt D1–D7, số thành viên, ngày bảo vệ.

**Câu hỏi vấn đáp dự kiến (mỗi người tự chuẩn bị cho module mình):**
- M2: Tại sao Dijkstra sai khi có trọng số âm? Locator dùng để làm gì, cập nhật khóa tốn bao nhiêu? Lazy heap vẫn đạt O(E log V) như thế nào? Tại sao bỏ qua được sự cố trên cạnh không thuộc tuyến?
- M3: Tính chất lát cắt chứng minh Kruskal đúng ra sao? Vì sao path compression kết hợp union by rank cho α(n)? Tại sao DSU không xóa cạnh được?
- M4: Knapsack có phải thuật toán đa thức không? (Không, nó là pseudo-polynomial và bài toán là NP-hard.) Held-Karp so với n! khác nhau thế nào? Vì sao ma trận khoảng cách không đối xứng?
- M1: Chọn Adjacency List thay vì ma trận kề vì sao (bộ nhớ O(V+E) so với O(V²) khi V = 20k)?

---

## 8. Chưa xác định (Not yet specified)

- Ngày bảo vệ. Tên thành viên trong từng vai TV1–TV5 (nhóm 5 người, phân công theo cột "Nhóm 5" ở mục 5).
- `lessons/`, `learning-records/`, `GLOSSARY.md` (tài liệu tự học, dùng ví dụ ERP) tạm giữ nguyên. Nếu nhóm không cần thì xóa sau, vì bản cũ đã có trong tag `erp-mini-final`.
- Cách sinh kho trung chuyển và đơn hàng (số lượng, phân bố theo quận), chốt sau R1.
- Nhóm có dùng GitHub chung không (cần thiết khi 3–5 người cùng làm). Việc push lên repo do nhóm tự quyết.

## 9. Ngoài phạm vi (Out of scope)

- Incremental/dynamic SSSP (Ramalingam–Reps), Contraction Hierarchies, routing thời gian thực có dữ liệu giao thông live.
- VRP nhiều xe có time window. Chỉ làm TSP quy mô nhỏ cho từng chuyến, đúng như đề.
- Next.js/Supabase của dự án ERP cũ.
- (Phần thưởng nếu còn thời gian) A* với heuristic haversine, Dijkstra hai chiều. Làm thì chỉ để thêm một đường so sánh trong benchmark.
