"""Chuẩn bị dữ liệu bản đồ thật từ OpenStreetMap (ADR-0003). Chạy một lần, commit CSV.

    .venv/bin/python tools/prepare_osm.py

Ngoài lõi nên được dùng dict/set. Kết quả: data/nodes.csv, data/edges.csv
(Intersection đánh số 0..n-1, chỉ giữ thành phần liên thông mạnh lớn nhất).
"""

import csv
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Từ 01/07/2025 Việt Nam bỏ cấp quận/huyện; OSM admin_level=6 là phường/xã mới.
# Vùng = mọi phường giao với khung nội thành Hà Nội (south, west, north, east).
BBOX = (20.990, 105.800, 21.045, 105.865)
MIRRORS = ["https://overpass.openstreetmap.fr/api/interpreter",
           "https://overpass-api.de/api/interpreter",
           "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
# Tốc độ mặc định trong đô thị (km/h) khi đường không có thẻ maxspeed.
SPEED = {"motorway": 80, "trunk": 50, "primary": 40, "secondary": 35, "tertiary": 30,
         "unclassified": 25, "residential": 20, "living_street": 10}
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"


def overpass(query: str, cache: Path) -> dict:
    if cache.exists():
        return json.loads(cache.read_text())
    body = urllib.parse.urlencode({"data": query}).encode()
    for attempt in range(6):
        for url in MIRRORS:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": "logigraph-course-project/0.1"})
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    data = json.loads(resp.read())
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_text(json.dumps(data))
                return data
            except Exception as exc:  # mirror bận/timeout: thử mirror khác rồi backoff
                print(f"  {url.split('/')[2]}: {exc}", file=sys.stderr)
        time.sleep(5 * 2 ** attempt)
    raise RuntimeError("Không tải được dữ liệu Overpass")


def haversine(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def speed_kmh(tags: dict) -> float:
    try:
        v = float(tags.get("maxspeed", "").split()[0])
        if v >= 5:   # vài tuyến OSM ghi maxspeed=2 (lỗi nhập liệu) → dùng mặc định
            return v
    except (ValueError, IndexError):
        pass
    return SPEED.get(tags["highway"].removesuffix("_link"), 30)


def largest_scc(n: int, adj: list[list[int]]) -> list[int]:
    """Kosaraju lặp (không đệ quy)."""
    order, seen = [], [False] * n
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)
    radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)
    comp, best, best_size, c = [-1] * n, -1, 0, 0
    for s in reversed(order):
        if comp[s] != -1:
            continue
        comp[s], stack, size = c, [s], 0
        while stack:
            u = stack.pop()
            size += 1
            for v in radj[u]:
                if comp[v] == -1:
                    comp[v] = c
                    stack.append(v)
        if size > best_size:
            best, best_size = c, size
        c += 1
    return [u for u in range(n) if comp[u] == best]


def main() -> None:
    hw = "|".join(list(SPEED) + [k + "_link" for k in ("motorway", "trunk", "primary", "secondary", "tertiary")])
    coords, district_of, ways = {}, {}, {}
    bbox = ",".join(map(str, BBOX))
    wards = overpass(f'[out:json][timeout:120];rel["boundary"="administrative"]["admin_level"="6"]({bbox});out tags;',
                     RAW / "wards.json")["elements"]
    for ward in wards:
        name = ward["tags"].get("name", str(ward["id"]))
        print(f"Tải {name} ...")
        q = (f'[out:json][timeout:170];area({3600000000 + ward["id"]})->.a;'
             f'way(area.a)["highway"~"^({hw})$"];(._;>;);out body qt;')
        data = overpass(q, RAW / f"{ward['id']}.json")
        for el in data["elements"]:
            if el["type"] == "node":
                coords[el["id"]] = (el["lat"], el["lon"])
            elif el["type"] == "way":
                ways[el["id"]] = el
                for nid in el["nodes"]:
                    district_of.setdefault(nid, name.removeprefix("Phường "))

    index, edges = {}, []
    for w in ways.values():
        tags, nodes = w["tags"], w["nodes"]
        oneway = tags.get("oneway", "no")
        if oneway == "-1":
            nodes = nodes[::-1]
        one = oneway in ("yes", "true", "1", "-1") or tags.get("junction") == "roundabout" or tags["highway"] == "motorway"
        mps = speed_kmh(tags) / 3.6
        for a, b in zip(nodes, nodes[1:]):
            if a not in coords or b not in coords:
                continue
            ia, ib = index.setdefault(a, len(index)), index.setdefault(b, len(index))
            length = haversine(*coords[a], *coords[b])
            edges.append((ia, ib, length, length / mps))
            if not one:
                edges.append((ib, ia, length, length / mps))

    osm_ids = [0] * len(index)
    for oid, i in index.items():
        osm_ids[i] = oid
    adj = [[] for _ in osm_ids]
    for u, v, _, _ in edges:
        adj[u].append(v)
    keep = largest_scc(len(osm_ids), adj)
    new = {old: i for i, old in enumerate(keep)}

    out = ROOT / "data"
    with open(out / "nodes.csv", "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["id", "lat", "lon", "district"])
        for old in keep:
            lat, lon = coords[osm_ids[old]]
            wr.writerow([new[old], f"{lat:.7f}", f"{lon:.7f}", district_of[osm_ids[old]]])
    m = 0
    with open(out / "edges.csv", "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["tail", "head", "length_m", "travel_s"])
        for u, v, length, t in edges:
            if u in new and v in new:
                wr.writerow([new[u], new[v], f"{length:.2f}", f"{t:.3f}"])
                m += 1
    print(f"Toàn bộ: {len(osm_ids)} đỉnh, {len(edges)} cạnh. SCC lớn nhất: {len(keep)} đỉnh, {m} cạnh.")


if __name__ == "__main__":
    main()
