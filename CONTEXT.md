# LogiGraph

Hệ thống định tuyến giao hàng và quy hoạch mạng lưới kho trên bản đồ giao thông đô thị.

## Language

### Bản đồ

**Road Network**:
Đồ thị có hướng, có trọng số, biểu diễn bản đồ giao thông. Đỉnh là **Intersection**, cạnh là **Road Segment**.
_Avoid_: Map graph, street graph

**Intersection**:
Một đỉnh của Road Network (giao lộ, điểm đầu/cuối đường, hoặc vị trí kho), định danh bằng số nguyên liên tục `0..n-1`.
_Avoid_: Node, point, junction

**Road Segment**:
Một cạnh có hướng giữa hai Intersection, định danh bằng `edge_id`. Đường hai chiều là hai Road Segment ngược hướng nhau.
_Avoid_: Edge (trong tài liệu nghiệp vụ), link, street

**Travel Time**:
Trọng số dùng để định tuyến của một Road Segment, tính bằng giây. Luôn ≥ 0.
_Avoid_: Cost, weight (trong tài liệu nghiệp vụ)

**District**:
Đơn vị phân vùng hành chính mà mỗi Intersection thuộc về. Từ 01/07/2025 Việt Nam bỏ cấp quận/huyện, nên dữ liệu dùng phường mới (OSM `admin_level=6`); tên trong code vẫn là `district`.
_Avoid_: Zone, area, region

### Sự cố và định tuyến

**Traffic Incident**:
Sự kiện làm thay đổi Travel Time của một Road Segment. Có hai loại: **Congestion** (tắc đường, Travel Time tăng) và **Closure** (cấm đường, Road Segment không đi được).
_Avoid_: Event, jam, block

**Route**:
Dãy Road Segment liên tiếp đi từ một Intersection tới một Intersection khác với tổng Travel Time nhỏ nhất.
_Avoid_: Path (trong tài liệu nghiệp vụ), way, itinerary

**Reroute**:
Tính lại Route từ vị trí hiện tại của xe khi có Traffic Incident.
_Avoid_: Recalculate, re-plan

### Mạng lưới kho

**Hub**:
Kho trung chuyển, đặt tại một Intersection.
_Avoid_: Warehouse, depot, station

**Backbone Network**:
Tập tuyến nối mọi Hub với tổng chi phí xây dựng nhỏ nhất (cây khung nhỏ nhất trên đồ thị Hub vô hướng).
_Avoid_: Trunk line, core network

**Delivery Cluster**:
Nhóm Delivery Point gần nhau, được giao chung một chuyến hoặc một khu vực.
_Avoid_: Zone, group, partition

### Giao hàng

**Parcel**:
Kiện hàng cần giao, có khối lượng (số nguyên, đơn vị 0,1 kg), cước phí và Delivery Point.
_Avoid_: Package, item, order, shipment

**Delivery Point**:
Intersection nơi một Parcel được giao.
_Avoid_: Stop, destination, drop-off

**Truck**:
Xe tải có tải trọng tối đa, xuất phát và quay về một Hub.
_Avoid_: Vehicle, van

**Trip**:
Một chuyến của một Truck: tập Parcel được chọn (tối đa hóa cước trong giới hạn tải trọng) và thứ tự đi qua các Delivery Point (vòng ngắn nhất xuất phát và quay về Hub).
_Avoid_: Tour, run, journey
