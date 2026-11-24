"""M2 – Route và Reroute: Dijkstra (3 biến thể hàng đợi), Bellman-Ford, ma trận khoảng cách.

Trọng số là Travel Time `g.travel_s[e]` (luôn >= 0). Road Segment có `g.closed[e] == 1` bị bỏ qua.
Kết quả dạng mảng: `dist[v]` (math.inf nếu không tới được) và `parent_edge[v]`
(edge_id đi vào v trên cây đường đi ngắn nhất, -1 nếu là nguồn hoặc không tới được).
"""

from __future__ import annotations

import math

from .apq import AdaptableHeapPQ, Locator
from .graph import RoadNetwork
from .heaps import LazyBinaryHeap

PQ_KINDS = ("adaptable", "lazy", "array")


def shortest_path(g: RoadNetwork, s: int, t: int | None = None,
                  pq: str = "adaptable") -> tuple[list[float], list[int]]:
    """Dijkstra từ s. Nếu có t thì dừng ngay khi t được chốt.

    pq = "adaptable": AdaptableHeapPQ + decrease-key, O((V+E) log V) thời gian, heap O(V).
    pq = "lazy":      LazyBinaryHeap, đẩy trùng và bỏ phần tử cũ, O(E log E) thời gian, heap O(E).
    pq = "array":     chọn đỉnh nhỏ nhất bằng quét mảng, O(V² + E) thời gian.
    Bộ nhớ kết quả: O(V).
    Khi dừng sớm, chỉ dist[t] (và các đỉnh đã chốt) là chính xác; các đỉnh khác là cận trên.
    """
    g._check_vertex(s)
    if t is not None:
        g._check_vertex(t)
    if pq == "adaptable":
        run = _dijkstra_adaptable
    elif pq == "lazy":
        run = _dijkstra_lazy
    elif pq == "array":
        run = _dijkstra_array
    else:
        raise ValueError(f"pq phải thuộc {PQ_KINDS}, nhận {pq!r}")
    dist = [math.inf] * g.n
    parent = [-1] * g.n
    dist[s] = 0.0
    run(g, s, -1 if t is None else t, dist, parent)
    return dist, parent


def bellman_ford(g: RoadNetwork, s: int) -> tuple[list[float], list[int]]:
    """Bellman-Ford từ s, dừng sớm khi một lượt không nới lỏng được cạnh nào.

    Thời gian O(V·E) xấu nhất, bộ nhớ O(V). Dùng làm lời giải chuẩn để đối chiếu Dijkstra
    (trọng số luôn >= 0 nên không cần kiểm tra chu trình âm).
    """
    g._check_vertex(s)
    dist = [math.inf] * g.n
    parent = [-1] * g.n
    dist[s] = 0.0
    tail, head, travel, closed = g.tail, g.head, g.travel_s, g.closed
    for _ in range(max(g.n - 1, 0)):
        changed = False
        for e in range(g.m):
            if closed[e]:
                continue
            nd = dist[tail[e]] + travel[e]
            if nd < dist[head[e]]:
                dist[head[e]] = nd
                parent[head[e]] = e
                changed = True
        if not changed:
            break
    return dist, parent


def path_edges(g: RoadNetwork, parent_edge: list[int], t: int) -> list[int]:
    """Dãy edge_id từ nguồn tới t theo parent_edge; rỗng nếu t là nguồn hoặc không tới được.

    Thời gian và bộ nhớ O(độ dài đường đi).
    """
    g._check_vertex(t)
    edges: list[int] = []
    e = parent_edge[t]
    while e != -1:
        edges.append(e)
        e = parent_edge[g.tail[e]]
    edges.reverse()
    return edges


def distance_matrix(g: RoadNetwork, points: list[int]) -> list[list[float]]:
    """Ma trận Travel Time ngắn nhất giữa các Intersection trong `points`.

    matrix[i][j] = khoảng cách points[i] → points[j]; không đối xứng khi có đường một chiều.
    Chạy một Dijkstra đầy đủ cho mỗi điểm: thời gian O(k·(V+E) log V), bộ nhớ O(k² + V).
    """
    matrix: list[list[float]] = []
    for p in points:
        dist, _ = shortest_path(g, p)
        matrix.append([dist[q] for q in points])
    return matrix


class Route:
    """Route hiện tại: tổng Travel Time, dãy edge_id và dãy Intersection (nodes[0] là điểm xuất phát)."""

    __slots__ = ("total_s", "edges", "nodes")

    def __init__(self, total_s: float, edges: list[int], nodes: list[int]) -> None:
        self.total_s = total_s
        self.edges = edges
        self.nodes = nodes


class Router:
    """Định tuyến trực tuyến: giữ Route hiện tại và Reroute khi có Traffic Incident.

    Quy tắc bỏ qua (skip): nếu sự cố là Closure hoặc tăng Travel Time trên một Road Segment
    KHÔNG nằm trong phần còn lại của Route, thì Route vẫn tối ưu. Lý do: chi phí của Route
    không đổi, còn chi phí của mọi đường khác chỉ có thể tăng (hoặc giữ nguyên), nên không
    đường nào trở nên rẻ hơn Route. Đoạn con của một đường ngắn nhất cũng là đường ngắn nhất,
    nên cắt bỏ phần đã đi (trước `at`) vẫn giữ tính tối ưu. Các trường hợp còn lại (giảm
    Travel Time, hoặc sự cố trên chính Route) thì chạy lại Dijkstra từ `at`.
    Kiểm tra cạnh có thuộc Route hay không là O(1) nhờ mặt nạ bytearray `_on_route`.
    """

    __slots__ = ("g", "current", "recomputes", "skips", "_target", "_on_route")

    def __init__(self, g: RoadNetwork) -> None:
        self.g = g
        self.current: Route | None = None
        self.recomputes = 0
        self.skips = 0
        self._target = -1
        self._on_route = bytearray(g.m)   # ponytail: cố định theo g.m lúc tạo Router; thêm cạnh sau đó thì tạo Router mới

    def route(self, s: int, t: int) -> Route:
        """Tính Route s → t bằng Dijkstra (dừng sớm tại t). Thời gian O((V+E) log V), bộ nhớ O(V).

        Không tới được: total_s = inf, edges = [], nodes = [s].
        """
        g = self.g
        dist, parent = shortest_path(g, s, t)
        edges = path_edges(g, parent, t)
        nodes = [s]
        for e in edges:
            nodes.append(g.head[e])
        self._set_route(Route(dist[t], edges, nodes))
        self._target = t
        return self.current

    def incident(self, edge_id: int, travel_s: float | None = None, close: bool = False,
                 at: int | None = None) -> tuple[bool, Route]:
        """Áp dụng Traffic Incident lên g rồi Reroute nếu cần. Trả về (đã_reroute, Route).

        `at`: Intersection trên Route hiện tại nơi xe đang đứng (mặc định: điểm xuất phát).
        Trường hợp bỏ qua: O(L) với L = độ dài Route (cắt phần đã đi). Trường hợp Reroute:
        O((V+E) log V). Bộ nhớ O(V).
        """
        g, cur = self.g, self.current
        if cur is None:
            raise ValueError("Chưa có Route: gọi route(s, t) trước")
        if travel_s is None and not close:
            raise ValueError("Traffic Incident cần travel_s hoặc close=True")
        g._check_edge(edge_id)
        pos = 0 if at is None else self._position(at)
        if pos:
            self._set_route(self._suffix(pos))
        increase_only = travel_s is None or travel_s >= g.travel_s[edge_id]
        if travel_s is not None:
            g.set_travel_time(edge_id, travel_s)
        if close:
            g.close(edge_id)
        if increase_only and not self._on_route[edge_id]:
            self.skips += 1
            return False, self.current
        self.recomputes += 1
        return True, self.route(self.current.nodes[0], self._target)

    # ---------- nội bộ ----------
    def _position(self, at: int) -> int:
        nodes = self.current.nodes
        for i in range(len(nodes)):
            if nodes[i] == at:
                return i
        raise ValueError(f"Intersection {at} không nằm trên Route hiện tại")

    def _suffix(self, pos: int) -> Route:
        # Cộng lại theo đúng thứ tự như Dijkstra để tổng khớp tuyệt đối với lần chạy mới.
        cur, travel = self.current, self.g.travel_s
        edges = cur.edges[pos:]
        total = 0.0
        for e in edges:
            total += travel[e]
        return Route(total, edges, cur.nodes[pos:])

    def _set_route(self, new: Route) -> None:
        mask = self._on_route
        if self.current is not None:
            for e in self.current.edges:
                mask[e] = 0
        for e in new.edges:
            mask[e] = 1
        self.current = new


# ---------- ba biến thể Dijkstra (t = -1 nghĩa là không dừng sớm) ----------
def _dijkstra_adaptable(g: RoadNetwork, s: int, t: int, dist: list[float], parent: list[int]) -> None:
    out, head, travel, closed = g._out, g.head, g.travel_s, g.closed
    done = bytearray(g.n)
    locs: list[Locator | None] = [None] * g.n   # một Locator cho mỗi Intersection
    heap = AdaptableHeapPQ()
    locs[s] = heap.add(0.0, s)
    while not heap.is_empty():
        d, u = heap.remove_min()
        done[u] = 1
        if u == t:
            return
        for e in out[u]:
            if closed[e]:
                continue
            v = head[e]
            if done[v]:
                continue
            nd = d + travel[e]
            if nd < dist[v]:
                dist[v] = nd
                parent[v] = e
                if locs[v] is None:
                    locs[v] = heap.add(nd, v)
                else:
                    heap.update(locs[v], nd)


def _dijkstra_lazy(g: RoadNetwork, s: int, t: int, dist: list[float], parent: list[int]) -> None:
    out, head, travel, closed = g._out, g.head, g.travel_s, g.closed
    done = bytearray(g.n)
    heap = LazyBinaryHeap()
    heap.push(0.0, s)
    while len(heap):
        d, u = heap.pop()
        if done[u]:
            continue                      # bản sao cũ
        done[u] = 1
        if u == t:
            return
        for e in out[u]:
            if closed[e]:
                continue
            v = head[e]
            if done[v]:
                continue
            nd = d + travel[e]
            if nd < dist[v]:
                dist[v] = nd
                parent[v] = e
                heap.push(nd, v)


def _dijkstra_array(g: RoadNetwork, s: int, t: int, dist: list[float], parent: list[int]) -> None:
    out, head, travel, closed = g._out, g.head, g.travel_s, g.closed
    n = g.n
    done = bytearray(n)
    while True:
        u, best = -1, math.inf
        for v in range(n):
            if not done[v] and dist[v] < best:
                u, best = v, dist[v]
        if u < 0:
            return
        done[u] = 1
        if u == t:
            return
        for e in out[u]:
            if closed[e]:
                continue
            v = head[e]
            if not done[v] and best + travel[e] < dist[v]:
                dist[v] = best + travel[e]
                parent[v] = e
