"""Vẽ mạng đường từ data/*.csv thành hai ảnh PNG cho deck (nền sáng và nền tối).

Chạy: .venv/bin/python slides/make_map.py  → slides/assets/map_light.png, map_dark.png
"""
import csv
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "assets"
OUT.mkdir(exist_ok=True)

with open(ROOT / "data/nodes.csv", encoding="utf-8") as f:
    nodes = [(float(r["lon"]), float(r["lat"])) for r in csv.DictReader(f)]
slow, fast = [], []
with open(ROOT / "data/edges.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        a, b = nodes[int(r["tail"])], nodes[int(r["head"])]
        kmh = float(r["length_m"]) / max(float(r["travel_s"]), 1e-9) * 3.6
        (fast if kmh >= 39 else slow).append((a, b))  # ≥ primary (40 km/h): trục chính

lat0 = sum(p[1] for p in nodes) / len(nodes)
aspect = 1 / math.cos(math.radians(lat0))


def draw(name, bg, slow_c, fast_c, slow_w, fast_w):
    fig, ax = plt.subplots(figsize=(6, 6 * 1.05), dpi=220)
    fig.patch.set_alpha(0 if bg is None else 1)
    if bg:
        fig.patch.set_facecolor(bg)
    ax.add_collection(LineCollection(slow, colors=slow_c, linewidths=slow_w))
    ax.add_collection(LineCollection(fast, colors=fast_c, linewidths=fast_w))
    ax.autoscale(); ax.margins(0.01)
    ax.set_aspect(aspect)
    ax.axis("off")
    fig.subplots_adjust(0, 0, 1, 1)
    fig.savefig(OUT / name, transparent=bg is None)
    plt.close(fig)


draw("map_light.png", "#FFFFFF", "#8A9AAE", "#E09A2B", 0.25, 0.8)
draw("map_dark.png", None, "#5E86A8", "#F0B04A", 0.25, 0.8)
print(len(slow), "segments thường,", len(fast), "segments trục chính")
