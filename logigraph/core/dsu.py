"""M3 – Disjoint Set Union (Union-Find) cài bằng mảng.

`DisjointSet` có hai cờ tối ưu để benchmark so sánh 4 biến thể:
- path_compression: sau khi tìm được gốc, cho mọi phần tử trên đường đi trỏ thẳng về gốc.
- union_by_rank: luôn gắn cây thấp hơn (rank nhỏ hơn) dưới gốc của cây cao hơn.

Độ phức tạp của find/union (n phần tử, m thao tác):
- không tối ưu: O(n) mỗi thao tác trong trường hợp xấu (cây suy biến thành chuỗi).
- chỉ union_by_rank: O(log n), vì cây rank r có ít nhất 2^r phần tử nên chiều cao <= log2 n.
- chỉ path_compression: O(log n) khấu hao.
- cả hai: O(α(n)) khấu hao (Tarjan 1975), α là hàm Ackermann ngược, α(n) <= 4 với mọi n thực tế.

`QuickFind` là baseline "mảng cơ bản": lưu nhãn tập của từng phần tử, find O(1), union O(n).
"""

from __future__ import annotations


class DisjointSet:
    """Rừng cây cha (parent array) với các cờ tối ưu tùy chọn. Bộ nhớ O(n)."""

    __slots__ = ("parent", "rank", "count", "steps", "path_compression", "union_by_rank")

    def __init__(self, n: int, path_compression: bool = True, union_by_rank: bool = True) -> None:
        """Tạo n tập rời {0}, {1}, ..., {n-1}. Thời gian O(n), bộ nhớ O(n)."""
        if n < 0:
            raise ValueError("Số phần tử phải >= 0")
        self.parent = list(range(n))
        self.rank = bytearray(n)          # rank <= log2 n < 256 nên bytearray là đủ
        self.count = n                    # số tập hiện có
        self.steps = 0                    # số lần nhảy con trỏ parent trong find (cho benchmark)
        self.path_compression = path_compression
        self.union_by_rank = union_by_rank

    def find(self, x: int) -> int:
        """Trả về gốc (đại diện) của tập chứa x. Lặp, không đệ quy.

        Có path_compression thì nén hai lượt: lượt 1 đi lên tìm gốc, lượt 2 cho mọi
        nút trên đường trỏ thẳng về gốc. Thời gian: xem docstring module (O(α(n))
        khấu hao khi bật cả hai cờ, O(log n) khi chỉ có rank, O(n) khi không tối ưu).
        Bộ nhớ O(1).
        """
        if not 0 <= x < len(self.parent):
            raise IndexError(f"Phần tử {x} ngoài khoảng 0..{len(self.parent) - 1}")
        parent = self.parent
        root = x
        while parent[root] != root:
            root = parent[root]
            self.steps += 1
        if self.path_compression:
            while parent[x] != root:
                parent[x], x = root, parent[x]
        return root

    def union(self, a: int, b: int) -> bool:
        """Hợp hai tập chứa a và b. Trả về False nếu a, b đã cùng tập.

        Thời gian = 2 lần find + O(1). Bộ nhớ O(1).
        """
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.union_by_rank:
            if self.rank[ra] > self.rank[rb]:
                ra, rb = rb, ra
            if self.rank[ra] == self.rank[rb]:
                self.rank[rb] += 1
        self.parent[ra] = rb              # gắn gốc ra dưới rb
        self.count -= 1
        return True

    def connected(self, a: int, b: int) -> bool:
        """a và b có cùng tập không. Thời gian = 2 lần find, bộ nhớ O(1)."""
        return self.find(a) == self.find(b)


class QuickFind:
    """Baseline mảng cơ bản: label[x] là tên tập của x. Bộ nhớ O(n)."""

    __slots__ = ("label", "count", "steps")

    def __init__(self, n: int) -> None:
        """Tạo n tập rời. Thời gian O(n), bộ nhớ O(n)."""
        if n < 0:
            raise ValueError("Số phần tử phải >= 0")
        self.label = list(range(n))
        self.count = n
        self.steps = 0                    # số lần ghi nhãn trong union (cho benchmark)

    def find(self, x: int) -> int:
        """Nhãn tập của x. Thời gian O(1), bộ nhớ O(1)."""
        if not 0 <= x < len(self.label):
            raise IndexError(f"Phần tử {x} ngoài khoảng 0..{len(self.label) - 1}")
        return self.label[x]

    def union(self, a: int, b: int) -> bool:
        """Đổi nhãn mọi phần tử của tập a sang nhãn của tập b. Thời gian O(n), bộ nhớ O(1)."""
        la, lb = self.find(a), self.find(b)
        if la == lb:
            return False
        label = self.label
        for i in range(len(label)):
            if label[i] == la:
                label[i] = lb
                self.steps += 1
        self.count -= 1
        return True

    def connected(self, a: int, b: int) -> bool:
        """a và b có cùng tập không. Thời gian O(1), bộ nhớ O(1)."""
        return self.find(a) == self.find(b)
