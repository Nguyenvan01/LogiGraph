# ADR-0001: Python, lõi không dùng CTDL dựng sẵn

Status: accepted (2026-11-24)

## Context
Đề khuyến khích Python/C++/Java/C# và cấm dùng thư viện dựng sẵn thay cho CTDL lõi ("không dùng dict/set mặc định"). Repo cũ viết bằng TypeScript, không có trong danh sách khuyến khích. Nhóm 5 người, mỗi người phải giải thích code của mình khi vấn đáp.

## Decision
- Dùng Python ≥ 3.12 và pytest.
- `logigraph/core/` chỉ dùng mảng (`list`, `bytearray`, tuple). Cấm `dict`/`set`/`frozenset`, cấm `heapq`, `collections`, `functools`, `bisect`, `queue` và thư viện ngoài. `tests/test_core_rules.py` kiểm tra quy tắc này bằng AST mỗi lần chạy test.

## Consequences
- Code dễ đọc khi vấn đáp, có sẵn `tracemalloc` và matplotlib cho benchmark.
- Python thuần chạy chậm, nên phải giới hạn quy mô: Held-Karp n ≤ 15, Bellman-Ford dừng sớm và có timeout.
- Benchmark phải so sánh Python thuần với Python thuần. `heapq` (viết bằng C) chỉ là đường tham chiếu.
