"""Vẽ biểu đồ benchmark cho báo cáo IEEE: .venv/bin/python -m bench.plot → report/figures/*.png

Màu theo thực thể (cố định cho mỗi biến thể), kèm marker + kiểu nét để đọc được khi in đen trắng.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "bench" / "results"
FIG = ROOT / "report" / "figures"
SLOT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"]     # dataviz palette, đã validate
MARK = ["o", "s", "^", "D", "v"]
STYLE = {  # biến thể → (slot, nhãn, nét)
    "adaptable": (0, "Dijkstra + Adaptable Heap", "-"), "lazy": (1, "Dijkstra + Standard Heap (lazy)", "-"),
    "heapq_C": (2, "heapq (C, chỉ tham chiếu)", ":"), "array": (3, "Dijkstra + mảng O(V²)", "-"),
    "bellman_ford": (4, "Bellman-Ford", "-"),
    "both": (0, "Rank + Path compression", "-"), "rank": (1, "Chỉ Union by rank", "-"),
    "compress": (2, "Chỉ Path compression", "-"), "naive": (3, "Không tối ưu", "-"), "quickfind": (4, "Quick-Find (mảng)", "-"),
    "kruskal": (0, "Kruskal + Union-Find", "-"), "prim_array": (1, "Prim mảng O(V²)", "-"),
    "dp": (0, "Quy hoạch động O(nW)", "-"), "bnb": (1, "Nhánh cận", "-"), "greedy": (2, "Tham lam (tỉ lệ)", "-"),
    "brute": (3, "Vét cạn", "-"), "held_karp": (0, "Held-Karp O(n²2ⁿ)", "-"), "nearest": (2, "Nearest neighbour", "-"),
}
plt.rcParams.update({"font.size": 8, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.color": "#e4e4e0", "grid.linewidth": 0.6, "axes.edgecolor": "#8a8a85",
                     "legend.frameon": False, "figure.dpi": 200})


def load(name: str) -> list[dict]:
    with open(RES / f"{name}.csv", encoding="utf-8") as f:
        return list(csv.DictReader(line for line in f if not line.startswith("#")))


def num(x: str):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def series(ax, rows, y: str, x: str = "size", only=None, ylabel="", xlabel="", logx=True, logy=True, transform=None):
    variants = [v for v in dict.fromkeys(r["variant"] for r in rows) if only is None or v in only]
    for v in variants:
        pts = [(num(r[x]), num(r.get(y))) for r in rows if r["variant"] == v]
        pts = [(a, transform(b, r) if transform else b) for (a, b), r in
               zip(pts, [r for r in rows if r["variant"] == v]) if a is not None and b is not None]
        if not pts:
            continue
        slot, label, ls = STYLE[v]
        ax.plot(*zip(*pts), ls, color=SLOT[slot], marker=MARK[slot], markersize=4, linewidth=1.5, label=label)
    ax.set_xscale("log" if logx else "linear")
    ax.set_yscale("log" if logy else "linear")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)


def save(fig, name: str) -> None:
    fig.tight_layout()
    fig.savefig(FIG / f"{name}.png", bbox_inches="tight")
    plt.close(fig)
    print("→", FIG / f"{name}.png")


def main() -> None:
    FIG.mkdir(parents=True, exist_ok=True)
    ms = lambda b, r: b * 1000  # noqa: E731

    rows = load("sssp")
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    series(ax, rows, "time_s", x="n", ylabel="Thời gian SSSP (ms)", xlabel="Số đỉnh V (E ≈ 5V)", transform=ms)
    ax.legend(fontsize=6, loc="upper left")
    save(fig, "sssp_time")

    fig, axes = plt.subplots(1, 2, figsize=(7, 2.6))
    for ax, name, title in ((axes[0], "sssp", "Đồ thị dạng mạng đường (E ≈ 5V)"), (axes[1], "sssp_dense", "Đồ thị dày (E ≈ V²/4)")):
        r = load(name)
        series(ax, r, "heap_peak", x="n", only=("adaptable", "lazy"), ylabel="Kích thước heap lớn nhất", xlabel="Số đỉnh V")
        ax.set_title(title, fontsize=8)
    axes[0].legend(fontsize=6)
    save(fig, "heap_peak")

    fig, axes = plt.subplots(1, 2, figsize=(7, 2.6))
    for ax, name, title in ((axes[0], "sssp", "Mạng đường"), (axes[1], "sssp_dense", "Đồ thị dày")):
        series(ax, load(name), "peak_kb", x="n", only=("adaptable", "lazy"), ylabel="Bộ nhớ cấp thêm (KB)", xlabel="Số đỉnh V")
        ax.set_title(title, fontsize=8)
    axes[0].legend(fontsize=6)
    save(fig, "sssp_memory")

    r = load("sssp_dense")
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    series(ax, r, "time_s", x="n", ylabel="Thời gian SSSP (ms)", xlabel="Số đỉnh V (E ≈ V²/4)", transform=ms)
    ax.legend(fontsize=6, loc="upper left")
    save(fig, "sssp_dense_time")

    r = load("dsu")
    fig, axes = plt.subplots(1, 2, figsize=(7, 2.6))
    series(axes[0], r, "steps", ylabel="Số bước find / thao tác", xlabel="n (n union + n find)",
           transform=lambda b, row: b / float(row["ops"]))
    series(axes[1], r, "time_s", ylabel="Thời gian (ms)", xlabel="n", transform=ms)
    axes[0].legend(fontsize=6)
    save(fig, "dsu")

    fig, axes = plt.subplots(1, 2, figsize=(7, 2.6))
    series(axes[0], load("mst_sparse"), "time_s", x="n", ylabel="Thời gian (ms)", xlabel="V (thưa, E ≈ 5V)", transform=ms)
    series(axes[1], load("mst_dense"), "time_s", x="n", ylabel="Thời gian (ms)", xlabel="Số Hub (đồ thị đầy đủ)", transform=ms)
    axes[0].set_title("Đồ thị thưa (dạng mạng đường)", fontsize=8)
    axes[1].set_title("Đồ thị Hub đầy đủ (E = V(V-1)/2)", fontsize=8)
    axes[1].set_xticks([50, 100, 200, 400], ["50", "100", "200", "400"])
    axes[1].minorticks_off()
    axes[0].legend(fontsize=6)
    save(fig, "mst")

    r = load("knapsack")
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    series(ax, r, "time_s", ylabel="Thời gian (ms)", xlabel="Số Parcel n (W = 15.000)", transform=ms)
    ax.legend(fontsize=6, loc="upper left")
    save(fig, "knapsack")

    r = load("tsp")
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    series(ax, r, "time_s", ylabel="Thời gian (ms)", xlabel="Số điểm n", logx=False, transform=ms)
    ax.legend(fontsize=6, loc="upper left")
    save(fig, "tsp")


if __name__ == "__main__":
    main()
