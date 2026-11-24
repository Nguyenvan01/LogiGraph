# ADR-0002: Intersection đánh số liên tục, Adjacency List kèm mảng cạnh

Status: accepted (2026-11-24)

## Context
Adjacency Map theo kiểu sách giáo trình dùng `dict`, trái với ADR-0001. Thao tác cần nhanh nhất là duyệt hàng xóm (Dijkstra) và đổi Travel Time của một Road Segment (Traffic Incident). Bản đồ thật có khoảng 20k đỉnh, nên ma trận kề (V² ≈ 4·10⁸ ô) là không khả thi.

## Decision
- Intersection là số nguyên `0..n-1`. Việc đổi id OSM sang id liên tục làm một lần trong `tools/`.
- Road Segment là số nguyên `edge_id`, dữ liệu nằm trong các mảng song song: `tail`, `head`, `length_m`, `travel_s`, `closed`.
- `out_edges[u]` là danh sách `edge_id` đi ra từ `u`.

## Consequences
- Bộ nhớ O(V+E). Duyệt hàng xóm O(deg). Đổi trọng số và cấm đường O(1) theo `edge_id`.
- Tìm cạnh theo cặp (u, v) tốn O(deg(u)), chấp nhận được vì bậc trung bình của đường bộ chỉ khoảng 2–4.
