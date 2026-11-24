# ADR-0003: Dữ liệu OpenStreetMap, chuẩn bị bên ngoài lõi

Status: accepted (2026-11-24). Đã chạy: 24 phường, 38.604 đỉnh, 69.411 cạnh.

## Context
Đề yêu cầu dữ liệu bản đồ thực tế ≥ 10.000 đỉnh và phân vùng theo quận/huyện. Các thư viện như osmnx kéo theo geopandas, cài đặt nặng, và không được phép xuất hiện trong lõi.

## Decision
- Lấy mạng đường ô tô từ OpenStreetMap qua Overpass API bằng `tools/prepare_osm.py` (chỉ `urllib` của thư viện chuẩn; ban đầu định dùng osmnx nhưng không cần). Vùng: các phường mới (`admin_level=6`, sau cải cách 01/07/2025) giao với khung nội thành Hà Nội. Script chạy một lần, xuất ra `data/nodes.csv` (id, lat, lon, district) và `data/edges.csv` (tail, head, length_m, travel_s), rồi commit vào repo.
- Chỉ giữ thành phần liên thông mạnh lớn nhất, để mọi truy vấn Route đều có đáp án.
- Đồ thị dùng cho benchmark mở rộng (tới 100k đỉnh) được sinh bằng `bench/` với seed cố định.

## Consequences
- Các thành viên chỉ cần Python và pytest; script chuẩn bị dữ liệu cũng không cần thư viện ngoài.
- Vì đã lọc thành phần liên thông mạnh, phần kiểm tra liên thông bằng DSU sẽ làm trên đồ thị con trong từng District và khi mô phỏng Closure.
