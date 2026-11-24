# ADR-0003: Dữ liệu OpenStreetMap, chuẩn bị bên ngoài lõi

Status: accepted (2026-11-24). Vùng bản đồ cụ thể chờ ticket R1.

## Context
Đề yêu cầu dữ liệu bản đồ thực tế ≥ 10.000 đỉnh và phân vùng theo quận/huyện. Các thư viện như osmnx kéo theo geopandas, cài đặt nặng, và không được phép xuất hiện trong lõi.

## Decision
- Lấy mạng đường ô tô từ OpenStreetMap bằng `tools/prepare_osm.py` (osmnx). Script chạy một lần, xuất ra `data/nodes.csv` (id, lat, lon, district) và `data/edges.csv` (tail, head, length_m, travel_s), rồi commit vào repo.
- Chỉ giữ thành phần liên thông mạnh lớn nhất, để mọi truy vấn Route đều có đáp án.
- Đồ thị dùng cho benchmark mở rộng (tới 100k đỉnh) được sinh bằng `bench/` với seed cố định.

## Consequences
- Các thành viên chỉ cần Python và pytest, không ai phải cài osmnx trừ người chạy script chuẩn bị dữ liệu.
- Vì đã lọc thành phần liên thông mạnh, phần kiểm tra liên thông bằng DSU sẽ làm trên đồ thị con trong từng District và khi mô phỏng Closure.
