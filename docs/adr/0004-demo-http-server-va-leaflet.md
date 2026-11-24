# ADR-0004: Demo bằng http.server và một trang Leaflet

Status: accepted (2026-11-24)

## Context
Đề yêu cầu bản đồ trực quan hóa đường đi ngắn nhất và cây khung nhỏ nhất. Demo khi bảo vệ cần thao tác trực tiếp: chọn điểm, gây Traffic Incident, xem Reroute. Phòng bảo vệ có thể không có mạng.

## Decision
- `app/server.py` dùng `http.server` của thư viện chuẩn, trả JSON (route, incident, backbone, clusters, trip).
- `app/index.html` là một file duy nhất dùng Leaflet với `preferCanvas`. Khi không tải được tile nền, trang vẫn vẽ các Road Segment trên nền trống.
- Có thêm CLI để demo nhanh và để chạy benchmark.

## Consequences
- Không phụ thuộc framework web. Toàn bộ logic nằm trong `core/` và được test riêng.
- Bản đồ nền cần mạng. Cần tập dượt chế độ offline trước buổi bảo vệ.
