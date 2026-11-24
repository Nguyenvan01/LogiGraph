"""M5 – Benchmark. Mỗi phép đo chạy trong một subprocess riêng (CODING_STANDARDS §6).

    .venv/bin/python -m bench.run            # chạy tất cả, ghi bench/results/*.csv
    .venv/bin/python -m bench.run sssp dsu   # chỉ chạy một số thí nghiệm

Thời gian: trung vị của REPEAT lần (time.perf_counter). Bộ nhớ: tracemalloc peak trong một lần chạy riêng,
chỉ tính phần giải thuật cấp phát thêm (đồ thị dựng xong mới bắt đầu đo).
"""

from __future__ import annotations

import csv
import heapq
import json
import math
import platform
import random
import statistics
import subprocess
import sys
import time
import tracemalloc
from pathlib import Path

from logigraph.core import dsu, loading, network, routing, tsp
from logigraph.core.graph import RoadNetwork

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "bench" / "results"
REPEAT = 5
TIMEOUT_S = 120


# ---------------- bộ sinh dữ liệu ----------------
def road_like(n: int, seed: int = 42, out_degree: int = 5) -> RoadNetwork:
    """Đồ thị giống mạng đường: lưới k×k lệch ngẫu nhiên, cạnh 2 chiều với 4 hàng xóm,
    thêm cạnh 1 chiều tới đỉnh gần để đạt ~out_degree cạnh ra mỗi đỉnh (10k đỉnh ≈ 50k cạnh)."""
    rnd = random.Random(seed)
    k = math.isqrt(n)
    n = k * k
    g = RoadNetwork(n)
    for u in range(n):
        g.lat[u] = u // k + rnd.uniform(-0.3, 0.3)
        g.lon[u] = u % k + rnd.uniform(-0.3, 0.3)

    def add(u: int, v: int) -> None:
        d = math.hypot(g.lat[u] - g.lat[v], g.lon[u] - g.lon[v]) * 100
        g.add_edge(u, v, d, d / rnd.uniform(5, 14))

    for u in range(n):
        r, c = divmod(u, k)
        if c + 1 < k:
            add(u, u + 1); add(u + 1, u)
        if r + 1 < k:
            add(u, u + k); add(u + k, u)
    for u in range(n):
        r, c = divmod(u, k)
        while len(g.out_edges(u)) < out_degree:
            rr, cc = r + rnd.randint(-2, 2), c + rnd.randint(-2, 2)
            if 0 <= rr < k and 0 <= cc < k and (rr, cc) != (r, c):
                add(u, rr * k + cc)
    return g


def dense(n: int, seed: int = 42) -> RoadNetwork:
    """Đồ thị dày (mỗi đỉnh n/4 cạnh ra, trọng số ngẫu nhiên): decrease-key xảy ra thường xuyên,
    là trường hợp lazy heap phình to và APQ / mảng O(V²) có lợi."""
    rnd = random.Random(seed)
    g = RoadNetwork(n)
    for u in range(n):
        for v in rnd.sample(range(n), n // 4):
            if v != u:
                g.add_edge(u, v, 1, rnd.uniform(1, 100))
    return g


def osm() -> RoadNetwork:
    return RoadNetwork.from_csv(ROOT / "data" / "nodes.csv", ROOT / "data" / "edges.csv")


def dijkstra_heapq(g: RoadNetwork, s: int) -> list[float]:
    """Đường tham chiếu: heapq viết bằng C (KHÔNG so sánh công bằng với heap Python thuần)."""
    dist = [math.inf] * g.n
    dist[s] = 0.0
    pq = [(0.0, s)]
    head, w, closed, out = g.head, g.travel_s, g.closed, g._out
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for e in out[u]:
            if closed[e]:
                continue
            v, nd = head[e], d + w[e]
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist


# ---------------- một phép đo (chạy trong subprocess) ----------------
def prepare(spec: dict):
    """Trả về (hàm cần đo, hàm lấy số liệu phụ). Phần dựng dữ liệu không tính giờ."""
    exp, var, size = spec["exp"], spec["variant"], spec["size"]
    rnd = random.Random(7)

    if exp in ("sssp", "sssp_osm", "sssp_dense"):
        g = osm() if exp == "sssp_osm" else dense(size) if exp == "sssp_dense" else road_like(size)
        sources = [rnd.randrange(g.n) for _ in range(REPEAT)]
        it = iter(sources * 3)
        if var == "bellman_ford":
            return lambda: routing.bellman_ford(g, next(it)), lambda: {"n": g.n, "m": g.m}
        if var == "heapq_C":
            return lambda: dijkstra_heapq(g, next(it)), lambda: {"n": g.n, "m": g.m}
        peak = {}

        def run():
            routing.shortest_path(g, next(it), pq=var)
        return run, lambda: {"n": g.n, "m": g.m, **heap_peak(g, sources[0], var, peak)}

    if exp == "dsu":
        pairs = [(rnd.randrange(size), rnd.randrange(size)) for _ in range(size)]
        made = []

        def run():
            d = dsu.QuickFind(size) if var == "quickfind" else dsu.DisjointSet(
                size, path_compression=var in ("compress", "both"), union_by_rank=var in ("rank", "both"))
            for a, b in pairs:
                d.union(a, b)
                d.find(a)
            made.append(d)
        return run, lambda: {"steps": made[-1].steps, "ops": 2 * size}

    if exp in ("mst_sparse", "mst_dense"):
        if exp == "mst_sparse":
            g = road_like(size)
            edges = [(g.length_m[e], g.tail[e], g.head[e]) for e in range(g.m)]
            n = g.n
        else:
            pts = [(rnd.random(), rnd.random()) for _ in range(size)]
            edges = [(math.dist(pts[i], pts[j]), i, j) for i in range(size) for j in range(i + 1, size)]
            n = size
        fn = network.kruskal_mst if var == "kruskal" else network.prim_mst_array
        out = []
        return lambda: out.append(fn(n, edges)[0]), lambda: {"n": n, "m": len(edges), "total": round(out[-1], 3)}

    if exp == "knapsack":
        weights = [rnd.randint(10, 1000) for _ in range(size)]      # 1–100 kg, đơn vị 0,1 kg
        fees = [rnd.randint(10, 500) for _ in range(size)]          # nghìn đồng
        cap = min(15000, sum(weights) // 2)                        # xe 1,5 tấn
        fn = getattr(loading, "knapsack_" + var)
        out = []
        return lambda: out.append(fn(weights, fees, cap)[0]), lambda: {"capacity": cap, "value": out[-1]}

    if exp == "tsp":
        pts = [(rnd.random(), rnd.random()) for _ in range(size)]
        # bất đối xứng như đường một chiều: mỗi chiều nhân hệ số ngẫu nhiên riêng
        dist = [[0 if i == j else math.dist(pts[i], pts[j]) * rnd.uniform(1, 1.6) for j in range(size)]
                for i in range(size)]
        fn = {"held_karp": tsp.held_karp, "brute": tsp.tsp_brute, "nearest": tsp.nearest_neighbour}[var]
        out = []
        return lambda: out.append(fn(dist)[0]), lambda: {"cost": round(out[-1], 4)}

    raise ValueError(spec)


def heap_peak(g: RoadNetwork, s: int, var: str, _cache: dict) -> dict:
    """Kích thước heap lớn nhất trong một lần chạy (chứng minh lazy heap phình tới O(E))."""
    from logigraph.core.apq import AdaptableHeapPQ
    from logigraph.core.heaps import LazyBinaryHeap
    if var not in ("adaptable", "lazy"):
        return {}
    dist = [math.inf] * g.n
    dist[s] = 0.0
    if var == "lazy":
        pq = LazyBinaryHeap()
        pq.push(0.0, s)
        while len(pq):
            d, u = pq.pop()
            if d > dist[u]:
                continue
            for e in g._out[u]:
                v, nd = g.head[e], d + g.travel_s[e]
                if not g.closed[e] and nd < dist[v]:
                    dist[v] = nd
                    pq.push(nd, v)
        return {"heap_peak": pq.peak}
    pq, loc, done = AdaptableHeapPQ(), [None] * g.n, bytearray(g.n)
    loc[s] = pq.add(0.0, s)
    while len(pq):
        d, u = pq.remove_min()
        done[u] = 1
        for e in g._out[u]:
            v, nd = g.head[e], d + g.travel_s[e]
            if g.closed[e] or done[v] or nd >= dist[v]:
                continue
            dist[v] = nd
            if loc[v] is None:
                loc[v] = pq.add(nd, v)
            else:
                pq.update(loc[v], nd)
    return {"heap_peak": pq.peak}


def measure(spec: dict) -> dict:
    run, extra = prepare(spec)
    times = []
    for _ in range(spec.get("repeat", REPEAT)):
        t0 = time.perf_counter()
        run()
        times.append(time.perf_counter() - t0)
    tracemalloc.start()
    run()
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    return {"time_s": statistics.median(times), "peak_kb": peak / 1024, **extra()}


# ---------------- điều phối ----------------
EXPERIMENTS = {
    "sssp": [(v, n) for n in (1_000, 2_500, 5_000, 10_000, 20_000, 50_000)
             for v in ("adaptable", "lazy", "heapq_C", "array", "bellman_ford")
             if not (v == "array" and n > 10_000) and not (v == "bellman_ford" and n > 20_000)],
    "sssp_osm": [(v, 0) for v in ("adaptable", "lazy", "heapq_C", "array", "bellman_ford")],
    "sssp_dense": [(v, n) for n in (250, 500, 1_000, 2_000) for v in ("adaptable", "lazy", "heapq_C", "array")],
    "dsu": [(v, n) for n in (1_000, 10_000, 100_000, 1_000_000)
            for v in ("naive", "rank", "compress", "both", "quickfind")
            if not (v == "quickfind" and n > 10_000) and not (v == "naive" and n > 100_000)],
    "mst_sparse": [(v, n) for n in (1_000, 10_000, 50_000) for v in ("kruskal", "prim_array") if not (v == "prim_array" and n > 10_000)],
    "mst_dense": [(v, n) for n in (50, 100, 200, 400) for v in ("kruskal", "prim_array")],
    "knapsack": [(v, n) for n in (10, 15, 20, 100, 1_000, 5_000) for v in ("dp", "bnb", "greedy", "brute")
                 if not (v == "brute" and n > 20)],
    "tsp": [(v, n) for n in range(4, 16) for v in ("held_karp", "brute", "nearest") if not (v == "brute" and n > 10)],
}


def machine() -> str:
    return f"{platform.processor() or platform.machine()} | {platform.platform()} | Python {platform.python_version()}"


def run_experiment(exp: str) -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    rows = []
    for variant, size in EXPERIMENTS[exp]:
        spec = {"exp": exp, "variant": variant, "size": size}
        if exp == "sssp_osm" and variant == "array":
            spec["repeat"] = 1
        try:
            proc = subprocess.run([sys.executable, "-m", "bench.run", "--one", json.dumps(spec)],
                                  cwd=ROOT, capture_output=True, text=True, timeout=TIMEOUT_S)
            res = json.loads(proc.stdout.strip().splitlines()[-1]) if proc.returncode == 0 else {"error": proc.stderr[-300:]}
        except subprocess.TimeoutExpired:
            res = {"time_s": "timeout"}
        rows.append({"variant": variant, "size": size, **res})
        print(exp, variant, size, res, flush=True)
    keys = []
    for r in rows:
        keys += [k for k in r if k not in keys]
    with open(RESULTS / f"{exp}.csv", "w", newline="", encoding="utf-8") as f:
        f.write(f"# {machine()} | repeat={REPEAT} | timeout={TIMEOUT_S}s\n")
        wr = csv.DictWriter(f, fieldnames=keys)
        wr.writeheader()
        wr.writerows(rows)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--one"]:
        print(json.dumps(measure(json.loads(sys.argv[2]))))
    else:
        for name in sys.argv[1:] or list(EXPERIMENTS):
            run_experiment(name)
