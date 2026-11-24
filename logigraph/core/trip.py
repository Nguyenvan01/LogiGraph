"""M1 – Lập một Trip: ghép Knapsack (chọn Parcel) → Dijkstra (ma trận khoảng cách) → Held-Karp (thứ tự giao).

Đây là module tích hợp của trưởng nhóm. Nó không chứa giải thuật mới, chỉ nối các module M2 và M4.
"""

from __future__ import annotations

import math

from .graph import RoadNetwork
from .loading import knapsack_dp
from .routing import distance_matrix, path_edges, shortest_path
from .tsp import held_karp


class Trip:
    __slots__ = ("parcels", "stops", "total_s", "edges", "fee", "weight")

    def __init__(self, parcels: list[int], stops: list[int], total_s: float,
                 edges: list[int], fee: float, weight: int) -> None:
        self.parcels = parcels    # chỉ số Parcel được chọn
        self.stops = stops        # thứ tự Intersection: Hub, các Delivery Point, Hub
        self.total_s = total_s    # tổng Travel Time của cả vòng
        self.edges = edges        # các Road Segment nối liền cả vòng (để vẽ)
        self.fee = fee
        self.weight = weight


def plan_trip(g: RoadNetwork, hub: int, points: list[int], weights: list[int],
              fees: list[float], capacity: int, max_stops: int = 12) -> Trip:
    """Lập Trip cho một Truck xuất phát và quay về `hub`.

    points[i], weights[i], fees[i] là Delivery Point, khối lượng (0,1 kg) và cước của Parcel i.
    Thứ tự: chọn ≤ max_stops Delivery Point có tổng cước cao nhất → Knapsack trên các Parcel tại đó
    → Held-Karp. Thời gian: O(n log n) chọn điểm + O(n·W) cho Knapsack + O(k·(V+E) log V) cho k ≤ max_stops+1 lần Dijkstra đầy đủ
    (ma trận) và k lần Dijkstra dừng sớm (nối các chặng) + O(k²·2ᵏ) cho Held-Karp.
    Bộ nhớ: O(n·W + V + k·2ᵏ). ValueError nếu có Delivery Point không tới được.
    """
    if not 1 <= max_stops <= 15:
        raise ValueError("max_stops phải trong 1..15 (giới hạn của Held-Karp)")
    if not (len(points) == len(weights) == len(fees)):
        raise ValueError("points, weights, fees phải cùng độ dài")
    # Bước 1: gom Parcel theo Delivery Point bằng mảng đánh dấu (không dùng dict), cộng cước mỗi điểm.
    slot = [-1] * g.n
    cand_points: list[int] = []
    point_fee: list[float] = []
    for i, p in enumerate(points):
        if slot[p] == -1:
            slot[p] = len(cand_points)
            cand_points.append(p)
            point_fee.append(0.0)
        point_fee[slot[p]] += fees[i]

    # Bước 2: giữ tối đa max_stops điểm có tổng cước cao nhất (giới hạn của Held-Karp).
    # ponytail: chọn điểm và chọn kiện tách rời; tối ưu đồng thời là bài toán Orienteering/VRP, ngoài phạm vi đề.
    keep = bytearray(len(cand_points))
    for j in sorted(range(len(cand_points)), key=lambda j: -point_fee[j])[:max_stops]:
        keep[j] = 1
    cand = [i for i in range(len(points)) if keep[slot[points[i]]]]

    # Bước 3: Knapsack chọn Parcel trong giới hạn tải trọng; kết quả được dùng trọn, không cắt sau.
    _, picked = knapsack_dp([weights[i] for i in cand], [fees[i] for i in cand], capacity)
    chosen = [cand[j] for j in picked]
    used = bytearray(g.n)
    stops: list[int] = []
    for i in chosen:
        if not used[points[i]]:
            used[points[i]] = 1
            stops.append(points[i])

    if not stops:
        return Trip([], [hub, hub], 0.0, [], 0.0, 0)

    nodes = [hub] + stops
    cost, tour = held_karp(distance_matrix(g, nodes), 0)
    if not math.isfinite(cost):
        raise ValueError("Không có vòng đi qua mọi Delivery Point (có điểm không tới được, ví dụ do Closure)")
    order_nodes = [nodes[i] for i in tour]
    edges: list[int] = []
    for a, b in zip(order_nodes, order_nodes[1:]):
        _, parent = shortest_path(g, a, b)
        edges.extend(path_edges(g, parent, b))
    return Trip(chosen, order_nodes, cost, edges,
                sum(fees[i] for i in chosen), sum(weights[i] for i in chosen))
