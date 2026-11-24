"""M1 – Lập một Trip: ghép Knapsack (chọn Parcel) → Dijkstra (ma trận khoảng cách) → Held-Karp (thứ tự giao).

Đây là module tích hợp của trưởng nhóm. Nó không chứa giải thuật mới, chỉ nối các module M2 và M4.
"""

from __future__ import annotations

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
    Thời gian: O(n·W) cho Knapsack + O(k·(V+E) log V) cho k ≤ max_stops+1 lần Dijkstra
    + O(k²·2ᵏ) cho Held-Karp. Bộ nhớ: O(n·W + V + k·2ᵏ).
    """
    if not 1 <= max_stops <= 15:
        raise ValueError("max_stops phải trong 1..15 (giới hạn của Held-Karp)")
    if not (len(points) == len(weights) == len(fees)):
        raise ValueError("points, weights, fees phải cùng độ dài")
    _, chosen = knapsack_dp(weights, fees, capacity)

    # Gom Parcel theo Delivery Point bằng mảng đánh dấu (không dùng dict).
    slot = [-1] * g.n
    stops: list[int] = []
    stop_fee: list[float] = []
    for i in chosen:
        p = points[i]
        if slot[p] == -1:
            slot[p] = len(stops)
            stops.append(p)
            stop_fee.append(0.0)
        stop_fee[slot[p]] += fees[i]

    # ponytail: nếu quá max_stops điểm thì giữ các điểm có tổng cước cao nhất; muốn tối ưu đồng thời
    # cần bài toán Orienteering/VRP, nằm ngoài phạm vi đề.
    if len(stops) > max_stops:
        order = sorted(range(len(stops)), key=lambda j: -stop_fee[j])[:max_stops]
        keep = bytearray(len(stops))
        for j in order:
            keep[j] = 1
        chosen = [i for i in chosen if keep[slot[points[i]]]]
        stops = [stops[j] for j in range(len(stops)) if keep[j]]

    if not stops:
        return Trip([], [hub, hub], 0.0, [], 0.0, 0)

    nodes = [hub] + stops
    cost, tour = held_karp(distance_matrix(g, nodes), 0)
    order_nodes = [nodes[i] for i in tour]
    edges: list[int] = []
    for a, b in zip(order_nodes, order_nodes[1:]):
        _, parent = shortest_path(g, a, b)
        edges.extend(path_edges(g, parent, b))
    return Trip(chosen, order_nodes, cost, edges,
                sum(fees[i] for i in chosen), sum(weights[i] for i in chosen))
