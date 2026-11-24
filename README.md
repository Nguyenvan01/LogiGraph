# LogiGraph — Tối ưu hóa mạng lưới giao hàng và định tuyến vận tải đô thị

Đồ án nhóm (Đề tài 4) học phần *Cấu trúc dữ liệu và Giải thuật nâng cao*. Dữ liệu là bản đồ thật của 24 phường nội thành Hà Nội lấy từ OpenStreetMap: 38.604 Intersection, 69.411 Road Segment.

## Cài đặt và chạy

Yêu cầu Python ≥ 3.12.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt   # pytest, matplotlib (lõi không cần thư viện ngoài)

.venv/bin/pytest -q                  # toàn bộ test, gồm test cấm dict/set trong lõi
.venv/bin/python -m app.server       # web demo → http://localhost:8000
.venv/bin/python -m bench.run        # benchmark → bench/results/*.csv (chạy khá lâu)
.venv/bin/python -m bench.plot       # biểu đồ → report/figures/*.png
.venv/bin/python tools/prepare_osm.py   # (không bắt buộc) tải lại dữ liệu OSM → data/*.csv
```

## Cấu trúc và phân công

| Thành viên | Module | File chính | CTDL & giải thuật |
|---|---|---|---|
| TV1 (trưởng nhóm) | Mô hình hóa bản đồ, dữ liệu, tích hợp, demo | `logigraph/core/graph.py`, `trip.py`, `tools/`, `app/` | Adjacency List trên mảng song song, Kosaraju SCC |
| TV2 | Định tuyến thời gian thực | `logigraph/core/apq.py`, `heaps.py`, `routing.py` | Adaptable Priority Queue + Locator, Dijkstra, Bellman-Ford, Reroute |
| TV3 | Quy hoạch mạng lưới kho | `logigraph/core/dsu.py`, `network.py` | Union-Find (rank + path compression), Kruskal, Prim, phân cụm single-linkage |
| TV4 | Tối ưu xếp hàng lên xe | `logigraph/core/loading.py`, `tsp.py` | 0/1 Knapsack (DP, nhánh cận), TSP Held-Karp |
| TV5 | Thực nghiệm và so sánh | `bench/` | Bộ sinh đồ thị, harness đo thời gian/bộ nhớ, biểu đồ |

- `logigraph/core/`: chỉ dùng mảng. Không dùng `dict`/`set`/`heapq`/`collections`, điều này được `tests/test_core_rules.py` kiểm tra tự động.
- `report/`: báo cáo IEEE (LaTeX, biên dịch bằng pdfLaTeX trên Overleaf).
- `docs/vandap/`: phiếu chuẩn bị vấn đáp của từng thành viên.
- `docs/adr/`: các quyết định thiết kế.

## Demo

1. **Định tuyến**: bấm 2 điểm trên bản đồ. Server chạy Dijkstra + APQ.
2. **Traffic Incident**: gây tắc ×10 hoặc cấm đường trên tuyến thì hệ thống tính lại tuyến từ vị trí xe. Tắc đường ngoài tuyến thì giữ nguyên tuyến (0,4 ms so với khoảng 110 ms khi phải tính lại).
3. **Backbone**: MST giữa 24 Hub (mỗi phường một Hub).
4. **Phân cụm và lập Trip**: Kruskal dừng ở k cụm → Knapsack chọn Parcel → Held-Karp sắp thứ tự giao.
5. **Liên thông theo phường**: Union-Find trên đồ thị con của từng phường.

Khi không có mạng, bỏ chọn "Bản đồ nền" thì demo vẫn vẽ toàn bộ mạng đường (Leaflet có sẵn trong `app/vendor/`).

Dữ liệu bản đồ © OpenStreetMap contributors (ODbL).
