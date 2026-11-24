"""M2 – Baseline cho benchmark: binary min-heap thuần Python, không có decrease-key.

Dijkstra dùng heap này theo kiểu "lazy": đẩy bản sao mới mỗi lần khoảng cách giảm và bỏ qua
phần tử cũ khi lấy ra, nên heap có thể chứa tới O(E) phần tử (so với O(V) của AdaptableHeapPQ).
Cùng kỹ thuật "dời lỗ" và cách phá hòa như apq.py để phép so sánh công bằng.
Bộ nhớ: O(số phần tử đang có).
"""

from __future__ import annotations

from typing import Any


class LazyBinaryHeap:
    __slots__ = ("_data", "peak")

    def __init__(self) -> None:
        self._data: list[tuple[Any, Any]] = []
        self.peak = 0                     # kích thước lớn nhất từng đạt (dùng cho benchmark)

    def __len__(self) -> int:
        """Số phần tử. O(1)."""
        return len(self._data)

    def push(self, key: Any, value: Any) -> None:
        """Thêm (key, value). Thời gian O(log n), bộ nhớ O(1)."""
        data = self._data
        data.append((key, value))
        if len(data) > self.peak:
            self.peak = len(data)
        # upheap với lỗ ở cuối mảng
        item = data[-1]
        j = len(data) - 1
        while j > 0:
            p = (j - 1) >> 1
            if not key < data[p][0]:
                break
            data[j] = data[p]
            j = p
        data[j] = item

    def pop(self) -> tuple[Any, Any]:
        """Lấy ra (key, value) có khóa nhỏ nhất. O(log n). Heap rỗng → IndexError."""
        data = self._data
        if not data:
            raise IndexError("pop() trên heap rỗng")
        top = data[0]
        last = data.pop()
        n = len(data)
        if n:
            # downheap phần tử cuối từ gốc
            key = last[0]
            j = 0
            while True:
                c = 2 * j + 1
                if c >= n:
                    break
                if c + 1 < n and data[c + 1][0] < data[c][0]:
                    c += 1
                if not data[c][0] < key:
                    break
                data[j] = data[c]
                j = c
            data[j] = last
        return top
