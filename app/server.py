"""Web demo (ADR-0004). Chạy: .venv/bin/python -m app.server  →  http://localhost:8000

Server một luồng, trạng thái dùng chung cho một người demo. Mọi giải thuật nằm trong logigraph/core.
"""

from __future__ import annotations

import json
import math
import random
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from logigraph.core.graph import RoadNetwork
from logigraph.core.network import connected_components, district_components, hub_backbone, k_clusters
from logigraph.core.routing import Router, distance_matrix, path_edges, shortest_path
from logigraph.core.trip import plan_trip

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
N_PARCELS, TRUCK_CAPACITY = 400, 4_000           # 400 Parcel, xe van 400 kg (đơn vị 0,1 kg)


def haversine(g: RoadNetwork, a: int, b: int) -> float:
    p1, p2 = math.radians(g.lat[a]), math.radians(g.lat[b])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(g.lon[b] - g.lon[a]) / 2) ** 2
    return 12_742_000 * math.asin(math.sqrt(h))


class State:
    def __init__(self) -> None:
        self.reset()
        rnd = random.Random(2026)
        self.hubs = self._hubs()
        self.parcels = self._hotspot_parcels(rnd)
        self.weights = [rnd.randint(10, 800) for _ in range(N_PARCELS)]   # 1–80 kg
        self.fees = [rnd.randint(15, 300) for _ in range(N_PARCELS)]      # nghìn đồng
        self._backbone = None

    def reset(self) -> None:
        self.g = RoadNetwork.from_csv(ROOT / "data" / "nodes.csv", ROOT / "data" / "edges.csv")
        self.router = Router(self.g)
        self.dest = None

    def _hubs(self) -> list[int]:
        """Mỗi phường một Hub: Intersection gần tâm phường nhất."""
        g, k = self.g, len(self.g.district_names)
        sx, sy, cnt = [0.0] * k, [0.0] * k, [0] * k
        for u in range(g.n):
            d = g.district[u]
            sx[d] += g.lat[u]; sy[d] += g.lon[u]; cnt[d] += 1
        best, best_d = [-1] * k, [math.inf] * k
        for u in range(g.n):
            d = g.district[u]
            dd = (g.lat[u] - sx[d] / cnt[d]) ** 2 + (g.lon[u] - sy[d] / cnt[d]) ** 2
            if dd < best_d[d]:
                best[d], best_d[d] = u, dd
        return best

    def _hotspot_parcels(self, rnd: random.Random, spots: int = 6, sigma_m: float = 400) -> list[int]:
        """Đơn hàng tập trung quanh vài điểm nóng (chợ, khu dân cư) — lấy mẫu loại bỏ theo phân phối Gauss.
        Điểm phân bố đều sẽ làm single-linkage bị chaining (một cụm khổng lồ)."""
        centers = [rnd.choice(self.hubs)]
        while len(centers) < spots:   # farthest-point: các điểm nóng cách xa nhau
            centers.append(max(self.hubs, key=lambda h: min(haversine(self.g, h, c) for c in centers)))
        out = []
        while len(out) < N_PARCELS:
            u = rnd.randrange(self.g.n)
            d = min(haversine(self.g, u, c) for c in centers)
            if d < 2 * sigma_m and rnd.random() < math.exp(-(d / sigma_m) ** 2):
                out.append(u)
        return out

    def path(self, nodes: list[int]) -> list[list[float]]:
        return [[round(self.g.lat[u], 6), round(self.g.lon[u], 6)] for u in nodes]

    def edges_path(self, edges: list[int], start: int) -> list[list[float]]:
        return self.path([start] + [self.g.head[e] for e in edges])

    # ---------- API ----------
    def network(self, _q) -> dict:
        """Chỉ phục vụ vẽ: gộp các chuỗi đỉnh bậc 2 thành polyline dài để trình duyệt vẽ ít đối tượng hơn."""
        g = self.g
        nb = [[] for _ in range(g.n)]                       # láng giềng vô hướng, không trùng
        for e in range(g.m):
            u, v = g.tail[e], g.head[e]
            if v not in nb[u]:
                nb[u].append(v)
                nb[v].append(u)
        seen = set()                                        # app/ nằm ngoài lõi nên được dùng set
        lines = []

        def walk(a: int, b: int) -> None:
            line = [a]
            while True:
                seen.add((min(a, b), max(a, b)))
                line.append(b)
                if len(nb[b]) != 2:
                    break
                c = nb[b][0] if nb[b][1] == a else nb[b][1]
                if (min(b, c), max(b, c)) in seen:
                    break
                a, b = b, c
            lines.append([[round(g.lat[u], 5), round(g.lon[u], 5)] for u in line])

        for start in [u for u in range(g.n) if len(nb[u]) != 2] + list(range(g.n)):   # sau cùng: các vòng kín
            for b in nb[start]:
                if (min(start, b), max(start, b)) not in seen:
                    walk(start, b)
        return {"lat": [round(x, 5) for x in g.lat], "lon": [round(x, 5) for x in g.lon], "lines": lines,
                "n": g.n, "m": g.m, "districts": len(g.district_names)}

    def route(self, q) -> dict:
        s, t = int(q["s"]), int(q["t"])
        t0 = time.perf_counter()
        r = self.router.route(s, t)
        self.dest = t
        return self._route_json(r, t0, rerouted=None)

    def incident(self, q) -> dict:
        r = self.router.current
        if r is None or not r.edges:
            raise ValueError("Chưa có tuyến")
        kind = q.get("kind", "jam_on")
        at = r.nodes[len(r.nodes) // 4]                       # xe đã đi được 1/4 tuyến
        if kind == "jam_off":                                  # tắc trên một đoạn không thuộc tuyến
            on = bytearray(self.g.m)
            for e in r.edges:
                on[e] = 1
            e = random.Random(len(r.edges)).choice([x for x in range(self.g.m) if not on[x]])
        else:
            e = r.edges[(len(r.edges) * 3) // 5]               # một đoạn phía trước xe
        t0 = time.perf_counter()
        if kind == "close_on":
            rerouted, new = self.router.incident(e, close=True, at=at)
        else:
            rerouted, new = self.router.incident(e, travel_s=self.g.travel_s[e] * 10, at=at)
        out = self._route_json(new, t0, rerouted)
        out["incident"] = {"kind": kind, "edge": e, "segment": self.path([self.g.tail[e], self.g.head[e]])}
        return out

    def _route_json(self, r, t0: float, rerouted) -> dict:
        return {"path": self.path(r.nodes), "total_s": r.total_s if math.isfinite(r.total_s) else None,
                "length_m": sum(self.g.length_m[e] for e in r.edges), "ms": (time.perf_counter() - t0) * 1000,
                "rerouted": rerouted, "recomputes": self.router.recomputes, "skips": self.router.skips}

    def backbone(self, _q) -> dict:
        if self._backbone is None:
            t0 = time.perf_counter()
            total, links = hub_backbone(distance_matrix(self.g, self.hubs))
            lines = []
            for i, j, w in links:
                a, b = self.hubs[i], self.hubs[j]
                _, parent = shortest_path(self.g, a, b)
                lines.append({"path": self.edges_path(path_edges(self.g, parent, b), a), "w": w})
            self._backbone = {"hubs": self.path(self.hubs), "names": self.g.district_names, "links": lines,
                              "total_s": total, "ms": (time.perf_counter() - t0) * 1000}
        return self._backbone

    def clusters(self, q) -> dict:
        k = int(q.get("k", 6))
        p = self.parcels
        edges = [(haversine(self.g, p[i], p[j]), i, j) for i in range(len(p)) for j in range(i + 1, len(p))]
        t0 = time.perf_counter()
        labels = k_clusters(len(p), edges, k)
        self.labels = labels
        return {"points": self.path(p), "labels": labels, "k": k, "ms": (time.perf_counter() - t0) * 1000}

    def trip(self, q) -> dict:
        c = int(q.get("c", 0))
        labels = getattr(self, "labels", None) or self.clusters({"k": "6"})["labels"]
        idx = [i for i in range(N_PARCELS) if labels[i] == c]
        cx = sum(self.g.lat[self.parcels[i]] for i in idx) / len(idx)
        cy = sum(self.g.lon[self.parcels[i]] for i in idx) / len(idx)
        hub = min(self.hubs, key=lambda h: (self.g.lat[h] - cx) ** 2 + (self.g.lon[h] - cy) ** 2)
        t0 = time.perf_counter()
        trip = plan_trip(self.g, hub, [self.parcels[i] for i in idx], [self.weights[i] for i in idx],
                         [self.fees[i] for i in idx], TRUCK_CAPACITY, max_stops=12)
        return {"path": self.edges_path(trip.edges, hub), "stops": self.path(trip.stops), "total_s": trip.total_s,
                "fee": trip.fee, "weight_kg": trip.weight / 10, "parcels": len(trip.parcels),
                "candidates": len(idx), "ms": (time.perf_counter() - t0) * 1000}

    def districts(self, _q) -> dict:
        count, _ = connected_components(self.g)
        rows = [{"name": n, "nodes": v, "components": c, "largest": big} for n, v, c, big in district_components(self.g)]
        return {"weak_components": count, "rows": rows}

    def reset_api(self, _q) -> dict:
        self.reset()
        return {"ok": True}


STATE: State | None = None
ROUTES = {"/api/network": "network", "/api/route": "route", "/api/incident": "incident", "/api/backbone": "backbone",
          "/api/clusters": "clusters", "/api/trip": "trip", "/api/districts": "districts", "/api/reset": "reset_api"}
STATIC = {"/": ("index.html", "text/html"), "/vendor/leaflet.js": ("vendor/leaflet.js", "text/javascript"),
          "/vendor/leaflet.css": ("vendor/leaflet.css", "text/css")}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        url = urlparse(self.path)
        if url.path in STATIC:
            name, ctype = STATIC[url.path]
            return self._send(200, (APP / name).read_bytes(), ctype)
        if url.path not in ROUTES:
            return self._send(404, b"not found", "text/plain")
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            body, code = getattr(STATE, ROUTES[url.path])(q), 200
        except (ValueError, IndexError, KeyError) as exc:   # lỗi dữ liệu vào: trả 400, server không dừng
            body, code = {"error": str(exc)}, 400
        self._send(code, json.dumps(body).encode(), "application/json")

    def _send(self, code: int, data: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    t0 = time.perf_counter()
    STATE = State()
    print(f"Nạp {STATE.g.n} Intersection, {STATE.g.m} Road Segment trong {time.perf_counter() - t0:.1f}s")
    print("Demo: http://localhost:8000")
    HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
