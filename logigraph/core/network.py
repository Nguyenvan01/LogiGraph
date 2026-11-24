"""M3 – Quy hoạch mạng lưới: Backbone Network (MST), Delivery Cluster, tính liên thông.

Đồ thị vô hướng được cho dưới dạng danh sách cạnh `edges[i] = (w, u, v)` với u, v trong 0..n-1.
Kết quả MST là (tổng trọng số, danh sách chỉ số cạnh được chọn trong `edges`).
Nếu đồ thị không liên thông, kết quả là rừng khung nhỏ nhất (n - số thành phần cạnh).
"""

from __future__ import annotations

import math

from .dsu import DisjointSet
from .graph import RoadNetwork

Edge = tuple[float, int, int]


def kruskal_mst(n: int, edges: list[Edge]) -> tuple[float, list[int]]:
    """Kruskal: duyệt cạnh theo trọng số tăng dần, nhận cạnh nếu nối hai tập DSU khác nhau.

    Thời gian O(E log E) cho bước sắp xếp (list.sort, Timsort) cộng O(E·α(V)) cho DSU.
    Bộ nhớ O(V + E).
    """
    order = list(range(len(edges)))
    order.sort(key=lambda i: edges[i][0])
    dsu = DisjointSet(n)
    total, chosen = 0.0, []
    for i in order:
        w, u, v = edges[i]
        if dsu.union(u, v):
            total += w
            chosen.append(i)
            if dsu.count == 1:
                break
    return total, chosen


def prim_mst_array(n: int, edges: list[Edge]) -> tuple[float, list[int]]:
    """Prim dùng mảng (không heap): mỗi bước quét O(V) tìm đỉnh có khóa nhỏ nhất.

    Thời gian O(V² + E), bộ nhớ O(V²) cho ma trận cạnh tốt nhất giữa từng cặp đỉnh.
    Trên đồ thị đầy đủ (đồ thị Hub, E = V(V-1)/2) thì O(V²) là tối ưu vì phải đọc mọi cạnh;
    bản dùng heap tốn O(E log V) = O(V² log V). Đồ thị không liên thông: khi không còn đỉnh
    nào có khóa hữu hạn thì bắt đầu cây mới, kết quả là rừng khung nhỏ nhất.
    Dùng làm lời giải đối chiếu cho Kruskal trong test.
    """
    best = [[-1] * n for _ in range(n)]   # best[u][v] = chỉ số cạnh u–v nhẹ nhất
    for i, (w, u, v) in enumerate(edges):
        if not (0 <= u < n and 0 <= v < n):
            raise IndexError(f"Cạnh {i} có đầu mút ngoài khoảng 0..{n - 1}")
        if u != v and (best[u][v] == -1 or w < edges[best[u][v]][0]):
            best[u][v] = best[v][u] = i
    in_tree = bytearray(n)
    key = [math.inf] * n
    via = [-1] * n
    total, chosen = 0.0, []
    for _ in range(n):
        u = -1
        for v in range(n):
            if not in_tree[v] and (u == -1 or key[v] < key[u]):
                u = v
        in_tree[u] = 1
        if via[u] != -1:
            total += edges[via[u]][0]
            chosen.append(via[u])
        row = best[u]
        for v in range(n):
            e = row[v]
            if e != -1 and not in_tree[v] and edges[e][0] < key[v]:
                key[v], via[v] = edges[e][0], e
    return total, chosen


def k_clusters(n: int, edges: list[Edge], k: int) -> list[int]:
    """Single-linkage clustering: chạy Kruskal và dừng khi còn đúng k tập (Delivery Cluster).

    Trả về nhãn cụm của từng đỉnh, chuẩn hóa thành 0..k-1 theo thứ tự xuất hiện.
    Nếu đồ thị có hơn k thành phần liên thông thì không thể gộp tiếp, kết quả có đúng
    số thành phần đó. Thời gian O(E log E + V), bộ nhớ O(V + E).
    """
    if not 1 <= k <= n:
        raise ValueError(f"k phải nằm trong 1..{n}")
    order = list(range(len(edges)))
    order.sort(key=lambda i: edges[i][0])
    dsu = DisjointSet(n)
    for i in order:
        if dsu.count == k:
            break
        dsu.union(edges[i][1], edges[i][2])
    return _labels(dsu, n)


def hub_backbone(dist: list[list[float]]) -> tuple[float, list[tuple[int, int, float]]]:
    """Backbone Network giữa các Hub từ ma trận khoảng cách đường bộ (có thể bất đối xứng).

    Đồ thị Hub vô hướng đầy đủ có trọng số (d[i][j] + d[j][i]) / 2; cặp nào có một chiều
    không đi được (inf) thì bỏ qua. Trả về (tổng, các tuyến (i, j, w)).
    Đồ thị dày nên dùng Prim mảng: thời gian O(H²), bộ nhớ O(H²) với H = số Hub.
    """
    h = len(dist)
    for row in dist:
        if len(row) != h:
            raise ValueError("Ma trận khoảng cách phải vuông")
    edges = []
    for i in range(h):
        for j in range(i + 1, h):
            if dist[i][j] != math.inf and dist[j][i] != math.inf:
                edges.append(((dist[i][j] + dist[j][i]) / 2, i, j))
    total, chosen = prim_mst_array(h, edges)
    return total, [(edges[c][1], edges[c][2], edges[c][0]) for c in chosen]


def connected_components(g: RoadNetwork) -> tuple[int, list[int]]:
    """Thành phần liên thông yếu của Road Network (coi Road Segment là vô hướng).

    Bỏ qua Road Segment đang Closure (g.closed[e] == 1). DSU không xóa cạnh được, nên để
    mô phỏng ảnh hưởng của Closure tới khả năng đi tới, ta dựng lại DSU từ đầu sau mỗi lần
    đổi trạng thái. Trả về (số thành phần, nhãn 0..count-1 của từng Intersection).
    Thời gian O(V + E·α(V)), bộ nhớ O(V).
    """
    dsu = DisjointSet(g.n)
    for e in range(g.m):
        if not g.closed[e]:
            dsu.union(g.tail[e], g.head[e])
    return dsu.count, _labels(dsu, g.n)


def district_components(g: RoadNetwork) -> list[tuple[str, int, int, int]]:
    """Mức liên thông nội bộ của từng District.

    Với mỗi District trả về (tên, số Intersection, số thành phần liên thông chỉ dùng Road
    Segment không Closure có hai đầu cùng District, kích thước thành phần lớn nhất).
    Một DSU chung là đủ vì chỉ hợp các cạnh nội District, nên mỗi tập nằm gọn trong một District.
    Thời gian O(V + E·α(V) + D), bộ nhớ O(V + D) với D = số District.
    """
    district = g.district
    dsu = DisjointSet(g.n)
    for e in range(g.m):
        u, v = g.tail[e], g.head[e]
        if not g.closed[e] and district[u] != -1 and district[u] == district[v]:
            dsu.union(u, v)
    size = [0] * g.n
    for v in range(g.n):
        size[dsu.find(v)] += 1
    d = len(g.district_names)
    members, comps, largest = [0] * d, [0] * d, [0] * d
    for v in range(g.n):
        k = district[v]
        if k == -1:
            continue
        members[k] += 1
        if dsu.find(v) == v:
            comps[k] += 1
            largest[k] = max(largest[k], size[v])
    return [(g.district_names[k], members[k], comps[k], largest[k]) for k in range(d)]


def _labels(dsu: DisjointSet, n: int) -> list[int]:
    """Đổi gốc DSU thành nhãn liên tục 0..count-1 theo thứ tự xuất hiện. O(n·α(n))."""
    root_label = [-1] * n
    label = [0] * n
    nxt = 0
    for v in range(n):
        r = dsu.find(v)
        if root_label[r] == -1:
            root_label[r] = nxt
            nxt += 1
        label[v] = root_label[r]
    return label
