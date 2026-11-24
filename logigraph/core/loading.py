"""M4 – Xếp Parcel lên Truck: bài toán 0/1 Knapsack.

Mỗi Parcel i có khối lượng weights[i] (số nguyên dương, đơn vị 0,1 kg) và cước values[i].
Chọn tập Parcel có tổng khối lượng <= tải trọng capacity sao cho tổng cước lớn nhất.
Bài toán NP-hard; quy hoạch động O(nW) chỉ là pseudo-polynomial (phụ thuộc giá trị W,
không phải độ dài input). Mọi hàm trả về (giá trị tốt nhất, chỉ số Parcel được chọn tăng dần).
"""

from __future__ import annotations

BRUTE_MAX_N = 22


def _check(weights: list[int], values: list[float], capacity: int) -> None:
    """Kiểm tra input ở biên module, sai thì ValueError. O(n)."""
    if len(weights) != len(values):
        raise ValueError("weights và values phải cùng độ dài")
    if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity < 0:
        raise ValueError("capacity phải là số nguyên >= 0")
    for w in weights:
        if not isinstance(w, int) or isinstance(w, bool) or w <= 0:
            raise ValueError(f"Khối lượng Parcel phải là số nguyên dương, nhận {w!r}")
    for v in values:
        if v < 0:
            raise ValueError(f"Cước Parcel phải >= 0, nhận {v!r}")


def _by_ratio(weights: list[int], values: list[float]) -> list[int]:
    """Chỉ số Parcel xếp giảm dần theo cước/khối lượng. O(n log n)."""
    order = list(range(len(weights)))
    order.sort(key=lambda i: values[i] / weights[i], reverse=True)
    return order


def knapsack_dp(weights: list[int], values: list[float], capacity: int) -> tuple[float, list[int]]:
    """Quy hoạch động 1 chiều: best[c] = cước lớn nhất với tải trọng c.

    Duyệt c từ W xuống w để mỗi Parcel chỉ được dùng một lần. Bảng keep (bytearray n*(W+1))
    ghi lại quyết định "lấy Parcel i ở tải trọng c" để truy vết tập được chọn.
    Thời gian O(nW), bộ nhớ O(W) số thực + n(W+1) byte. Pseudo-polynomial: W tính theo
    giá trị (0,1 kg) nên tăng độ chính xác khối lượng 10 lần thì thời gian tăng 10 lần.
    """
    _check(weights, values, capacity)
    n, width = len(weights), capacity + 1
    best = [0] * width
    keep = bytearray(n * width)
    for i in range(n):
        w, v, row = weights[i], values[i], i * width
        for c in range(capacity, w - 1, -1):
            cand = best[c - w] + v
            if cand > best[c]:
                best[c] = cand
                keep[row + c] = 1
    chosen = []
    c = capacity
    for i in range(n - 1, -1, -1):
        if keep[i * width + c]:
            chosen.append(i)
            c -= weights[i]
    chosen.reverse()
    return best[capacity], chosen


def knapsack_bnb(weights: list[int], values: list[float], capacity: int) -> tuple[float, list[int]]:
    """Branch and Bound duyệt sâu bằng stack tường minh (không đệ quy, chịu được n ~ 1000).

    Parcel xếp theo cước/khối lượng giảm dần; cận trên của một nút là nghiệm của bài toán
    nới lỏng phân số (lấy tham lam, Parcel cuối lấy một phần). Nhánh có cận <= nghiệm tốt nhất
    bị cắt. Nhánh "lấy" được đẩy sau nên được duyệt trước, nhanh tìm được nghiệm tốt.
    Thời gian O(n log n) sắp xếp + O(n) mỗi nút, xấu nhất O(n·2^n) (bài toán NP-hard);
    bộ nhớ O(n) (stack có tối đa n+1 nút, mảng take n byte).
    """
    _check(weights, values, capacity)
    n = len(weights)
    order = _by_ratio(weights, values)
    w_sorted = [weights[i] for i in order]
    v_sorted = [values[i] for i in order]

    best_value = 0
    best_take = b""
    take = bytearray(n)                  # take[k] = quyết định với Parcel thứ k trên đường đi hiện tại
    stack = [(0, 0, capacity, 0)]        # (level, value, room, quyết định cho Parcel level-1)
    while stack:
        level, value, room, decision = stack.pop()
        if level > 0:
            take[level - 1] = decision   # các mức < level-1 vẫn đúng vì nút cha được pop trước
        if value > best_value:
            best_value, best_take = value, bytes(take[:level])
        if level == n or _fractional_bound(w_sorted, v_sorted, level, value, room) <= best_value:
            continue
        stack.append((level + 1, value, room, 0))
        if w_sorted[level] <= room:
            stack.append((level + 1, value + v_sorted[level], room - w_sorted[level], 1))
    chosen = [order[k] for k in range(len(best_take)) if best_take[k]]
    chosen.sort()
    return best_value, chosen


def _fractional_bound(w_sorted: list[int], v_sorted: list[float], level: int, value: float, room: int) -> float:
    """Cận trên bằng Knapsack phân số trên các Parcel từ level trở đi. O(n)."""
    bound = value
    for k in range(level, len(w_sorted)):
        if w_sorted[k] <= room:
            room -= w_sorted[k]
            bound += v_sorted[k]
        else:
            return bound + v_sorted[k] * room / w_sorted[k]
    return bound


def knapsack_greedy(weights: list[int], values: list[float], capacity: int) -> tuple[float, list[int]]:
    """Baseline tham lam theo cước/khối lượng: lấy Parcel nào còn vừa. KHÔNG tối ưu.

    Dùng để minh họa khoảng cách với nghiệm tối ưu. Thời gian O(n log n), bộ nhớ O(n).
    """
    _check(weights, values, capacity)
    total, room, chosen = 0, capacity, []
    for i in _by_ratio(weights, values):
        if weights[i] <= room:
            room -= weights[i]
            total += values[i]
            chosen.append(i)
    chosen.sort()
    return total, chosen


def knapsack_brute(weights: list[int], values: list[float], capacity: int) -> tuple[float, list[int]]:
    """Vét cạn 2^n tập con bằng bitmask, làm lời giải chuẩn cho test đối chiếu.

    Thời gian O(n·2^n), bộ nhớ O(n). ValueError nếu n > 22.
    """
    _check(weights, values, capacity)
    n = len(weights)
    if n > BRUTE_MAX_N:
        raise ValueError(f"knapsack_brute chỉ nhận n <= {BRUTE_MAX_N}, nhận {n}")
    best_value, best_mask = 0, 0
    for mask in range(1 << n):
        w_sum, v_sum = 0, 0
        for i in range(n):
            if mask >> i & 1:
                w_sum += weights[i]
                v_sum += values[i]
        if w_sum <= capacity and v_sum > best_value:
            best_value, best_mask = v_sum, mask
    return best_value, [i for i in range(n) if best_mask >> i & 1]
