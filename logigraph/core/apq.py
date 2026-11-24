"""M2 – Adaptable Priority Queue: binary min-heap trên mảng, có Locator (Goodrich–Tamassia).

Mỗi phần tử trong heap là một Locator; Locator nhớ vị trí `index` của chính nó trong mảng,
nên update/remove một phần tử bất kỳ chỉ tốn O(log n) mà không cần tìm kiếm.
Phá hòa (tie) tất định: so sánh khóa bằng `<` nghiêm ngặt, khi bằng nhau ưu tiên con trái,
nên cùng một dãy thao tác luôn cho cùng một kết quả.
Bộ nhớ: O(n).
"""

from __future__ import annotations

from typing import Any


class Locator:
    """Tay cầm của một phần tử trong heap. `index = -1` nghĩa là phần tử đã rời heap."""

    __slots__ = ("key", "value", "index")

    def __init__(self, key: Any, value: Any, index: int) -> None:
        self.key = key
        self.value = value
        self.index = index


class AdaptableHeapPQ:
    __slots__ = ("_data", "peak")

    def __init__(self) -> None:
        self._data: list[Locator] = []
        self.peak = 0                     # kích thước lớn nhất từng đạt (dùng cho benchmark)

    def __len__(self) -> int:
        """Số phần tử. O(1)."""
        return len(self._data)

    def is_empty(self) -> bool:
        """O(1)."""
        return not self._data

    def add(self, key: Any, value: Any) -> Locator:
        """Thêm (key, value), trả về Locator. Thời gian O(log n), bộ nhớ O(1)."""
        data = self._data
        loc = Locator(key, value, len(data))
        data.append(loc)
        if len(data) > self.peak:
            self.peak = len(data)
        self._upheap(loc.index)
        return loc

    def min(self) -> tuple[Any, Any]:
        """(key, value) có khóa nhỏ nhất, không lấy ra. O(1). Heap rỗng → IndexError."""
        if not self._data:
            raise IndexError("min() trên heap rỗng")
        loc = self._data[0]
        return (loc.key, loc.value)

    def remove_min(self) -> tuple[Any, Any]:
        """Lấy ra (key, value) có khóa nhỏ nhất. O(log n). Heap rỗng → IndexError."""
        if not self._data:
            raise IndexError("remove_min() trên heap rỗng")
        return self._remove_at(0)

    def update(self, loc: Locator, newkey: Any, newvalue: Any = None) -> None:
        """Đổi khóa (tăng hoặc giảm) và tùy chọn đổi value của phần tử `loc`. O(log n).

        Locator không còn trong heap → ValueError.
        """
        self._validate(loc)
        loc.key = newkey
        if newvalue is not None:
            loc.value = newvalue
        self._bubble(loc.index)

    def remove(self, loc: Locator) -> tuple[Any, Any]:
        """Xóa phần tử `loc`, trả về (key, value). O(log n). Locator không hợp lệ → ValueError."""
        self._validate(loc)
        return self._remove_at(loc.index)

    # ---------- nội bộ ----------
    def _validate(self, loc: Locator) -> None:
        j = loc.index
        if not (0 <= j < len(self._data) and self._data[j] is loc):
            raise ValueError("Locator không còn thuộc heap này")

    def _remove_at(self, j: int) -> tuple[Any, Any]:
        data = self._data
        loc = data[j]
        last = data.pop()
        if j < len(data):                 # phần tử bị xóa không phải phần tử cuối: đưa `last` vào lỗ
            data[j] = last
            last.index = j
            self._bubble(j)
        loc.index = -1
        return (loc.key, loc.value)

    def _bubble(self, j: int) -> None:
        if j > 0 and self._data[j].key < self._data[(j - 1) >> 1].key:
            self._upheap(j)
        else:
            self._downheap(j)

    def _upheap(self, j: int) -> None:
        # Kỹ thuật "dời lỗ": chỉ ghi phần tử đang xét một lần ở vị trí cuối cùng.
        data = self._data
        loc = data[j]
        key = loc.key
        while j > 0:
            p = (j - 1) >> 1
            parent = data[p]
            if not key < parent.key:
                break
            data[j] = parent
            parent.index = j
            j = p
        data[j] = loc
        loc.index = j

    def _downheap(self, j: int) -> None:
        data = self._data
        n = len(data)
        loc = data[j]
        key = loc.key
        while True:
            c = 2 * j + 1
            if c >= n:
                break
            if c + 1 < n and data[c + 1].key < data[c].key:
                c += 1
            child = data[c]
            if not child.key < key:
                break
            data[j] = child
            child.index = j
            j = c
        data[j] = loc
        loc.index = j
