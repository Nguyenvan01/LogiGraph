"""M1 – Road Network: đồ thị có hướng, có trọng số, biểu diễn bằng Adjacency List (ADR-0002).

Intersection là số nguyên 0..n-1, Road Segment là số nguyên edge_id 0..m-1.
Dữ liệu cạnh nằm trong các mảng song song nên đổi Travel Time / cấm đường là O(1).
Bộ nhớ: O(V + E).
"""

from __future__ import annotations

import csv
import math
from pathlib import Path


class RoadNetwork:
    __slots__ = ("n", "lat", "lon", "district", "district_names",
                 "tail", "head", "length_m", "travel_s", "closed", "_out")

    def __init__(self, n: int) -> None:
        if n < 0:
            raise ValueError("Số Intersection phải >= 0")
        self.n = n
        self.lat = [0.0] * n
        self.lon = [0.0] * n
        self.district = [-1] * n          # chỉ số vào district_names, -1 = chưa gán
        self.district_names: list[str] = []
        self.tail: list[int] = []
        self.head: list[int] = []
        self.length_m: list[float] = []
        self.travel_s: list[float] = []
        self.closed = bytearray()         # 1 = Closure, không đi được
        self._out: list[list[int]] = [[] for _ in range(n)]

    # ---------- truy vấn ----------
    @property
    def m(self) -> int:
        """Số Road Segment. O(1)."""
        return len(self.head)

    def out_edges(self, u: int) -> list[int]:
        """Danh sách edge_id đi ra từ u. O(1) (trả về chính mảng nội bộ, không được sửa)."""
        self._check_vertex(u)
        return self._out[u]

    def find_edge(self, u: int, v: int) -> int:
        """edge_id của Road Segment u→v có Travel Time nhỏ nhất, -1 nếu không có. O(deg(u))."""
        best, best_w = -1, math.inf
        for e in self.out_edges(u):
            if self.head[e] == v and self.travel_s[e] < best_w:
                best, best_w = e, self.travel_s[e]
        return best

    # ---------- xây dựng ----------
    def add_edge(self, u: int, v: int, length_m: float, travel_s: float) -> int:
        """Thêm Road Segment u→v, trả về edge_id. O(1) khấu hao."""
        self._check_vertex(u)
        self._check_vertex(v)
        if length_m < 0 or travel_s < 0:
            raise ValueError("length_m và travel_s phải >= 0")
        e = len(self.head)
        self.tail.append(u)
        self.head.append(v)
        self.length_m.append(float(length_m))
        self.travel_s.append(float(travel_s))
        self.closed.append(0)
        self._out[u].append(e)
        return e

    def set_district(self, u: int, name: str) -> None:
        """Gán District cho u. O(k), k = số District (nhỏ, vài chục)."""
        self._check_vertex(u)
        for i, existing in enumerate(self.district_names):
            if existing == name:
                self.district[u] = i
                return
        self.district_names.append(name)
        self.district[u] = len(self.district_names) - 1

    # ---------- Traffic Incident ----------
    def set_travel_time(self, edge_id: int, seconds: float) -> None:
        """Congestion: đổi Travel Time của một Road Segment. O(1)."""
        self._check_edge(edge_id)
        if seconds < 0 or math.isnan(seconds):
            raise ValueError("Travel Time phải >= 0 (Dijkstra không đúng với trọng số âm)")
        self.travel_s[edge_id] = float(seconds)

    def close(self, edge_id: int) -> None:
        """Closure: cấm đi Road Segment. O(1)."""
        self._check_edge(edge_id)
        self.closed[edge_id] = 1

    def reopen(self, edge_id: int) -> None:
        self._check_edge(edge_id)
        self.closed[edge_id] = 0

    # ---------- nạp dữ liệu ----------
    @classmethod
    def from_csv(cls, nodes_path: str | Path, edges_path: str | Path) -> "RoadNetwork":
        """nodes.csv: id,lat,lon,district (id = 0..n-1 theo thứ tự). edges.csv: tail,head,length_m,travel_s."""
        with open(nodes_path, newline="", encoding="utf-8") as f:
            rows = list(csv.reader(f))[1:]
        g = cls(len(rows))
        for i, row in enumerate(rows):
            if int(row[0]) != i:
                raise ValueError(f"nodes.csv phải đánh số liên tục, dòng {i + 2} có id {row[0]}")
            g.lat[i], g.lon[i] = float(row[1]), float(row[2])
            if len(row) > 3 and row[3]:
                g.set_district(i, row[3])
        with open(edges_path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                g.add_edge(int(row[0]), int(row[1]), float(row[2]), float(row[3]))
        return g

    # ---------- nội bộ ----------
    def _check_vertex(self, u: int) -> None:
        if not 0 <= u < self.n:
            raise IndexError(f"Intersection {u} ngoài khoảng 0..{self.n - 1}")

    def _check_edge(self, e: int) -> None:
        if not 0 <= e < len(self.head):
            raise IndexError(f"Road Segment {e} ngoài khoảng 0..{len(self.head) - 1}")
