# LogiGraph Resources

## Knowledge

- [Book: _Data Structures and Algorithms in Python_ — Goodrich, Tamassia, Goldwasser (Wiley)](https://www.wiley.com/en-us/Data+Structures+and+Algorithms+in+Python-p-9781118290279)
  Cách cài đặt Adaptable Priority Queue với Locator (Ch.9), Graph/Dijkstra/Kruskal/Union-Find (Ch.14), Quy hoạch động (Ch.13). Dùng cho: các module lõi. Cần đối chiếu với giáo trình môn (ticket R3).
- [Book: _Introduction to Algorithms_, 4th ed. — Cormen, Leiserson, Rivest, Stein (MIT Press)](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
  Chứng minh tính đúng của Dijkstra/Kruskal (tính chất lát cắt), phân tích khấu hao của Union-Find (α(n)). Dùng cho: báo cáo IEEE.
- Paper: R. E. Tarjan, "Efficiency of a Good But Not Linear Set Union Algorithm", *J. ACM* 22(2), 1975.
  Nguồn gốc cận O(m·α(m,n)) của Union-Find. Dùng cho: phần phân tích Ackermann ngược.
- Paper: M. Held, R. M. Karp, "A Dynamic Programming Approach to Sequencing Problems", *J. SIAM* 10(1), 1962.
  Nguồn gốc giải thuật Held-Karp O(n²·2ⁿ) cho TSP.
- [OpenStreetMap](https://www.openstreetmap.org) và [OSMnx documentation](https://osmnx.readthedocs.io/)
  Nguồn dữ liệu bản đồ thật và công cụ trích mạng đường ô tô (chỉ dùng trong `tools/`).
- [Python docs: `tracemalloc`](https://docs.python.org/3/library/tracemalloc.html)
  Đo bộ nhớ đỉnh cho benchmark.
- [Leaflet](https://leafletjs.com)
  Vẽ Route, Backbone Network và Delivery Cluster trên bản đồ trong demo.
- [IEEE Article Templates](https://www.ieee.org/conferences/publishing/templates.html)
  Template IEEEtran (LaTeX) cho báo cáo 12–18 trang.
- [Repository: `mattpocock/skills`](https://github.com/mattpocock/skills) và _A Philosophy of Software Design_ — John Ousterhout
  Khung quy trình (Golden Flow) và nguyên lý Deep Modules dùng cho cách tổ chức repo.
