"""M4 – Thứ tự đi qua các Delivery Point trong một Trip (xuất phát và quay về Hub).

Ma trận dist[u][v] là Travel Time ngắn nhất từ u tới v. Do có đường một chiều nên
dist[u][v] != dist[v][u]: đây là Asymmetric TSP (ATSP), NP-hard. math.inf = không tới được.
Mọi hàm trả về (tổng chi phí, tour) với tour bắt đầu và kết thúc tại start, ví dụ [0, 2, 1, 0];
nếu không có chu trình Hamilton thì trả về (math.inf, []).
"""

from __future__ import annotations

import math

HELD_KARP_MAX_N = 16
BRUTE_MAX_N = 10


def _check(dist: list[list[float]], start: int) -> int:
    """Kiểm tra ma trận vuông, khác rỗng và start hợp lệ; trả về n. O(n)."""
    n = len(dist)
    if n == 0:
        raise ValueError("Ma trận khoảng cách rỗng")
    for row in dist:
        if len(row) != n:
            raise ValueError("Ma trận khoảng cách phải vuông")
    if not 0 <= start < n:
        raise IndexError(f"start {start} ngoài khoảng 0..{n - 1}")
    return n


def held_karp(dist: list[list[float]], start: int = 0) -> tuple[float, list[int]]:
    """Quy hoạch động bitmask Held-Karp cho ATSP.

    Gọi others là các đỉnh khác start (m = n-1). cost[mask*m + j] = chi phí nhỏ nhất đi từ start,
    thăm đúng tập mask (trên others), kết thúc ở others[j]; parent lưu đỉnh liền trước để truy vết.
    Hai bảng là list phẳng kích thước m·2^m. Thời gian O(n²·2ⁿ), bộ nhớ O(n·2ⁿ).
    ValueError nếu n > 16.
    """
    n = _check(dist, start)
    if n > HELD_KARP_MAX_N:
        raise ValueError(f"held_karp chỉ nhận n <= {HELD_KARP_MAX_N}, nhận {n}")
    if n == 1:
        return 0, [start, start]
    others = [v for v in range(n) if v != start]
    m = n - 1
    full = (1 << m) - 1
    cost = [math.inf] * ((full + 1) * m)
    parent = [-1] * ((full + 1) * m)
    for j in range(m):
        cost[(1 << j) * m + j] = dist[start][others[j]]

    for mask in range(1, full + 1):     # mask tăng dần nên mọi tập con đã xong trước tập cha
        for j in range(m):
            here = cost[mask * m + j]
            if not mask >> j & 1 or here == math.inf:
                continue
            row = dist[others[j]]
            for k in range(m):
                if mask >> k & 1:
                    continue
                cell = (mask | 1 << k) * m + k
                cand = here + row[others[k]]
                if cand < cost[cell]:
                    cost[cell] = cand
                    parent[cell] = j

    best, last = math.inf, -1
    for j in range(m):
        cand = cost[full * m + j] + dist[others[j]][start]
        if cand < best:
            best, last = cand, j
    if last == -1:
        return math.inf, []
    tour = [start]
    mask, j = full, last
    while j != -1:
        tour.append(others[j])
        prev = parent[mask * m + j]
        mask ^= 1 << j
        j = prev
    tour.append(start)
    tour.reverse()
    return best, tour


def nearest_neighbour(dist: list[list[float]], start: int = 0) -> tuple[float, list[int]]:
    """Baseline tham lam: luôn đi tới Delivery Point chưa thăm gần nhất. KHÔNG tối ưu.

    Có thể bị kẹt (mọi đỉnh còn lại đều inf) dù vẫn tồn tại tour, khi đó trả về (inf, []).
    Thời gian O(n²), bộ nhớ O(n).
    """
    n = _check(dist, start)
    visited = bytearray(n)
    visited[start] = 1
    tour, total, here = [start], 0, start
    for _ in range(n - 1):
        nxt, step = -1, math.inf
        for v in range(n):
            if not visited[v] and dist[here][v] < step:
                nxt, step = v, dist[here][v]
        if nxt == -1:
            return math.inf, []
        visited[nxt] = 1
        tour.append(nxt)
        total += step
        here = nxt
    if n > 1:
        total += dist[here][start]
    if total == math.inf:
        return math.inf, []
    tour.append(start)
    return total, tour


def tsp_brute(dist: list[list[float]], start: int = 0) -> tuple[float, list[int]]:
    """Vét cạn mọi hoán vị của các đỉnh khác start bằng thuật toán Heap dạng lặp.

    Lời giải chuẩn cho test đối chiếu. Thời gian O(n·n!), bộ nhớ O(n). ValueError nếu n > 10.
    """
    n = _check(dist, start)
    if n > BRUTE_MAX_N:
        raise ValueError(f"tsp_brute chỉ nhận n <= {BRUTE_MAX_N}, nhận {n}")
    if n == 1:
        return 0, [start, start]
    perm = [v for v in range(n) if v != start]
    m = len(perm)
    best, best_perm = _tour_cost(dist, start, perm), perm[:]
    counter = [0] * m
    i = 1
    while i < m:
        if counter[i] < i:
            if i % 2 == 0:
                perm[0], perm[i] = perm[i], perm[0]
            else:
                perm[counter[i]], perm[i] = perm[i], perm[counter[i]]
            cand = _tour_cost(dist, start, perm)
            if cand < best:
                best, best_perm = cand, perm[:]
            counter[i] += 1
            i = 1
        else:
            counter[i] = 0
            i += 1
    if best == math.inf:
        return math.inf, []
    return best, [start] + best_perm + [start]


def _tour_cost(dist: list[list[float]], start: int, perm: list[int]) -> float:
    """Tổng chi phí start -> perm[0] -> ... -> perm[-1] -> start. O(n)."""
    total, here = 0, start
    for v in perm:
        total += dist[here][v]
        here = v
    return total + dist[here][start]
