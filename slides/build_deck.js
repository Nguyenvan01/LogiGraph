// Sinh deck bảo vệ LogiGraph (.pptx) bằng pptxgenjs.
//
// Cài một lần (ngoài repo cũng được):  npm i pptxgenjs react react-dom react-icons sharp
// Chạy:  NODE_PATH=<thư mục node_modules> node slides/build_deck.js
// Ảnh bản đồ: .venv/bin/python slides/make_map.py (ghi slides/assets/map_*.png)
// Số liệu benchmark đọc trực tiếp từ bench/results/*.csv.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

const SKILL = process.env.PPTX_SKILL_DIR ||
  "/Users/ccm/.claude/skills/synced/58900d19-01fb-44c7-9057-7ed868a395b9_d764b500-a602-4f65-855f-df39c5131fd5/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "LogiGraph-bao-ve.pptx");

// ---------- Theme ----------
const THEME = {
  name: "LogiGraph",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1C2633", lt1: "FFFFFF", dk2: "0F2B46", lt2: "EDF2F7",
    accent1: "15385C", accent2: "E39B2D", accent3: "1B8A87",
    accent4: "7A8797", accent5: "C4553B", accent6: "A7D7D3",
    hlink: "1B8A87", folHlink: "7A8797",
  },
};
const H = THEME.colors; // hex, chỉ dùng ở các option không nhận scheme color (chart, nền layout)
const MUTED = "5B6675";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "LogiGraph – bảo vệ đồ án";
pres.author = "Nhóm LogiGraph";
pres.subject = "Đề tài 4 – CTDL & GT nâng cao";
const C = pres.SchemeColor;

// ---------- Dữ liệu benchmark ----------
function readCsv(name) {
  const lines = fs.readFileSync(path.join(ROOT, "bench/results", name), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#"));
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    const o = {};
    head.forEach((h, i) => (o[h] = c[i]));
    return o;
  });
}
const num = (v) => (v === undefined || v === "" || v === "timeout" ? null : Number(v));
function pick(rows, variant, sizes, f) {
  return sizes.map((s) => {
    const r = rows.find((x) => x.variant === variant && Number(x.size) === s);
    return r && num(r.time_s) !== null ? f(r) : null;
  });
}
const r3 = (x) => (x === null ? null : Number(x.toPrecision(3)));

// ---------- Icon ----------
async function icon(name, color, px = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const ICON = {};
async function loadIcons() {
  const list = {
    route: ["FaRoute"], map: ["FaMapMarkedAlt"], graph: ["FaProjectDiagram"], truck: ["FaTruck"],
    box: ["FaBoxOpen"], tree: ["FaSitemap"], net: ["FaNetworkWired"], layers: ["FaLayerGroup"],
    check: ["FaCheckCircle"], vial: ["FaVial"], db: ["FaDatabase"], clock: ["FaStopwatch"],
    mem: ["FaMemory"], server: ["FaServer"], code: ["FaCode"], flask: ["FaFlask"], scale: ["FaBalanceScale"],
    chart: ["FaChartLine"], laptop: ["FaLaptopCode"], play: ["FaPlay"], users: ["FaUsers"],
    shield: ["FaShieldAlt"], filter: ["FaFilter"], cogs: ["FaCogs"], traffic: ["FaTrafficLight"],
    warn: ["FaExclamationTriangle"], road: ["FaRoad"], hub: ["FaWarehouse"], seed: ["FaSeedling"],
    term: ["FaTerminal"], link: ["FaLink"], cubes: ["FaCubes"], group: ["FaObjectGroup"],
    list: ["FaListOl"], ban: ["FaBan"], globe: ["FaGlobeAsia"], light: ["FaLightbulb"], table: ["FaTable"],
  };
  for (const [k, [n]] of Object.entries(list)) {
    ICON[k] = { w: await icon(n, "FFFFFF"), n: await icon(n, H.accent1) };
  }
}

// ---------- Layouts ----------
function defineLayouts() {
  const footer = [
    { placeholder: { options: { name: "tag", type: "body", x: 0.6, y: 6.98, w: 9, h: 0.32, fontSize: 11, color: C.accent4, margin: 0, valign: "middle" }, text: "" } },
  ];
  const slideNumber = { x: 12.13, y: 6.98, w: 0.6, h: 0.32, fontSize: 11, color: H.accent4, align: "right" };

  pres.defineSlideMaster({
    title: "TITLE_DARK",
    background: { color: H.dk2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.55, w: 7.4, h: 2.3, fontSize: 38, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.05, w: 7.4, h: 1.3, fontSize: 18, color: C.accent6, valign: "top", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: H.lt1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 34, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
      ...footer,
    ],
    slideNumber,
  });
  pres.defineSlideMaster({
    title: "CHART",
    background: { color: H.lt1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 34, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "chart", type: "chart", x: 0.6, y: 1.45, w: 7.9, h: 5.3, color: C.text1 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 8.85, y: 1.5, w: 3.9, h: 5.25, fontSize: 15, color: C.text1, valign: "top", margin: 0 }, text: "" } },
      ...footer,
    ],
    slideNumber,
  });
}

// ---------- Helpers ----------
let slideNo = 0;
function newSlide(master, section, title, tag) {
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  slideNo++;
  s.addText(title, { placeholder: "title" });
  if (tag) s.addText(tag, { placeholder: "tag" });
  return s;
}
const T = (text, o = {}) => ({ text, options: o });
function txt(s, text, o) {
  s.addText(text, { isTextBox: true, fontSize: 15, color: C.text1, valign: "top", margin: 0, ...o });
}
function card(s, x, y, w, h, fill = C.background2, name) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: 0.08, objectName: name || "card" });
}
function iconCircle(s, key, x, y, d, fill = C.accent1, dark = false) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: "icon-bg-" + key });
  const p = d * 0.25;
  s.addImage({ data: dark ? ICON[key].n : ICON[key].w, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: key, objectName: "icon-" + key });
}
function stat(s, x, y, w, value, label, color = C.accent1, size = 48) {
  txt(s, value, { x, y, w, h: size / 60, fontSize: size, bold: true, color, fontFace: "Cambria", valign: "bottom" });
  txt(s, label, { x, y: y + size / 60 + 0.05, w, h: 0.6, fontSize: 14, color: MUTED });
}
function arrow(s, x, y, w = 0.35, color = C.accent4) {
  s.addShape(pres.shapes.RIGHT_ARROW, { x, y, w, h: 0.28, fill: { color }, line: { type: "none" }, objectName: "arrow" });
}
const hdr = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: H.accent1 }, fontSize: 14, valign: "middle" } });
function table(s, rows, o) {
  s.addTable(rows, { fontSize: 14, color: H.dk1, border: { type: "solid", pt: 0.75, color: "D5DCE4" }, valign: "middle", margin: [0.04, 0.08, 0.04, 0.08], ...o });
}

function chartStyle(extra = {}) {
  return {
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
    valGridLine: { color: "E3E8EE", size: 0.75 }, catGridLine: { style: "none" },
    catAxisLineColor: "C9D1DB", valAxisLineShow: false,
    showLegend: true, legendPos: "b", legendFontFace: "+mn-lt", legendFontSize: 12, legendColor: MUTED,
    showTitle: true, titleFontFace: "+mn-lt", titleFontSize: 14, titleColor: H.dk1, titleBold: true,
    dataLabelFontFace: "+mn-lt", dataLabelFontSize: 11, dataLabelColor: H.dk1,
    showValAxisTitle: true, valAxisTitleFontFace: "+mn-lt", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED,
    showCatAxisTitle: true, catAxisTitleFontFace: "+mn-lt", catAxisTitleFontSize: 12, catAxisTitleColor: MUTED,
    ...extra,
  };
}
const bullets = (items, o = {}) => items.map((it, i) => {
  const runs = Array.isArray(it) ? it : [T(it)];
  return runs.map((r, j) => ({
    text: r.text,
    options: { ...(j === 0 ? { bullet: { indent: 16 }, paraSpaceAfter: 8 } : {}), ...o, ...r.options, ...(j === runs.length - 1 && i < items.length - 1 ? { breakLine: true } : {}) },
  }));
}).flat();

// ---------- Slides ----------
async function build() {
  await loadIcons();
  defineLayouts();
  const sssp = readCsv("sssp.csv"), dense = readCsv("sssp_dense.csv"), osm = readCsv("sssp_osm.csv");
  const dsu = readCsv("dsu.csv"), mstD = readCsv("mst_dense.csv"), knap = readCsv("knapsack.csv"), tsp = readCsv("tsp.csv");

  // ===== Mở đầu =====
  const SEC0 = "Mở đầu";
  pres.addSection({ title: SEC0 });

  // 1. Title
  let s = newSlide("TITLE_DARK", SEC0, "LogiGraph: Tối ưu hóa mạng lưới giao hàng và định tuyến vận tải đô thị");
  s.addText([
    T("Đề tài 4 · Học phần Cấu trúc dữ liệu và Giải thuật nâng cao", { breakLine: true }),
    T("Trường Đại học Công nghệ Kỹ thuật Hưng Yên", { color: "FFFFFF" }),
  ], { placeholder: "body" });
  s.addImage({ path: path.join(__dirname, "assets/map_dark.png"), x: 8.55, y: 0.45, w: 4.3, h: 4.52, altText: "Mạng đường nội thành Hà Nội từ OpenStreetMap", objectName: "map" });
  ["TV1", "TV2", "TV3", "TV4", "TV5"].forEach((m, i) => {
    const x = 0.7 + i * 1.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.75, w: 1.3, h: 0.95, fill: { color: "1B3D5E" }, line: { type: "none" }, rectRadius: 0.08, objectName: "member-" + m });
    txt(s, [T(m, { bold: true, color: "FFFFFF", fontSize: 18, breakLine: true }), T(i === 0 ? "trưởng nhóm" : "thành viên", { color: H.accent6, fontSize: 12 })], { x: x + 0.12, y: 5.85, w: 1.1, h: 0.8, align: "left" });
  });
  txt(s, "Dữ liệu bản đồ © OpenStreetMap contributors", { x: 8.55, y: 6.4, w: 4.3, h: 0.3, fontSize: 11, color: H.accent6, align: "right" });
  s.addNotes(`Người trình bày: TV1 (trưởng nhóm). Khoảng 30 giây.
- Chào hội đồng, giới thiệu tên đề tài: LogiGraph, Đề tài 4, tối ưu hóa mạng lưới giao hàng và định tuyến vận tải đô thị.
- Giới thiệu 5 thành viên và thứ tự trình bày: TV1 đồ thị và dữ liệu, TV2 định tuyến, TV3 Union-Find và mạng lưới kho, TV4 xếp hàng và thứ tự giao, TV5 thực nghiệm. Sau đó demo trực tiếp và vấn đáp.
- Hình bên phải là toàn bộ mạng đường mà hệ thống chạy trên đó, vẽ từ chính dữ liệu của nhóm.
Câu cần nói: "Toàn bộ chạy trên bản đồ thật của 24 phường nội thành Hà Nội."`);

  // 2. Bài toán & 5 yêu cầu
  s = newSlide("CONTENT", SEC0, "Bài toán và năm yêu cầu chức năng", "Mở đầu · TV1");
  txt(s, "Giao hàng chặng cuối: nhiều bài toán con chạy trên cùng một mạng đường, kết quả bước trước là đầu vào bước sau.", { x: 0.6, y: 1.3, w: 12.1, h: 0.45, fontSize: 16, color: MUTED });
  const reqs = [
    ["map", "R1", "Mô hình hóa mạng đường: đồ thị có hướng, có trọng số", "Adjacency List trên mảng song song, edge_id ổn định"],
    ["route", "R2", "Đường ngắn nhất, cập nhật trọng số động và Reroute", "Dijkstra + Adaptable Priority Queue có Locator"],
    ["hub", "R3", "Backbone chi phí nhỏ nhất giữa các Hub", "Union-Find + Kruskal"],
    ["truck", "R4", "Chọn Parcel lên xe và sắp thứ tự giao", "0/1 Knapsack DP + Held-Karp (TSP bất đối xứng)"],
    ["layers", "R5", "Liên thông và phân vùng theo đơn vị hành chính", "Union-Find theo phường, single-linkage"],
  ];
  reqs.forEach(([ic, r, need, ds], i) => {
    const y = 1.95 + i * 0.95;
    card(s, 0.6, y, 12.1, 0.8, C.background2, "req-" + r);
    iconCircle(s, ic, 0.75, y + 0.1, 0.6);
    txt(s, r, { x: 1.5, y: y + 0.1, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: C.accent3, valign: "middle", fontFace: "Cambria" });
    txt(s, need, { x: 2.1, y: y + 0.1, w: 5.4, h: 0.6, fontSize: 16, valign: "middle" });
    arrow(s, 7.6, y + 0.26);
    txt(s, ds, { x: 8.15, y: y + 0.1, w: 4.4, h: 0.6, fontSize: 16, bold: true, color: C.accent1, valign: "middle" });
  });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút.
- Đề tài đặt ra 5 yêu cầu chức năng R1–R5. Mỗi yêu cầu ứng với một cấu trúc dữ liệu hoặc giải thuật kinh điển.
- R1: mạng đường là đồ thị có hướng, có trọng số Travel Time. R2: đường ngắn nhất và tính lại tuyến khi tắc hoặc cấm đường, dùng Dijkstra với Adaptable Priority Queue. R3: Backbone nối các Hub bằng Union-Find và Kruskal. R4: Knapsack chọn kiện, Held-Karp sắp thứ tự giao, cả hai là quy hoạch động. R5: liên thông theo phường bằng Union-Find.
- Hai ràng buộc của đề: cấu trúc lõi tự cài đặt, không dùng dict/set thay thế; benchmark trên bản đồ thật từ 10.000 đỉnh trở lên.
Câu cần nói: "Khó khăn không nằm ở từng giải thuật riêng lẻ mà ở chỗ chúng dùng chung một biểu diễn đồ thị và nối tiếp nhau."`);

  // 3. Dữ liệu thật
  s = newSlide("CONTENT", SEC0, "Dữ liệu thật: 24 phường nội thành Hà Nội", "Mở đầu · TV1");
  s.addImage({ path: path.join(__dirname, "assets/map_light.png"), x: 0.6, y: 1.35, w: 5.3, h: 5.56, altText: "Mạng đường 24 phường nội thành Hà Nội, trục chính màu cam", objectName: "map" });
  stat(s, 6.4, 1.4, 3.1, "38.604", "Intersection", C.accent1, 54);
  stat(s, 9.6, 1.4, 3.2, "69.411", "Road Segment có hướng", C.accent1, 54);
  stat(s, 6.4, 2.95, 3.1, "24", "phường (OSM admin_level=6)", C.accent3, 44);
  stat(s, 9.6, 2.95, 3.2, "10.168", "way ô tô, 4.064 way một chiều", C.accent3, 44);
  card(s, 6.4, 4.55, 6.3, 1.25, C.background2, "note-ward");
  iconCircle(s, "globe", 6.55, 4.75, 0.55, C.accent3);
  txt(s, "Từ 01/07/2025 Việt Nam bỏ cấp quận/huyện, nên phân vùng dùng 24 phường mới thay cho quận. Trong code trường này vẫn tên là district.", { x: 7.25, y: 4.68, w: 5.3, h: 1.0, fontSize: 15, valign: "middle" });
  txt(s, "Không simplify: 78,3% đỉnh là shape point bậc 2, trung vị một Road Segment dài 18,2 m, đủ ngắn để đặt sự cố tại một vị trí cụ thể.", { x: 6.4, y: 6.0, w: 6.3, h: 0.75, fontSize: 14, color: MUTED });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút.
- Dữ liệu lấy từ OpenStreetMap qua Overpass API: 24 phường nội thành, 38.604 Intersection và 69.411 Road Segment có hướng. Quy mô này vượt yêu cầu 10.000 đỉnh của đề.
- Từ 01/07/2025 không còn cấp quận/huyện. Ranh giới admin_level=6 trên OSM tại Hà Nội nay là phường mới, nên nhóm phân vùng theo 24 phường. Dùng ranh giới quận cũ là dùng đơn vị đã hết hiệu lực.
- Nhóm không rút gọn đỉnh bậc 2: tuyến vẽ ra bám đúng hình con đường, mỗi đoạn trung vị 18,2 m. Đổi lại số đỉnh lớn hơn số giao lộ thật khoảng 4,6 lần.
- Hình: màu cam là trục chính (vận tốc từ 40 km/h), màu xám là đường nhỏ.
Con số cần nói: 38.604 Intersection, 69.411 Road Segment, 24 phường.`);

  // 4. Kiến trúc & phân công
  s = newSlide("CONTENT", SEC0, "Kiến trúc và phân công", "Mở đầu · TV1");
  const flow = [["db", "tools/ + data/", "OSM → CSV, chạy một lần"], ["cubes", "logigraph/core/", "CTDL & giải thuật, chỉ mảng"], ["laptop", "app/", "http.server + Leaflet"], ["chart", "bench/", "đo, subprocess riêng"]];
  flow.forEach(([ic, name, d], i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 1.35, 2.75, 0.85, i === 1 ? C.accent1 : C.background2, "arch-" + i);
    iconCircle(s, ic, x + 0.12, 1.5, 0.55, i === 1 ? C.accent3 : C.accent1);
    txt(s, [T(name, { bold: true, fontSize: 15, breakLine: true, color: i === 1 ? "FFFFFF" : H.dk2 }), T(d, { fontSize: 12, color: i === 1 ? H.accent6 : MUTED })], { x: x + 0.78, y: 1.42, w: 1.95, h: 0.72, valign: "middle" });
    if (i < 3) arrow(s, x + 2.77, 1.64, 0.31, C.accent4);
  });
  const team = [
    ["TV1 (trưởng nhóm)", "Đồ thị, dữ liệu, tích hợp, demo", "core/graph.py, core/trip.py, tools/, app/", "Adjacency List trên mảng song song, Kosaraju SCC"],
    ["TV2", "Định tuyến thời gian thực", "core/apq.py, core/heaps.py, core/routing.py", "Adaptable PQ + Locator, Dijkstra, Bellman-Ford, Reroute"],
    ["TV3", "Quy hoạch mạng lưới kho", "core/dsu.py, core/network.py", "Union-Find (rank + path compression), Kruskal, single-linkage"],
    ["TV4", "Xếp hàng lên xe, thứ tự giao", "core/loading.py, core/tsp.py", "0/1 Knapsack (DP, branch-and-bound), Held-Karp"],
    ["TV5", "Thực nghiệm và so sánh", "bench/", "Bộ sinh đồ thị có seed, harness thời gian/bộ nhớ, biểu đồ"],
  ];
  table(s, [[hdr("Thành viên"), hdr("Module"), hdr("File chính"), hdr("CTDL & giải thuật")],
    ...team.map((r, i) => r.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 0 ? H.accent1 : H.dk1, fill: { color: i % 2 ? "F6F8FB" : "FFFFFF" }, fontFace: j === 2 ? "Courier New" : undefined, fontSize: j === 2 ? 13 : 14 } })))],
    { x: 0.6, y: 2.5, w: 12.1, colW: [1.9, 2.75, 3.55, 3.9], rowH: 0.62 });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút.
- Mã nguồn chia bốn phần, phụ thuộc một chiều: tools/ tải và làm sạch OSM một lần rồi ghi CSV; logigraph/core/ chứa toàn bộ cấu trúc dữ liệu và giải thuật, không phụ thuộc thư viện ngoài; app/ và bench/ chỉ gọi vào lõi.
- Bảng phân công: mỗi thành viên sở hữu một module và một phiếu vấn đáp riêng trong docs/vandap/. Các phần trình bày tiếp theo đi đúng thứ tự TV1 đến TV5.
- Quy tắc chỉ dùng mảng áp dụng cho core/; ngoài lõi (ví dụ ánh xạ id OSM) được phép dùng dict.
Câu cần nói: "Lõi khoảng 1.300 dòng Python thuần; mỗi người chịu trách nhiệm một module và trả lời vấn đáp phần của mình."`);

  // 5. Quy tắc lõi & kiểm chứng
  s = newSlide("CONTENT", SEC0, "Quy tắc lõi và cách kiểm chứng", "Mở đầu · TV1");
  card(s, 0.6, 1.4, 4.6, 5.3, C.accent1, "rule-card");
  iconCircle(s, "ban", 0.85, 1.65, 0.7, C.accent5);
  txt(s, "core/ chỉ dùng list, bytearray, tuple", { x: 1.75, y: 1.65, w: 3.3, h: 0.7, fontSize: 17, bold: true, color: "FFFFFF", valign: "middle" });
  txt(s, bullets([
    "Test AST (tests/test_core_rules.py) báo lỗi khi gặp literal, comprehension hay lời gọi dict, set, frozenset",
    "Chỉ cho import math, random, typing, dataclasses, csv, pathlib: heapq, collections, functools bị chặn",
  ], { color: "FFFFFF", fontSize: 15 }), { x: 0.85, y: 2.6, w: 4.15, h: 2.3 });
  txt(s, "81", { x: 0.85, y: 4.95, w: 1.6, h: 1.0, fontSize: 60, bold: true, color: C.accent2, fontFace: "Cambria", valign: "bottom" });
  txt(s, "test pytest, chạy dưới 1 phút", { x: 2.45, y: 5.35, w: 2.6, h: 0.6, fontSize: 15, color: C.accent6, valign: "bottom" });
  txt(s, "Differential oracle: mỗi giải thuật được so với một lời giải độc lập", { x: 5.6, y: 1.4, w: 7.1, h: 0.45, fontSize: 18, bold: true, color: C.text2 });
  const oracles = [
    ["route", "Dijkstra (3 biến thể)", "Bellman-Ford", "150 đồ thị ngẫu nhiên có seed, có cạnh trọng số 0 và cạnh Closure"],
    ["tree", "Kruskal", "Prim mảng O(V²)", "cùng tổng trọng số trên đồ thị ngẫu nhiên"],
    ["box", "Knapsack DP, Held-Karp", "vét cạn", "80 bộ Knapsack n ≤ 15; Held-Karp n = 2..8, ma trận có ô inf"],
    ["net", "Union-Find", "BFS", "cùng phân hoạch thành phần liên thông"],
  ];
  oracles.forEach(([ic, a, b, d], i) => {
    const y = 2.05 + i * 1.17;
    card(s, 5.6, y, 7.1, 1.0, C.background2, "oracle-" + i);
    iconCircle(s, ic, 5.75, y + 0.2, 0.6);
    txt(s, [T(a, { bold: true, color: H.accent1 }), T("  ↔  ", { color: H.accent3, bold: true }), T(b, { bold: true, color: H.accent3, breakLine: true }), T(d, { fontSize: 13, color: MUTED })], { x: 6.5, y: y + 0.1, w: 6.05, h: 0.82, fontSize: 16, valign: "middle" });
  });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút 15 giây.
- Ràng buộc "không dùng dict/set dựng sẵn" không chỉ là cam kết: tests/test_core_rules.py phân tích AST mọi file trong core/ và báo lỗi nếu gặp dict, set, frozenset, hoặc import ngoài danh sách cho phép. Vì vậy heapq, collections, functools đều bị chặn.
- Toàn bộ có 81 test. Điểm chính là differential oracle: mỗi giải thuật được so với một lời giải chuẩn viết theo cách khác hẳn. Dijkstra so với Bellman-Ford trên 150 đồ thị ngẫu nhiên; Kruskal so với Prim; Knapsack và Held-Karp so với vét cạn; Union-Find so với BFS; Adaptable Heap so với danh sách đã sắp xếp.
- Nếu hai cách độc lập cho cùng kết quả trên hàng trăm đầu vào ngẫu nhiên thì khả năng cả hai cùng sai theo một cách là rất thấp.
Con số cần nói: 81 test, 150 đồ thị ngẫu nhiên cho Dijkstra.`);

  // ===== TV1 =====
  const SEC1 = "TV1 · Đồ thị và dữ liệu";
  pres.addSection({ title: SEC1 });

  // 6. Biểu diễn đồ thị
  s = newSlide("CONTENT", SEC1, "Biểu diễn đồ thị: Adjacency List trên mảng", "TV1 · Mô hình hóa bản đồ");
  txt(s, "Mảng cạnh song song, edge_id e là chỉ số chung", { x: 0.6, y: 1.35, w: 6.3, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  const cols = ["e", "tail", "head", "length_m", "travel_s", "closed"];
  const rowsArr = [["0", "0", "1", "807,3", "145,3", "0"], ["1", "1", "2", "883,3", "159,0", "0"], ["2", "1", "0", "807,3", "145,3", "1"], ["3", "2", "1", "883,3", "159,0", "0"]];
  table(s, [cols.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: H.accent1 }, fontFace: "Courier New", fontSize: 13, align: "center" } })),
    ...rowsArr.map((r) => r.map((c, j) => ({ text: c, options: { fontFace: "Courier New", fontSize: 13, align: "center", color: j === 0 ? H.accent3 : H.dk1, bold: j === 0, fill: { color: j === 5 && c === "1" ? "F9E3DD" : "FFFFFF" } } })))],
    { x: 0.6, y: 1.85, w: 6.3, colW: [0.6, 0.85, 0.85, 1.4, 1.4, 1.2], rowH: 0.38 });
  txt(s, "_out[u]: danh sách edge_id đi ra", { x: 0.6, y: 3.95, w: 6.3, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  [["u = 0", "[0]"], ["u = 1", "[1, 2]"], ["u = 2", "[3]"]].forEach(([u, l], i) => {
    const y = 4.45 + i * 0.5;
    txt(s, u, { x: 0.6, y, w: 1.0, h: 0.4, fontFace: "Courier New", fontSize: 14, valign: "middle" });
    arrow(s, 1.6, y + 0.06, 0.4, C.accent3);
    card(s, 2.15, y, 1.6, 0.4, C.background2, "outlist");
    txt(s, l, { x: 2.25, y, w: 1.45, h: 0.4, fontFace: "Courier New", fontSize: 14, valign: "middle", color: C.accent1, bold: true });
  });
  txt(s, "Route là dãy edge_id: không nhập nhằng khi có cạnh song song; Traffic Incident chỉ định bằng edge_id.", { x: 4.0, y: 4.45, w: 2.9, h: 1.4, fontSize: 14, color: MUTED });
  // so sánh với ma trận
  card(s, 7.35, 1.35, 5.35, 2.35, C.background2, "matrix-card");
  txt(s, "Ma trận kề ở V = 38.604", { x: 7.6, y: 1.5, w: 4.9, h: 0.4, fontSize: 15, bold: true, color: C.accent5 });
  txt(s, "1,49·10⁹ ô", { x: 7.6, y: 1.9, w: 4.9, h: 0.85, fontSize: 44, bold: true, color: C.accent5, fontFace: "Cambria" });
  txt(s, "≈ 1,49 GB nếu 1 byte/ô; mỗi hàng chỉ có trung bình 1,8 ô khác rỗng, duyệt hàng xóm tốn O(V)", { x: 7.6, y: 2.8, w: 4.9, h: 0.8, fontSize: 14, color: MUTED });
  table(s, [[hdr("Thao tác"), hdr("Ma trận kề"), hdr("LogiGraph")],
    ["Bộ nhớ", "O(V²)", "O(V + E)"], ["Duyệt cạnh ra của u", "O(V)", "O(deg u)"], ["Đổi w(e), Closure", "O(1)", "O(1)"], ["Thêm Road Segment", "O(1)", "O(1) khấu hao"], ["Cạnh song song", "không", "có"]].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 2, color: j === 2 ? H.accent3 : H.dk1 } }))),
    { x: 7.35, y: 3.95, w: 5.35, colW: [2.15, 1.45, 1.75], rowH: 0.43 });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút 30 giây.
- Intersection được đánh id nguyên liên tục 0..n−1, nên chỉ số mảng thay cho hàm băm. Mỗi Road Segment có edge_id là chỉ số chung của năm mảng song song: tail, head, length_m, travel_s và closed (bytearray, một byte mỗi cạnh).
- _out[u] giữ danh sách edge_id đi ra từ u. Duyệt hàng xóm tốn O(deg u); bậc ra trung bình chỉ 1,8.
- Đổi Travel Time khi tắc đường là ghi đè travel_s[e]; cấm đường là đặt closed[e] = 1. Cả hai O(1). Travel Time âm hoặc NaN bị từ chối ngay ở biên dữ liệu vì phá bất biến của Dijkstra.
- So sánh: ma trận kề ở V = 38.604 cần khoảng 1,49 tỉ ô trong khi mỗi hàng chỉ có 1,8 ô khác rỗng. Adjacency Map của giáo trình cũng O(V+E) nhưng dựa trên dict, đề không cho phép, và chỉ giữ một cạnh cho mỗi cặp đỉnh.
Con số cần nói: 1,49·10⁹ ô của ma trận so với khoảng 108 nghìn phần tử V + E.`);

  // 7. Pipeline dữ liệu
  s = newSlide("CONTENT", SEC1, "Pipeline dữ liệu và tích hợp", "TV1 · Dữ liệu và tích hợp");
  txt(s, "tools/prepare_osm.py: chạy một lần ngoài lõi, chỉ dùng thư viện chuẩn", { x: 0.6, y: 1.35, w: 12.1, h: 0.4, fontSize: 16, color: MUTED });
  const steps = [
    ["globe", "Overpass API", "24 phường, 13 lớp highway ô tô, 10.168 way"],
    ["road", "Haversine", "độ dài từng cặp node liên tiếp, R = 6.371 km"],
    ["traffic", "Vận tốc", "maxspeed nếu có, không thì theo loại đường: 80 … 10 km/h"],
    ["route", "Một chiều", "oneway, vòng xuyến, motorway; còn lại sinh 2 cạnh"],
    ["graph", "Kosaraju SCC", "giữ SCC lớn nhất: 40.266 → 38.604 đỉnh"],
    ["db", "CSV", "nodes.csv, edges.csv; id đánh lại 0..n−1"],
  ];
  steps.forEach(([ic, name, d], i) => {
    const x = 0.6 + i * 2.06;
    card(s, x, 1.95, 1.8, 2.55, C.background2, "step-" + i);
    iconCircle(s, ic, x + 0.6, 2.1, 0.6, i === 4 ? C.accent3 : C.accent1);
    txt(s, name, { x: x + 0.1, y: 2.8, w: 1.6, h: 0.4, fontSize: 15, bold: true, color: C.text2, align: "center" });
    txt(s, d, { x: x + 0.12, y: 3.2, w: 1.56, h: 1.25, fontSize: 13, color: MUTED, align: "center" });
    if (i < 5) arrow(s, x + 1.82, 3.1, 0.22, C.accent4);
  });
  card(s, 0.6, 4.8, 6.0, 1.95, C.background2, "scc-note");
  iconCircle(s, "shield", 0.8, 5.0, 0.55, C.accent3);
  txt(s, [T("Vì sao SCC lớn nhất?", { bold: true, color: H.accent1, breakLine: true }), T("Mọi cặp Intersection có Route hữu hạn, nên ma trận khoảng cách cho Held-Karp và Backbone luôn hữu hạn. Liên thông yếu là không đủ: đi được s → t chưa chắc có đường quay về. Kosaraju viết bằng stack tường minh vì DFS có thể sâu cỡ V.", { fontSize: 14 })], { x: 1.5, y: 4.95, w: 4.95, h: 1.7, fontSize: 15 });
  card(s, 6.9, 4.8, 5.8, 1.95, C.accent1, "trip-note");
  iconCircle(s, "link", 7.1, 5.0, 0.55, C.accent3);
  txt(s, [T("Tích hợp: plan_trip (core/trip.py)", { bold: true, color: "FFFFFF", breakLine: true }), T("chọn ≤ 12 Delivery Point → Knapsack → ma trận Dijkstra → Held-Karp → nối chặng. Không có giải thuật mới, chỉ nối các module (chi tiết ở slide 19).", { fontSize: 14, color: H.accent6 })], { x: 7.8, y: 4.95, w: 4.75, h: 1.7, fontSize: 15 });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút 30 giây.
- Script tools/prepare_osm.py chạy một lần, chỉ dùng thư viện chuẩn, cache dữ liệu thô vào data/raw/.
- Sáu bước: (1) lấy 24 phường giao với khung bản đồ và các way ô tô; (2) độ dài mỗi đoạn bằng haversine; (3) Travel Time = độ dài chia vận tốc, lấy maxspeed nếu có (4.856 way), nếu không thì mặc định theo loại đường, từ 80 km/h cho motorway tới 10 km/h cho living_street; (4) xử lý một chiều: 4.064 way một chiều; (5) Kosaraju giữ thành phần liên thông mạnh lớn nhất, từ 40.266 còn 38.604 đỉnh; (6) đánh lại id và ghi CSV.
- Lý do giữ SCC lớn nhất: bảo đảm mọi truy vấn Route có đáp án và ma trận khoảng cách không có ô vô cực.
- TV1 cũng phụ trách tích hợp: plan_trip nối Knapsack, Dijkstra và Held-Karp; TV4 sẽ trình bày chi tiết ở slide 19. App dùng http.server của thư viện chuẩn và Leaflet đặt sẵn trong repo.
Con số cần nói: 40.266 → 38.604 đỉnh sau khi giữ SCC lớn nhất.`);

  // ===== TV2 =====
  const SEC2 = "TV2 · Định tuyến";
  pres.addSection({ title: SEC2 });

  // 8. APQ + Locator
  s = newSlide("CONTENT", SEC2, "Adaptable Priority Queue và Locator", "TV2 · Định tuyến thời gian thực");
  txt(s, "Binary heap trên mảng A; mỗi phần tử là Locator (key, value, index)", { x: 0.6, y: 1.35, w: 6.6, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  const heap = [["3", "a"], ["5", "c"], ["4", "b"], ["9", "e"], ["7", "d"]];
  heap.forEach(([k, v], j) => {
    const x = 0.6 + j * 1.3;
    card(s, x, 1.95, 1.15, 0.95, j === 1 ? C.accent3 : C.background2, "heap-cell");
    txt(s, [T(`A[${j}]`, { fontSize: 11, color: j === 1 ? "FFFFFF" : MUTED, breakLine: true }), T(`${k} · ${v}`, { fontSize: 16, bold: true, color: j === 1 ? "FFFFFF" : H.accent1 })], { x: x + 0.08, y: 2.0, w: 1.0, h: 0.85, align: "center", valign: "middle" });
  });
  card(s, 0.6, 3.15, 3.3, 0.95, C.accent1, "loc");
  txt(s, [T("loc = Locator(c)", { fontFace: "Courier New", bold: true, color: "FFFFFF", breakLine: true }), T("key = 5, index = 1", { fontFace: "Courier New", color: H.accent6, fontSize: 13 })], { x: 0.75, y: 3.2, w: 3.1, h: 0.85, fontSize: 14, valign: "middle" });
  arrow(s, 4.0, 3.48, 0.55, C.accent3);
  txt(s, "biết ngay ô A[1], không cần tìm", { x: 4.65, y: 3.3, w: 2.6, h: 0.7, fontSize: 14, color: MUTED, valign: "middle" });
  table(s, [[hdr("Thao tác"), hdr("Thời gian")], ["add(k, v) → Locator", "O(log n)"], ["min()", "O(1)"], ["remove_min()", "O(log n)"], ["update(loc, k′): tăng hoặc giảm khóa", "O(log n)"], ["remove(loc)", "O(log n)"]].map((r, i) => i === 0 ? r : [{ text: r[0], options: { fontFace: "Courier New", fontSize: 13 } }, { text: r[1], options: { bold: true, color: H.accent3 } }]),
    { x: 0.6, y: 4.35, w: 6.6, colW: [4.6, 2.0], rowH: 0.4 });
  card(s, 7.6, 1.35, 5.1, 5.4, C.background2, "why");
  iconCircle(s, "light", 7.8, 1.55, 0.6, C.accent2, true);
  txt(s, "Vì sao Locator mà không dùng dict?", { x: 8.55, y: 1.55, w: 4.0, h: 0.6, fontSize: 17, bold: true, color: C.text2, valign: "middle" });
  txt(s, bullets([
    "update ở giữa heap cần biết phần tử đang ở ô nào; quét mảng là O(n), mất ưu điểm decrease-key",
    "Cách thường gặp là hash map phần tử → vị trí, nhưng đề cấm dict trong lõi",
    "Locator giữ index của chính nó; mọi lần dời phần tử đều cập nhật index",
    [T("Invariant I2: "), T("A[j].index = j", { fontFace: "Courier New", bold: true }), T(". Kiểm tra stale Locator trong O(1): 0 ≤ idx < n và A[idx] is loc, sai thì ValueError")],
  ], { fontSize: 15 }), { x: 7.85, y: 2.35, w: 4.65, h: 4.25 });
  s.addNotes(`Người trình bày: TV2. Khoảng 1 phút 30 giây.
- Adaptable Priority Queue là binary heap trên mảng. Khác heap thường ở hai thao tác update(loc, k′) và remove(loc) tác động vào phần tử nằm giữa heap.
- Muốn sửa một phần tử ở giữa heap thì phải biết nó đang ở ô nào. Quét mảng là O(n). Cách phổ biến là thêm hash map từ phần tử sang vị trí, nhưng đề cấm dict trong lõi.
- Locator giải quyết điều đó: add trả về một Locator chứa key, value và index. Mỗi lần upheap/downheap dời phần tử thì cập nhật index ngay. Hai Invariant: I1 heap order, I2 A[j].index = j.
- Từ I2, kiểm tra Locator hợp lệ trong O(1): index nằm trong khoảng và A[index] chính là loc. Locator đã bị lấy ra có index = −1 nên update sẽ báo ValueError.
- Mọi thao tác thay đổi là O(log n) vì chiều cao heap là ⌊log₂ n⌋.
Câu cần nói: "Locator thay hash map: vị trí nằm ngay trong đối tượng mà người gọi đang giữ."`);

  // 9. Dijkstra variants
  s = newSlide("CONTENT", SEC2, "Dijkstra: ba biến thể và Bellman-Ford", "TV2 · Định tuyến thời gian thực");
  table(s, [[hdr("Biến thể"), hdr("Thời gian"), hdr("Cỡ hàng đợi"), hdr("Vai trò")],
    ["Dijkstra + Adaptable PQ", "O((V+E) log V)", "≤ V", "lõi, dùng trong demo"],
    ["Dijkstra + lazy heap", "O(E log E)", "≤ E + 1", "baseline, đẩy bản sao thay cho decrease-key"],
    ["Dijkstra + mảng", "O(V²)", "—", "baseline cơ bản theo đề"],
    ["Bellman-Ford (dừng sớm)", "O(VE)", "—", "lời giải đối chứng trong test"],
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: j === 0 || j === 1, color: j === 1 ? H.accent3 : j === 0 ? H.accent1 : H.dk1, fill: { color: i === 1 ? "E7F3F2" : "FFFFFF" } } }))),
    { x: 0.6, y: 1.4, w: 12.1, colW: [3.2, 2.4, 1.9, 4.6], rowH: 0.5 });
  const dj = [
    ["check", "Greedy choice", "Với w ≥ 0, khi u được lấy ra khỏi hàng đợi thì dist[u] = δ(s, u). Giả thiết w ≥ 0 được chặn ở biên dữ liệu: add_edge, set_travel_time từ chối giá trị âm và NaN."],
    ["filter", "Dừng sớm tại t", "Chỉ cần Route s → t thì dừng khi t được lấy ra; chuỗi parent_edge chỉ đi qua đỉnh đã chốt nên Route dựng lại là chính xác."],
    ["scale", "Khi nào dùng biến thể nào", "Mạng đường E = O(V): hai biến thể heap đều O(V log V). Đồ thị dày E = Θ(V²): bản mảng O(V²) tốt hơn về lý thuyết. APQ và lazy khác nhau ở hằng số và bộ nhớ."],
  ];
  dj.forEach(([ic, h, d], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 4.25, 3.8, 2.5, C.background2, "dj-" + i);
    iconCircle(s, ic, x + 0.2, 4.45, 0.55, i === 2 ? C.accent3 : C.accent1);
    txt(s, h, { x: x + 0.9, y: 4.45, w: 2.8, h: 0.55, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
    txt(s, d, { x: x + 0.2, y: 5.12, w: 3.45, h: 1.55, fontSize: 14 });
  });
  s.addNotes(`Người trình bày: TV2. Khoảng 1 phút 15 giây.
- Ba biến thể Dijkstra chỉ khác nhau ở cách chọn đỉnh có dist nhỏ nhất. Bản Adaptable: mỗi đỉnh vào heap tối đa một lần, tối đa E lần update, heap không quá V phần tử: O((V+E) log V), bộ nhớ O(V).
- Bản lazy: không có decrease-key, mỗi lần nới lỏng thành công đẩy thêm một bản sao, lấy ra bản cũ thì bỏ qua. Heap có thể tới E+1 phần tử. Bản mảng quét toàn bộ dist mỗi vòng: O(V²).
- Bellman-Ford O(VE) là lời giải đối chứng độc lập: không dựa vào thứ tự chốt tham lam, nên được dùng để kiểm tra chéo cả ba biến thể.
- Tính đúng: bổ đề greedy choice, chỉ dùng giả thiết w ≥ 0 ở một bước; vì vậy trọng số âm bị chặn ngay khi nhập dữ liệu, Closure dùng cờ chứ không dùng trọng số đặc biệt.
Câu cần nói: "Lý thuyết không phân thắng thua giữa APQ và lazy heap trên mạng đường; khác biệt nằm ở hằng số và bộ nhớ, slide 11–12 sẽ đo điều này."`);

  // 10. Reroute
  s = newSlide("CONTENT", SEC2, "Reroute: khi nào không cần tính lại", "TV2 · Định tuyến thời gian thực");
  card(s, 0.6, 1.4, 6.7, 2.25, C.accent1, "lemma");
  txt(s, [T("Bổ đề (quy tắc bỏ qua)", { bold: true, color: H.accent2, breakLine: true }),
    T("R là Route tối ưu từ vị trí xe a tới đích t theo w. Nếu w′ chỉ khác w tại một Road Segment e ∉ R và w′(e) ≥ w(e) (Closure: w′(e) = ∞) thì R vẫn tối ưu theo w′.", { color: "FFFFFF", breakLine: true }),
    T("Chứng minh: c′(R) = c(R) ≤ c(P) ≤ c′(P) với mọi đường P từ a tới t.", { color: H.accent6, fontSize: 14 })],
  { x: 0.85, y: 1.55, w: 6.25, h: 2.0, fontSize: 16 });
  // flow
  card(s, 0.6, 3.95, 2.0, 1.0, C.background2, "f1");
  txt(s, "Traffic Incident trên e", { x: 0.7, y: 3.95, w: 1.8, h: 1.0, fontSize: 14, bold: true, align: "center", valign: "middle", color: C.text2 });
  arrow(s, 2.7, 4.31, 0.35);
  s.addShape(pres.shapes.DIAMOND, { x: 3.15, y: 3.75, w: 1.9, h: 1.4, fill: { color: C.background2 }, line: { color: H.accent3, width: 1.5 }, objectName: "decision" });
  txt(s, "on_route[e] = 0 và chỉ tăng?", { x: 3.35, y: 4.05, w: 1.5, h: 0.8, fontSize: 12, bold: true, align: "center", valign: "middle", color: C.text2 });
  arrow(s, 5.15, 4.0, 0.35, C.accent3);
  txt(s, "có", { x: 5.15, y: 3.65, w: 0.4, h: 0.3, fontSize: 12, color: C.accent3, bold: true });
  card(s, 5.6, 3.78, 1.7, 0.7, "E7F3F2", "keep");
  txt(s, "giữ R, O(L)", { x: 5.65, y: 3.78, w: 1.6, h: 0.7, fontSize: 14, bold: true, color: C.accent3, align: "center", valign: "middle" });
  arrow(s, 5.15, 4.75, 0.35, C.accent5);
  txt(s, "không", { x: 5.05, y: 5.05, w: 0.6, h: 0.3, fontSize: 12, color: C.accent5, bold: true });
  card(s, 5.6, 4.55, 1.7, 0.7, "F9E3DD", "recompute");
  txt(s, "Dijkstra từ a", { x: 5.65, y: 4.55, w: 1.6, h: 0.7, fontSize: 14, bold: true, color: C.accent5, align: "center", valign: "middle" });
  txt(s, "Sự cố trên R, hoặc Travel Time ngoài R giảm: không có bảo đảm, nên chạy lại Dijkstra từ vị trí xe (cách bảo thủ).", { x: 0.6, y: 5.55, w: 6.7, h: 0.8, fontSize: 14, color: MUTED });
  // stats
  card(s, 7.7, 1.4, 5.0, 5.35, C.background2, "stats");
  iconCircle(s, "clock", 7.95, 1.65, 0.6, C.accent3);
  txt(s, "Trên bản đồ thật 38.604 Intersection", { x: 8.7, y: 1.65, w: 3.85, h: 0.6, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
  stat(s, 7.95, 2.45, 4.5, "0,4 ms", "sự cố ngoài tuyến: chỉ kiểm tra mặt nạ on_route", C.accent3, 54);
  stat(s, 7.95, 4.05, 4.5, "≈ 110 ms", "sự cố trên tuyến: chạy lại Dijkstra từ vị trí xe", C.accent5, 54);
  txt(s, "Số đo từ thao tác trên demo, chưa phải trung vị nhiều lần.", { x: 7.95, y: 5.95, w: 4.5, h: 0.6, fontSize: 13, color: MUTED, italic: true });
  s.addNotes(`Người trình bày: TV2. Khoảng 1 phút 30 giây.
- Router giữ Route hiện tại R và một mặt nạ bytearray on_route[e]. Khi có Traffic Incident trên cạnh e lúc xe đang ở a: cắt phần đã đi, ghi nhận sự cố có phải loại chỉ tăng không, cập nhật đồ thị, rồi quyết định.
- Bổ đề: nếu e không thuộc R và Travel Time chỉ tăng (hoặc Closure) thì R vẫn tối ưu. Chứng minh một dòng: chi phí của R không đổi, chi phí mọi đường khác chỉ tăng hoặc giữ nguyên.
- Hai trường hợp không có bảo đảm: sự cố trên chính R, hoặc Travel Time ngoài R giảm. Khi đó chạy lại Dijkstra từ vị trí xe.
- Chi phí: kiểm tra e ∈ R là O(1); bỏ qua tốn O(L) để cắt hậu tố; tính lại là O((V+E) log V).
- Trên bản đồ thật: 0,4 ms so với khoảng 110 ms, chênh hơn hai bậc. Lưu ý trung thực: số này đo từ demo, chưa lặp nhiều lần.
Con số cần nói: 0,4 ms so với khoảng 110 ms.`);

  // 11. SSSP line chart
  s = newSlide("CONTENT", SEC2, "SSSP: thời gian theo V trên đồ thị dạng mạng đường", "TV2 · Kết quả đo (sssp.csv, sssp_osm.csv)");
  const SZ = [1000, 2500, 5000, 10000, 20000, 50000];
  const Vlab = SZ.map((z) => Number(sssp.find((r) => Number(r.size) === z).n).toLocaleString("de-DE"));
  const ms = (r) => r3(Number(r.time_s) * 1000);
  const mainSeries = [
    { name: "Adaptable PQ", labels: Vlab, values: pick(sssp, "adaptable", SZ, ms) },
    { name: "Lazy heap", labels: Vlab, values: pick(sssp, "lazy", SZ, ms) },
    { name: "Mảng O(V²)", labels: Vlab, values: pick(sssp, "array", SZ, ms) },
    { name: "Bellman-Ford", labels: Vlab, values: pick(sssp, "bellman_ford", SZ, ms) },
  ];
  const refSeries = [{ name: "heapq (C, tham chiếu)", labels: Vlab, values: pick(sssp, "heapq_C", SZ, ms) }];
  s.addChart([
    { type: pres.charts.LINE, data: mainSeries, options: { chartColors: [H.accent3, H.accent2, H.accent5, H.accent1], lineSize: 2.25, lineDataSymbol: "circle", lineDataSymbolSize: 7 } },
    { type: pres.charts.LINE, data: refSeries, options: { chartColors: [H.accent4], lineSize: 1.5, lineDash: "sysDash", lineDataSymbol: "none" } },
  ], chartStyle({
    x: 0.6, y: 1.4, w: 7.6, h: 5.35, title: "Thời gian một nguồn (ms, thang log), E ≈ 5V",
    valAxisLogScaleBase: 10, valAxisTitle: "ms (log)", catAxisTitle: "V", displayBlanksAs: "gap", valAxisMinVal: 1,
  }));
  const osmRow = (v) => osm.find((r) => r.variant === v);
  const osmMs = (v) => { const t = num(osmRow(v).time_s); return t === null ? "timeout" : (t * 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " ms"; };
  txt(s, "Bản đồ thật: 38.604 đỉnh, 69.411 cạnh", { x: 8.6, y: 1.4, w: 4.1, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  table(s, [[hdr("Biến thể"), hdr("Thời gian")],
    ["Adaptable PQ", osmMs("adaptable")], ["Lazy heap", osmMs("lazy")], ["heapq (C)", osmMs("heapq_C")], ["Mảng O(V²)", "> 120 s"], ["Bellman-Ford", osmMs("bellman_ford")]]
    .map((r, i) => i === 0 ? r : [{ text: r[0], options: { color: i === 3 ? H.accent4 : H.dk1 } }, { text: r[1], options: { bold: true, align: "right", color: i === 4 ? H.accent5 : H.accent1 } }]),
  { x: 8.6, y: 1.9, w: 4.1, colW: [2.2, 1.9], rowH: 0.4 });
  txt(s, bullets([
    [T("Mảng chậm hơn 146 lần", { bold: true }), T(" ở V = 10.000 (5,14 s so với 35 ms)")],
    [T("Bellman-Ford chậm hơn 13 lần", { bold: true }), T(" ở V = 10.000, 26 lần trên bản đồ thật")],
    [T("heapq nhanh hơn 2,6–3,2 lần", { bold: true }), T(": hằng số của mã C, cùng độ dốc")],
  ], { fontSize: 14 }), { x: 8.6, y: 4.5, w: 4.1, h: 2.25 });
  s.addNotes(`Người trình bày: TV2. Khoảng 1 phút 30 giây.
- Đồ thị dạng mạng đường: lưới lệch ngẫu nhiên, E ≈ 5V, V từ 961 đến 49.729. Trục dọc thang log.
- Hai đường Adaptable và lazy gần như trùng nhau và tăng tuyến tính theo V, khớp với O((V+E) log V) khi E = O(V).
- Baseline: bản mảng O(V²) chậm hơn 146 lần ở V = 10.000 (5,14 s so với 35 ms) và quá 120 giây trên bản đồ thật. Bellman-Ford dừng sớm chậm hơn 13 lần ở 10.000 đỉnh và 26 lần trên bản đồ thật; không tệ tới O(VE) vì số vòng chỉ bằng số cạnh của đường ngắn nhất dài nhất.
- heapq viết bằng C chỉ là đường tham chiếu nét đứt: nhanh hơn heap Python 2,6–3,2 lần nhưng cùng độ dốc. Đó là hằng số của trình thông dịch, không phải khác biệt giải thuật. Lõi không được dùng heapq.
- Bảng bên phải: bản đồ thật, Adaptable 115 ms, lazy 94,5 ms.
Con số cần nói: 146 lần (mảng) và 115 ms trên bản đồ thật.`);

  // 12. Heap peak bar chart
  s = newSlide("CHART", SEC2, "APQ chỉ thắng khi decrease-key xảy ra nhiều", "TV2 · Kết quả đo (sssp.csv, sssp_dense.csv)");
  const hp = (rows, v, z) => Number(rows.find((r) => r.variant === v && Number(r.size) === z).heap_peak);
  const cats = ["Mạng đường, V = 49.729", "Đồ thị dày, V = 2.000"];
  s.addChart(pres.charts.BAR, [
    { name: "Adaptable PQ", labels: cats, values: [hp(sssp, "adaptable", 50000), hp(dense, "adaptable", 2000)] },
    { name: "Lazy heap", labels: cats, values: [hp(sssp, "lazy", 50000), hp(dense, "lazy", 2000)] },
  ], chartStyle({
    placeholder: "chart", barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: [H.accent3, H.accent2], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "General",
    title: "Kích thước heap lớn nhất (số phần tử)", valAxisTitle: "phần tử", showCatAxisTitle: false,
  }));
  s.addText([
    T("Mạng đường", { bold: true, color: H.accent1, breakLine: true }),
    T("Frontier của Dijkstra là một dải mỏng: heap chỉ dưới 1,5% số đỉnh. Locator tốn bộ nhớ gấp 2,5 lần (5.099 so với 1.989 KB), chậm hơn 5–20%.", { breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("Đồ thị dày, E ≈ 10⁶", { bold: true, color: H.accent1, breakLine: true }),
    T("Mỗi đỉnh có V/4 cạnh vào: lazy heap lớn gấp 4,4 lần, 747 so với 269 KB; APQ nhanh hơn 16%.", { breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("Lợi ích của Locator phụ thuộc tỉ lệ decrease-key trên số đỉnh, không phải lúc nào cũng có.", { bold: true, color: H.accent3 }),
  ], { placeholder: "body" });
  s.addNotes(`Người trình bày: TV2. Khoảng 1 phút 15 giây.
- Đây là kết quả nhóm muốn trình bày trung thực: Adaptable PQ không phải lúc nào cũng tốt hơn.
- Trên mạng đường V = 49.729: lazy heap lớn nhất chỉ 691 phần tử, APQ 462. Về lý thuyết lazy có thể tới E phần tử, nhưng đồ thị đường bộ gần phẳng, bậc nhỏ, nên ít bản sao trùng. Trong khi đó mỗi đỉnh chạm tới cần một Locator, nên APQ tốn bộ nhớ gấp khoảng 2,5 lần và chậm hơn 5–20%.
- Trên đồ thị dày V = 2.000, E gần 1 triệu: decrease-key xảy ra liên tục, lazy heap lên 8.737 phần tử so với 1.974 (gấp 4,4), bộ nhớ 747 so với 269 KB, APQ nhanh hơn 16% (123,6 so với 146,6 ms).
- Kết luận: chọn cấu trúc theo tỉ lệ decrease-key của dữ liệu thật, không chỉ theo cận Big-O.
Con số cần nói: 462 so với 691 trên mạng đường; 1.974 so với 8.737 trên đồ thị dày.`);

  // ===== TV3 =====
  const SEC3 = "TV3 · Union-Find và mạng lưới kho";
  pres.addSection({ title: SEC3 });

  // 13. Union-Find
  s = newSlide("CONTENT", SEC3, "Union-Find: union by rank và path compression", "TV3 · Quy hoạch mạng lưới kho");
  // trees diagram
  function node(x, y, label, fill) {
    s.addShape(pres.shapes.OVAL, { x, y, w: 0.5, h: 0.5, fill: { color: fill }, line: { type: "none" }, objectName: "uf-node" });
    txt(s, label, { x, y, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  }
  function edge(x1, y1, x2, y2) {
    s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, line: { color: H.accent4, width: 1.5 }, objectName: "uf-edge" });
  }
  card(s, 0.6, 1.4, 6.3, 3.05, C.background2, "uf-diagram");
  txt(s, "find(x) trước khi nén", { x: 0.8, y: 1.5, w: 2.8, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
  txt(s, "sau khi nén: trỏ thẳng về gốc", { x: 3.8, y: 1.5, w: 3.0, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
  // before: chain r - a - b - x
  const bx = 1.8;
  [[bx, 1.95, "r"], [bx, 2.55, "a"], [bx, 3.15, "b"], [bx, 3.75, "x"]].forEach(([x, y, l], i) => { if (i) edge(x + 0.25, y - 0.1, x + 0.25, y); node(x, y, l, i === 3 ? H.accent2 : i === 0 ? H.accent1 : H.accent3); });
  arrow(s, 3.05, 2.9, 0.55, C.accent4);
  // after: r with children a b x
  edge(5.05, 2.45, 4.25, 3.15); edge(5.05, 2.45, 5.05, 3.15); edge(5.05, 2.45, 5.85, 3.15);
  node(4.8, 1.95, "r", H.accent1); node(4.0, 3.15, "a", H.accent3); node(4.8, 3.15, "b", H.accent3); node(5.6, 3.15, "x", H.accent2);
  txt(s, "find viết dạng lặp hai lượt: không phụ thuộc giới hạn đệ quy 1000 tầng của Python", { x: 3.8, y: 3.75, w: 3.0, h: 0.65, fontSize: 12, color: MUTED });
  table(s, [[hdr("Biến thể"), hdr("Find / Union")], ["Quick-Find (mảng nhãn)", "O(1) / Θ(n)"], ["Không tối ưu", "O(n)"], ["Chỉ union by rank", "O(log n)"], ["Chỉ path compression", "O(log n) khấu hao"], ["Cả hai", "O(α(n)) khấu hao"]]
    .map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { bold: i === 5, color: i === 5 ? H.accent3 : H.dk1, fill: { color: i === 5 ? "E7F3F2" : "FFFFFF" } } }))),
  { x: 0.6, y: 4.65, w: 6.3, colW: [3.5, 2.8], rowH: 0.35 });
  card(s, 7.3, 1.4, 5.4, 2.65, C.accent1, "lemma-rank");
  txt(s, [T("Bổ đề: gốc có rank r thì tập có ≥ 2ʳ phần tử", { bold: true, color: H.accent2, breakLine: true }),
    T("Rank chỉ tăng r → r+1 khi hợp hai gốc cùng rank r, mỗi tập đã có ≥ 2ʳ phần tử (quy nạp). Suy ra rank ≤ ⌊log₂ n⌋, chiều cao cây ≤ log₂ n; rank vừa một byte (bytearray).", { color: "FFFFFF" })],
  { x: 7.55, y: 1.55, w: 4.95, h: 2.4, fontSize: 15 });
  card(s, 7.3, 4.3, 5.4, 2.45, C.background2, "tarjan");
  txt(s, [T("Tarjan (1975): m thao tác tốn O(n + m·α(n))", { bold: true, color: H.accent1, breakLine: true }),
    T("A₃(1) = 2047, A₄(1) > 2²⁰⁴⁸ ≫ 10⁸⁰, nên α(n) ≤ 4 với mọi n thực tế. α(n) vẫn tiến ra vô cùng, chỉ là rất chậm.", { breakLine: true }),
    T("Giới hạn: không xóa được cạnh; sau Closure thì dựng lại, O(V + E·α(V)), dưới 0,1 s.", { color: MUTED, fontSize: 14 })],
  { x: 7.55, y: 4.45, w: 4.95, h: 2.2, fontSize: 15 });
  s.addNotes(`Người trình bày: TV3. Khoảng 1 phút 30 giây.
- Disjoint Set là rừng cây hướng về gốc: mảng parent và rank (bytearray). Hai tối ưu: union by rank gắn cây thấp dưới cây cao; path compression cho mọi nút trên đường find trỏ thẳng về gốc.
- find viết dạng lặp hai lượt: lượt 1 tìm gốc, lượt 2 nén đường. Kết quả giống bản đệ quy nhưng không vướng giới hạn đệ quy của Python, cần thiết vì bản không tối ưu có thể suy biến thành chuỗi dài n−1.
- Bổ đề: gốc rank r có ít nhất 2ʳ phần tử, chứng minh quy nạp: rank chỉ tăng khi hợp hai gốc cùng rank. Suy ra rank và chiều cao không vượt log₂ n.
- Định lý Tarjan: dùng cả hai tối ưu thì m thao tác tốn O(n + m·α(n)). A₄(1) lớn hơn 2²⁰⁴⁸, nên α(n) ≤ 4 với mọi n thực tế.
- Giới hạn: Union-Find không tách tập được. Khi có Closure, nhóm dựng lại từ đầu, khoảng 10⁵ thao tác, dưới 0,1 giây.
Câu cần nói: "rank r ⇒ ít nhất 2ʳ phần tử ⇒ chiều cao ≤ log₂ n; thêm path compression thì còn α(n) ≤ 4."`);

  // 14. DSU chart
  s = newSlide("CHART", SEC3, "Số bước mỗi thao tác gần như hằng số", "TV3 · Kết quả đo (dsu.csv)");
  const DZ = [1000, 10000, 100000, 1000000];
  const spo = (r) => Number((Number(r.steps) / Number(r.ops)).toFixed(2));
  const dlab = ["10³", "10⁴", "10⁵", "10⁶"];
  s.addChart(pres.charts.LINE, [
    { name: "Rank + path compression", labels: dlab, values: pick(dsu, "both", DZ, spo) },
    { name: "Chỉ union by rank", labels: dlab, values: pick(dsu, "rank", DZ, spo) },
    { name: "Chỉ path compression", labels: dlab, values: pick(dsu, "compress", DZ, spo) },
    { name: "Không tối ưu", labels: dlab, values: pick(dsu, "naive", DZ, spo) },
    { name: "Quick-Find (lần ghi nhãn)", labels: dlab, values: pick(dsu, "quickfind", DZ, spo) },
  ], chartStyle({
    placeholder: "chart", chartColors: [H.accent3, H.accent1, H.accent2, H.accent5, H.accent4],
    lineSize: 2.25, lineDataSymbol: "circle", lineDataSymbolSize: 7, displayBlanksAs: "gap",
    valAxisLogScaleBase: 10, valAxisMinVal: 1, title: "Bước duyệt parent trên một thao tác (thang log), n union + n find",
    valAxisTitle: "bước / thao tác (log)", catAxisTitle: "n",
  }));
  s.addText([
    T("1,17 – 1,19", { bold: true, color: H.accent3, fontSize: 32, fontFace: "Cambria", breakLine: true }),
    T("bước mỗi thao tác khi bật cả hai tối ưu, trong khi n tăng 1000 lần", { color: MUTED, breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("1,68 s cho 2·10⁶ thao tác, tức 0,84 µs mỗi thao tác.", { breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("Chỉ path compression tăng chậm, đúng cận O(log n) khấu hao; bản không tối ưu quá 120 s ở n = 10⁵.", { breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("Quick-Find mất 3,8 s ở n = 10⁴, chậm hơn 340 lần.", { bold: true, color: H.accent5 }),
  ], { placeholder: "body" });
  s.addNotes(`Người trình bày: TV3. Khoảng 1 phút.
- Benchmark: n phép union ngẫu nhiên, mỗi phép kèm một find, tức 2n thao tác; đếm số bước đi theo con trỏ parent.
- Bật cả hai tối ưu: 1,17 đến 1,19 bước mỗi thao tác từ n = 10³ đến 10⁶. Đây là minh chứng thực nghiệm cho cận O(α(n)).
- Chỉ path compression: tăng chậm từ 1,93 lên 2,80, khớp O(log n) khấu hao. Chỉ union by rank: ổn định quanh 1,7 vì chiều cao bị chặn bởi log n nhưng không giảm.
- Bản không tối ưu tăng gần tuyến tính và quá 120 giây ở n = 10⁵. Quick-Find mỗi union phải đổi nhãn tới n phần tử: 3,8 giây ở n = 10⁴, chậm hơn bản tối ưu 340 lần.
Con số cần nói: khoảng 1,18 bước mỗi thao tác, không đổi khi n tăng 1000 lần.`);

  // 15. Kruskal backbone
  s = newSlide("CONTENT", SEC3, "Kruskal: Backbone giữa 24 Hub", "TV3 · Quy hoạch mạng lưới kho");
  card(s, 0.6, 1.4, 5.6, 2.0, C.accent1, "cut");
  txt(s, [T("Cut property", { bold: true, color: H.accent2, breakLine: true }),
    T("Cạnh nhẹ nhất đi qua một lát cắt không bị tập cạnh đã chọn cắt ngang luôn nằm trong một cây khung nhỏ nhất. Kruskal nhận cạnh theo thứ tự tăng dần khi Union trả về true.", { color: "FFFFFF" })],
  { x: 0.85, y: 1.55, w: 5.15, h: 1.75, fontSize: 15 });
  const bb = [
    ["hub", "24 Hub", "mỗi phường một Hub, Intersection gần trọng tâm phường nhất"],
    ["scale", "w = (dᵢⱼ + dⱼᵢ) / 2", "D bất đối xứng do đường một chiều; MST chỉ định nghĩa trên đồ thị vô hướng"],
    ["tree", "276 cạnh → 23 tuyến", "hub_backbone gọi kruskal_mst, O(H² log H); Prim mảng chỉ là oracle trong test"],
  ];
  bb.forEach(([ic, h, d], i) => {
    const y = 3.65 + i * 1.03;
    iconCircle(s, ic, 0.6, y + 0.08, 0.6, i === 2 ? C.accent3 : C.accent1);
    txt(s, [T(h, { bold: true, color: H.accent1, breakLine: true }), T(d, { fontSize: 14, color: MUTED })], { x: 1.4, y, w: 4.8, h: 0.95, fontSize: 16, valign: "middle" });
  });
  const MZ = [50, 100, 200, 400];
  s.addChart(pres.charts.BAR, [
    { name: "Kruskal (sort C + Union-Find)", labels: MZ.map(String), values: pick(mstD, "kruskal", MZ, (r) => Number((Number(r.time_s) * 1000).toFixed(1))) },
    { name: "Prim mảng O(V²)", labels: MZ.map(String), values: pick(mstD, "prim_array", MZ, (r) => Number((Number(r.time_s) * 1000).toFixed(1))) },
  ], chartStyle({
    x: 6.6, y: 1.4, w: 6.1, h: 4.15, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: [H.accent3, H.accent4], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "General",
    title: "MST trên đồ thị Hub đầy đủ (ms)", valAxisTitle: "ms", catAxisTitle: "số Hub",
  }));
  card(s, 6.6, 5.75, 6.1, 1.0, C.background2, "mst-msg");
  txt(s, [T("Kruskal nhanh hơn khoảng 2 lần ", { bold: true, color: H.accent3 }), T("(24,5 so với 48,0 ms ở 400 Hub) dù Big-O dự đoán ngược lại: sort chạy bằng C, vòng O(V²) của Prim là Python thuần.")], { x: 6.8, y: 5.8, w: 5.75, h: 0.9, fontSize: 14, valign: "middle" });
  s.addNotes(`Người trình bày: TV3. Khoảng 1 phút 30 giây.
- Tính đúng của Kruskal dựa trên cut property: cạnh nhẹ nhất qua một lát cắt không bị tập đã chọn cắt ngang luôn thuộc một MST. Kruskal duyệt cạnh tăng dần, nhận cạnh khi hai đầu ở hai tập khác nhau, tức Union trả về true.
- Backbone: mỗi phường một Hub, 24 Hub. Chi phí giữa hai Hub lấy từ ma trận Travel Time bằng 24 lần Dijkstra. Ma trận bất đối xứng vì đường một chiều, mà MST chỉ định nghĩa trên đồ thị vô hướng, nên trọng số là trung bình hai chiều. Đồ thị có 276 cạnh, cây có 23 tuyến.
- hub_backbone gọi kruskal_mst. Prim mảng được giữ làm lời giải đối chiếu trong test.
- Kết quả đáng chú ý: trên đồ thị đầy đủ, Big-O dự đoán Prim O(V²) thắng Kruskal O(V² log V), nhưng đo được Kruskal nhanh hơn khoảng 2 lần, vì list.sort viết bằng C còn vòng lặp của Prim chạy trong trình thông dịch. Với vài trăm Hub, log V ≈ 9 nhỏ hơn chênh lệch hằng số giữa C và Python.
- Trên đồ thị thưa 49.729 đỉnh, Kruskal mất 268 ms; Prim mảng quá thời gian từ 10.000 đỉnh.
Con số cần nói: 24,5 so với 48,0 ms ở 400 Hub.`);

  // 16. Clustering + ward connectivity
  s = newSlide("CONTENT", SEC3, "Phân cụm và liên thông theo phường", "TV3 · Quy hoạch mạng lưới kho");
  card(s, 0.6, 1.4, 5.3, 2.7, C.background2, "cluster");
  iconCircle(s, "group", 0.8, 1.6, 0.6, C.accent3);
  txt(s, "Single-linkage = Kruskal dừng ở k tập", { x: 1.55, y: 1.6, w: 4.2, h: 0.6, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  txt(s, bullets([
    "400 Parcel → đồ thị đầy đủ 79.800 cạnh, trọng số haversine",
    "k cụm = bỏ k − 1 cạnh nặng nhất của MST; khoảng cách nhỏ nhất giữa hai cụm là lớn nhất trong mọi phân hoạch k cụm",
  ], { fontSize: 14 }), { x: 0.8, y: 2.35, w: 4.95, h: 1.7 });
  card(s, 0.6, 4.3, 5.3, 1.25, "FDF1DE", "chaining");
  iconCircle(s, "warn", 0.8, 4.5, 0.55, C.accent2, true);
  txt(s, "Chaining: Parcel rải đều cho một cụm khổng lồ và vài cụm nhỏ ở rìa, nên demo sinh Parcel quanh 6 điểm nóng.", { x: 1.5, y: 4.35, w: 4.25, h: 1.15, fontSize: 14, valign: "middle" });
  txt(s, "2 / 24", { x: 0.6, y: 5.7, w: 2.2, h: 0.9, fontSize: 44, bold: true, color: C.accent3, fontFace: "Cambria", valign: "middle" });
  txt(s, "phường liên thông chỉ bằng đường nội bộ: Bồ Đề và Hoàn Kiếm", { x: 2.85, y: 5.75, w: 3.05, h: 0.85, fontSize: 14, color: MUTED, valign: "middle" });
  const wards = [["Bồ Đề", 1], ["Hoàn Kiếm", 1], ["Kim Liên", 2], ["Thanh Xuân", 2], ["Thanh Liệt", 3], ["Phương Liệt", 4], ["Cửa Nam", 5], ["Yên Hòa", 5], ["Tương Mai", 6], ["Đống Đa", 7], ["Vĩnh Tuy", 7], ["Khương Đình", 7], ["Hai Bà Trưng", 8], ["Láng", 8], ["Ba Đình", 9], ["Cầu Giấy", 9], ["Tây Hồ", 10], ["Nghĩa Đô", 10], ["Ô Chợ Dừa", 11], ["Văn Miếu - QTG", 12], ["Bạch Mai", 12], ["Giảng Võ", 17], ["Ngọc Hà", 17], ["Hồng Hà", 22]];
  s.addChart(pres.charts.BAR, [{ name: "Số thành phần", labels: wards.map((w) => w[0]), values: wards.map((w) => w[1]) }], chartStyle({
    x: 6.3, y: 1.35, w: 6.4, h: 5.45, barDir: "bar", barGapWidthPct: 35, catAxisOrientation: "maxMin",
    chartColors: wards.map((w) => (w[1] === 1 ? H.accent3 : H.accent4)), showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "General",
    showLegend: false, title: "Số thành phần liên thông dùng đường nội bộ phường", catAxisLabelFontSize: 11, dataLabelFontSize: 10,
    showValAxisTitle: false, showCatAxisTitle: false, valAxisHidden: true, valGridLine: { style: "none" },
  }));
  s.addNotes(`Người trình bày: TV3. Khoảng 1 phút 30 giây.
- Phân cụm giao hàng là Kruskal dừng khi còn k tập. Gower và Ross chỉ ra đây chính là single-linkage: k cụm trùng với các thành phần còn lại khi bỏ k−1 cạnh nặng nhất của MST, và phân hoạch này làm khoảng cách nhỏ nhất giữa hai cụm lớn nhất.
- Demo: 400 Parcel tạo đồ thị đầy đủ 79.800 cạnh theo khoảng cách haversine.
- Giới hạn chaining: single-linkage hợp hai cụm chỉ dựa vào cặp điểm gần nhất, nên Parcel rải đều sẽ thành một cụm khổng lồ. Vì vậy demo sinh Parcel quanh 6 điểm nóng.
- Liên thông theo phường (R5): một Disjoint Set chung, chỉ hợp các Road Segment có hai đầu cùng phường. Kết quả: chỉ Bồ Đề và Hoàn Kiếm liên thông nội bộ; các phường còn lại tách 2 tới 22 mảnh, ví dụ Thanh Liệt thành phần lớn nhất chỉ 1.003 trên 1.691 Intersection.
- Ý nghĩa: ranh giới phường cắt ngang mạng đường; Hub của một phường không phục vụ trọn phường nếu chỉ đi đường nội bộ. Toàn mạng vẫn liên thông mạnh nên các mảnh luôn nối được qua phường bên cạnh.
Con số cần nói: chỉ 2 trên 24 phường liên thông bằng đường của chính mình.`);

  // ===== TV4 =====
  const SEC4 = "TV4 · Knapsack và Held-Karp";
  pres.addSection({ title: SEC4 });

  // 17. Knapsack
  s = newSlide("CONTENT", SEC4, "0/1 Knapsack: quy hoạch động và nhánh cận", "TV4 · Tối ưu xếp hàng lên xe");
  card(s, 0.6, 1.4, 6.2, 1.9, C.accent1, "recurrence");
  txt(s, [T("Công thức truy hồi, B[i][c] = cước lớn nhất với i Parcel đầu, tải c", { color: H.accent6, fontSize: 14, breakLine: true }),
    T("B[i][c] = B[i−1][c]  nếu wᵢ > c", { fontFace: "Cambria", color: "FFFFFF", breakLine: true }),
    T("B[i][c] = max(B[i−1][c], B[i−1][c−wᵢ] + vᵢ)", { fontFace: "Cambria", color: "FFFFFF" })],
  { x: 0.85, y: 1.5, w: 5.8, h: 1.7, fontSize: 18, valign: "middle" });
  const kn = [
    ["list", "Pseudo-polynomial O(nW)", "W là một giá trị, mã hóa bằng log W bit: nW = n·2^(log₂ W), hàm mũ theo độ dài input"],
    ["filter", "Branch-and-bound", "Cận trên = Knapsack phân số trên phần còn lại (tham lam theo vᵢ/wᵢ); cắt nhánh khi cận ≤ nghiệm tốt nhất. Xấu nhất vẫn O(n·2ⁿ)"],
  ];
  kn.forEach(([ic, h, d], i) => {
    const y = 3.55 + i * 1.6;
    card(s, 0.6, y, 6.2, 1.4, C.background2, "kn-" + i);
    iconCircle(s, ic, 0.8, y + 0.2, 0.55, C.accent1);
    txt(s, [T(h, { bold: true, color: H.accent1, breakLine: true }), T(d, { fontSize: 14 })], { x: 1.5, y: y + 0.1, w: 5.15, h: 1.2, fontSize: 16, valign: "middle" });
  });
  const KZ = [100, 1000, 5000];
  s.addChart(pres.charts.BAR, [
    { name: "DP O(nW)", labels: KZ.map((z) => "n = " + z.toLocaleString("de-DE")), values: pick(knap, "dp", KZ, ms) },
    { name: "Branch-and-bound", labels: KZ.map((z) => "n = " + z.toLocaleString("de-DE")), values: pick(knap, "bnb", KZ, ms) },
  ], chartStyle({
    x: 7.2, y: 1.4, w: 5.5, h: 3.7, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: [H.accent1, H.accent3], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "General",
    valAxisLogScaleBase: 10, valAxisMinVal: 0.1, title: "Thời gian, W = 15.000 (ms, thang log)", valAxisTitle: "ms (log)", showCatAxisTitle: false,
  }));
  card(s, 7.2, 5.3, 2.6, 1.45, C.background2, "greedy");
  txt(s, [T("5,9% → 0,05%", { bold: true, color: H.accent2, fontSize: 20, fontFace: "Cambria", breakLine: true }), T("tham lam thiếu so với tối ưu, n = 10 → 5000", { fontSize: 13, color: MUTED })], { x: 7.35, y: 5.35, w: 2.35, h: 1.35, valign: "middle" });
  card(s, 10.0, 5.3, 2.7, 1.45, "FDF1DE", "bnb-caveat");
  txt(s, "B&B nhanh vì dữ liệu ngẫu nhiên, khối lượng và cước độc lập; chưa thử dữ liệu tương quan chặt.", { x: 10.12, y: 5.35, w: 2.5, h: 1.35, fontSize: 13, valign: "middle" });
  s.addNotes(`Người trình bày: TV4. Khoảng 1 phút 30 giây.
- Chọn Parcel lên xe là 0/1 Knapsack, NP-hard. Quy hoạch động theo công thức truy hồi trên bảng B[i][c]; bảng truy vết một byte mỗi ô để dựng lại tập Parcel.
- Độ phức tạp O(nW) là pseudo-polynomial: W là một giá trị, chỉ cần log W bit để mã hóa, nên nW là hàm mũ theo độ dài input. Khối lượng là số nguyên đơn vị 0,1 kg.
- Branch-and-bound: cận trên của mỗi nút là lời giải Knapsack phân số trên phần còn lại, tính bằng tham lam theo tỉ lệ cước/khối lượng. Cắt nhánh khi cận không lớn hơn nghiệm tốt nhất là an toàn. Duyệt bằng stack tường minh.
- Số đo, W = 15.000: DP tăng tuyến tính theo n: 160 ms, 1,34 s, 6,33 s; bảng truy vết 2, 15, 74 MB, khớp n(W+1) byte. B&B chỉ 23 ms ở n = 5000. Lưu ý trung thực: chỉ trên dữ liệu ngẫu nhiên; trường hợp xấu nhất của B&B vẫn là hàm mũ.
- Tham lam thiếu 5,9% ở n = 10 nhưng chỉ 0,05% ở n = 5000.
Con số cần nói: DP 6,33 s so với B&B 23 ms ở n = 5000.`);

  // 18. Held-Karp
  s = newSlide("CHART", SEC4, "Held-Karp: TSP bất đối xứng, O(n²2ⁿ) thay cho n!", "TV4 · Thứ tự giao (tsp.csv)");
  const TZ = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  s.addChart(pres.charts.LINE, [
    { name: "Held-Karp O(n²2ⁿ)", labels: TZ.map(String), values: pick(tsp, "held_karp", TZ, ms) },
    { name: "Vét cạn O(n!)", labels: TZ.map(String), values: pick(tsp, "brute", TZ, ms) },
    { name: "Nearest neighbour", labels: TZ.map(String), values: pick(tsp, "nearest", TZ, ms) },
  ], chartStyle({
    placeholder: "chart", chartColors: [H.accent3, H.accent5, H.accent4], lineSize: 2.25, lineDataSymbol: "circle", lineDataSymbolSize: 7,
    displayBlanksAs: "gap", valAxisLogScaleBase: 10, valAxisMinVal: 0.001, title: "Thời gian theo số điểm n (ms, thang log)",
    valAxisTitle: "ms (log)", catAxisTitle: "n (gồm Hub)",
  }));
  s.addText([
    T("C(S, j) = min C(S∖{j}, k) + d(k, j)", { fontFace: "Cambria", bold: true, color: H.accent1, fontSize: 16, breakLine: true }),
    T("k ∈ S∖{j}; d bất đối xứng do đường một chiều, Held-Karp vẫn đúng.", { color: MUTED, fontSize: 14, breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("89 lần", { bold: true, color: H.accent3, fontSize: 28, fontFace: "Cambria", breakLine: true }),
    T("nhanh hơn vét cạn ở n = 10 (3,9 so với 345 ms); 293 ms ở n = 15.", { breakLine: true }),
    T(" ", { fontSize: 8, breakLine: true }),
    T("5–41%", { bold: true, color: H.accent5, fontSize: 28, fontFace: "Cambria", breakLine: true }),
    T("Nearest neighbour gần như tức thời nhưng dài hơn tối ưu (trung bình 21%).", {}),
  ], { placeholder: "body" });
  s.addNotes(`Người trình bày: TV4. Khoảng 1 phút 15 giây.
- Sắp thứ tự giao là TSP. Vì có đường một chiều nên ma trận khoảng cách bất đối xứng: ATSP. Held-Karp không cần tính đối xứng nên vẫn đúng.
- Trạng thái C(S, j): chi phí nhỏ nhất xuất phát từ Hub, đi qua đúng tập S và kết thúc ở j. Có n·2ⁿ trạng thái, mỗi trạng thái thử O(n) đỉnh trước: O(n²2ⁿ) thời gian, O(n2ⁿ) bộ nhớ. Vét cạn duyệt (n−1)! hoán vị.
- Số đo: Held-Karp tăng khoảng 2,3 lần mỗi khi thêm một điểm, 293 ms ở n = 15. Vét cạn tăng khoảng n lần mỗi bước, đã mất 345 ms ở n = 10. Cùng n = 10, Held-Karp nhanh hơn 89 lần.
- Nearest neighbour gần như tức thời nhưng dài hơn tối ưu 5–41%, trung bình 21%; với một chuyến giao, đó là vài chục phút chạy xe.
- Held-Karp vẫn là hàm mũ, nên hệ thống giới hạn số điểm dừng (slide sau).
Con số cần nói: nhanh hơn vét cạn 89 lần ở n = 10; NN dài hơn 5–41%.`);

  // 19. plan_trip
  s = newSlide("CONTENT", SEC4, "plan_trip: từ cụm Parcel tới một Trip", "TV4 · Tích hợp với TV1 (core/trip.py)");
  const pt = [
    ["box", "Gom theo Delivery Point", "mảng slot cỡ V, cộng cước từng điểm"],
    ["filter", "Giữ ≤ 12 điểm", "tổng cước cao nhất"],
    ["truck", "Knapsack DP", "trên Parcel tại các điểm đó, W = 4.000 (400 kg)"],
    ["route", "Ma trận Dijkstra", "k + 1 lần Dijkstra đầy đủ, bất đối xứng"],
    ["graph", "Held-Karp", "ATSP xuất phát và quay về Hub"],
    ["road", "Nối chặng", "Dijkstra dừng sớm cho từng cặp liên tiếp"],
  ];
  pt.forEach(([ic, h, d], i) => {
    const x = 0.6 + i * 2.06;
    card(s, x, 1.45, 1.8, 2.45, i === 2 || i === 4 ? C.accent1 : C.background2, "pt-" + i);
    iconCircle(s, ic, x + 0.6, 1.6, 0.6, i === 2 || i === 4 ? C.accent3 : C.accent1);
    txt(s, h, { x: x + 0.08, y: 2.3, w: 1.64, h: 0.6, fontSize: 14, bold: true, align: "center", valign: "middle", color: i === 2 || i === 4 ? "FFFFFF" : H.dk2 });
    txt(s, d, { x: x + 0.1, y: 2.9, w: 1.6, h: 0.95, fontSize: 13, align: "center", color: i === 2 || i === 4 ? H.accent6 : MUTED });
    if (i < 5) arrow(s, x + 1.82, 2.55, 0.22, C.accent4);
  });
  card(s, 0.6, 4.15, 4.0, 2.6, C.background2, "why12");
  iconCircle(s, "list", 0.8, 4.35, 0.55, C.accent2, true);
  txt(s, "Vì sao tối đa 12 điểm?", { x: 1.5, y: 4.35, w: 3.0, h: 0.55, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  txt(s, bullets(["Held-Karp nhận tối đa 16 đỉnh (Hub + 15)", "12 điểm ≈ 23 ms, cân bằng tối ưu và phản hồi", "Chi phí chính nằm ở ma trận Dijkstra"], { fontSize: 14 }), { x: 0.8, y: 5.05, w: 3.65, h: 1.6 });
  card(s, 4.85, 4.15, 3.9, 2.6, C.background2, "result");
  txt(s, "Demo: 6 cụm, xe tải 400 kg", { x: 5.05, y: 4.3, w: 3.55, h: 0.4, fontSize: 15, bold: true, color: C.text2 });
  stat(s, 5.05, 4.75, 3.6, "359–399 kg", "tải 90–100% capacity, mỗi Trip 10–12 điểm", C.accent3, 36);
  card(s, 9.0, 4.15, 3.7, 2.6, "FDF1DE", "limit");
  iconCircle(s, "warn", 9.2, 4.35, 0.55, C.accent2, true);
  txt(s, "Giới hạn", { x: 9.9, y: 4.35, w: 2.6, h: 0.55, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  txt(s, "Chọn điểm và chọn kiện tách rời. Tối ưu đồng thời tập điểm, tập kiện và thứ tự là bài toán Orienteering/VRP, ngoài phạm vi đề.", { x: 9.2, y: 5.0, w: 3.35, h: 1.65, fontSize: 14 });
  s.addNotes(`Người trình bày: TV4. Khoảng 1 phút 15 giây.
- plan_trip không có giải thuật mới, chỉ nối các module: (1) gom Parcel theo Delivery Point bằng mảng slot, cộng cước mỗi điểm; (2) giữ tối đa 12 điểm có tổng cước cao nhất; (3) Knapsack DP trên các Parcel tại những điểm đó, tải trọng W = 4.000 đơn vị 0,1 kg, tức 400 kg; kết quả Knapsack được dùng trọn, không cắt sau; (4) ma trận khoảng cách bằng k+1 lần Dijkstra; (5) Held-Karp; (6) nối các chặng bằng Dijkstra dừng sớm để có dãy Road Segment vẽ lên bản đồ.
- Giới hạn 12 điểm: Held-Karp nhận tối đa 16 đỉnh; 12 điểm khoảng 23 ms. Chi phí chính là Dijkstra dựng ma trận (khoảng 1,6 s cho 13 đỉnh trên bản đồ thật).
- Kết quả demo: 6 cụm, mỗi Trip tải 359–399 kg, tức 90–100% tải trọng, với 10–12 điểm dừng.
- Giới hạn: chọn điểm trước rồi mới chọn kiện, hai bước tách rời. Bài toán tối ưu đồng thời là Orienteering/VRP.
Con số cần nói: 12 điểm tối đa, Trip tải 90–100% của xe 400 kg.`);

  // ===== TV5 =====
  const SEC5 = "TV5 · Thực nghiệm";
  pres.addSection({ title: SEC5 });

  // 20. Phương pháp đo
  s = newSlide("CONTENT", SEC5, "Phương pháp đo", "TV5 · Thực nghiệm và so sánh (bench/)");
  const meth = [
    ["server", "Subprocess riêng", "mỗi cấu hình (thí nghiệm, biến thể, kích thước) chạy trong một tiến trình mới, không dùng lại bộ nhớ và bộ đệm"],
    ["clock", "Trung vị 5 lần", "time.perf_counter; phần dựng dữ liệu không tính giờ"],
    ["mem", "tracemalloc", "đỉnh cấp phát của riêng giải thuật, đo ở lần chạy thứ sáu"],
    ["ban", "Timeout 120 s", "quá giới hạn thì ghi timeout và vẫn giữ trong bảng"],
    ["scale", "Baseline Python với Python", "mảng O(V²), Quick-Find, Prim mảng, vét cạn; heapq (C) chỉ là đường tham chiếu"],
    ["seed", "Seed cố định", "mọi bộ dữ liệu sinh lại được; dòng đầu mỗi CSV ghi máy, Python, repeat, timeout"],
  ];
  meth.forEach(([ic, h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.4 + row * 1.75;
    card(s, x, y, 3.8, 1.55, C.background2, "m-" + i);
    iconCircle(s, ic, x + 0.18, y + 0.2, 0.6, i === 4 ? C.accent3 : C.accent1);
    txt(s, [T(h, { bold: true, color: H.accent1, fontSize: 16, breakLine: true }), T(d, { fontSize: 13, color: MUTED })], { x: x + 0.95, y: y + 0.12, w: 2.75, h: 1.35, valign: "top" });
  });
  table(s, [[hdr("Bộ dữ liệu"), hdr("Quy mô")],
    ["Bản đồ thật", "38.604 đỉnh, 69.411 cạnh"], ["Dạng mạng đường (lưới lệch)", "V = 961 … 49.729, E ≈ 5V"], ["Đồ thị dày", "V ≤ 2.000, E tới gần 10⁶"], ["Hub đầy đủ / Knapsack / ATSP", "50–400 Hub · n ≤ 5.000, W = 15.000 · n ≤ 15"]],
  { x: 0.6, y: 4.95, w: 9.0, colW: [3.6, 5.4], rowH: 0.36, fontSize: 13 });
  card(s, 9.9, 4.95, 2.8, 1.8, C.accent1, "machine");
  txt(s, [T("Apple M1, 16 GB", { bold: true, color: "FFFFFF", breakLine: true }), T("macOS, Python 3.14.7", { color: H.accent6, breakLine: true }), T("một máy duy nhất", { color: H.accent6, fontSize: 13 })], { x: 10.1, y: 5.05, w: 2.45, h: 1.6, fontSize: 15, valign: "middle" });
  s.addNotes(`Người trình bày: TV5. Khoảng 1 phút 30 giây.
- bench/run.py chạy mỗi cấu hình trong một subprocess riêng để bộ nhớ và bộ đệm của lần trước không ảnh hưởng lần sau. Phần dựng dữ liệu không tính giờ.
- Thời gian là trung vị 5 lần chạy bằng perf_counter. Bộ nhớ đo bằng tracemalloc ở lần chạy thứ sáu, để chi phí theo dõi của tracemalloc không làm sai số thời gian.
- Timeout 120 giây, kết quả timeout vẫn ghi vào bảng.
- So sánh công bằng: baseline đều viết bằng Python: Dijkstra mảng, Quick-Find, Prim mảng, vét cạn. heapq viết bằng C chỉ vẽ làm đường tham chiếu, vì so nó với heap Python là so trình thông dịch với mã máy.
- Seed cố định; dòng đầu mỗi file CSV ghi máy, phiên bản Python, số lần lặp và timeout.
- Giới hạn: một máy; tracemalloc chỉ đếm bộ nhớ do Python cấp phát.
Câu cần nói: "Mỗi phép đo chạy trong subprocess riêng, lấy trung vị 5 lần, baseline cùng ngôn ngữ."`);

  // 21. Tổng hợp
  s = newSlide("CONTENT", SEC5, "Tổng hợp kết quả", "TV5 · Thực nghiệm và so sánh");
  const OK = "khớp", NOTE = "cần đọc kỹ";
  const res = [
    ["SSSP mạng đường", "APQ ≈ lazy heap; mảng chậm hơn 146 lần (V = 10.000)", "O((V+E) log V)", OK],
    ["SSSP đồ thị dày", "APQ nhanh hơn 16%, heap nhỏ hơn 4,4 lần", "decrease-key nhiều", NOTE],
    ["Reroute", "0,4 ms ngoài tuyến so với ≈ 110 ms tính lại", "O(L) so với O((V+E) log V)", OK],
    ["Union-Find", "1,17–1,19 bước mỗi thao tác, n = 10³ … 10⁶", "O(α(n))", OK],
    ["MST, Hub đầy đủ", "Kruskal nhanh hơn Prim khoảng 2 lần", "Big-O dự đoán ngược lại", NOTE],
    ["Knapsack", "DP 6,33 s, B&B 23 ms (n = 5.000)", "O(nW), tuyến tính theo n", OK],
    ["TSP", "Held-Karp nhanh hơn vét cạn 89 lần (n = 10)", "O(n²2ⁿ) so với O(n!)", OK],
  ];
  table(s, [[hdr("Thí nghiệm"), hdr("Kết quả chính"), hdr("Lý thuyết"), hdr("Đối chiếu")],
    ...res.map((r) => r.map((c, j) => ({ text: c, options: {
      bold: j === 0 || j === 3, color: j === 3 ? (c === OK ? H.accent3 : "9A5B0B") : j === 0 ? H.accent1 : H.dk1,
      fill: { color: j === 3 ? (c === OK ? "E7F3F2" : "FDF1DE") : "FFFFFF" }, align: j === 3 ? "center" : "left" } })))],
  { x: 0.6, y: 1.4, w: 12.1, colW: [2.3, 5.2, 3.0, 1.6], rowH: 0.52 });
  iconCircle(s, "light", 0.6, 5.85, 0.6, C.accent2, true);
  txt(s, "Hai chỗ cần đọc lý thuyết cẩn thận: lợi thế của APQ phụ thuộc tỉ lệ decrease-key; ở quy mô vừa, hằng số của trình thông dịch có thể đảo thứ hạng giữa hai cận khác nhau.", { x: 1.4, y: 5.75, w: 11.3, h: 0.85, fontSize: 15, valign: "middle" });
  s.addNotes(`Người trình bày: TV5. Khoảng 1 phút 15 giây.
- Bảng tổng hợp bảy thí nghiệm. Năm thí nghiệm khớp với phân tích Big-O: tính tuyến tính của Dijkstra heap trên mạng đường, Reroute O(L), α(n) của Union-Find, O(nW) của Knapsack, O(n²2ⁿ) so với O(n!) của TSP.
- Hai chỗ cần đọc lý thuyết cẩn thận hơn. Thứ nhất, APQ chỉ thắng trên đồ thị dày, nơi decrease-key xảy ra nhiều. Thứ hai, Kruskal nhanh hơn Prim mảng trên đồ thị đầy đủ dù Big-O dự đoán ngược lại, vì sort chạy bằng C.
- Ý chính: cận tiệm cận dự đoán xu hướng khi n đủ lớn, không dự đoán thứ hạng ở một kích thước cụ thể.
- Các giới hạn: một máy, Python thuần, vận tốc giả định theo loại đường, thời gian Reroute là số đo trên demo.
Con số cần nói: 5 trên 7 thí nghiệm khớp trực tiếp; 2 thí nghiệm lệch và đã giải thích được.`);

  // ===== Demo & kết luận =====
  const SEC6 = "Demo và kết luận";
  pres.addSection({ title: SEC6 });

  // 22. Demo
  s = newSlide("CONTENT", SEC6, "Demo trực tiếp", "Demo · TV1 điều khiển, từng thành viên giải thích phần mình");
  card(s, 0.6, 1.4, 12.1, 0.8, C.accent1, "cmd");
  iconCircle(s, "term", 0.75, 1.5, 0.6, C.accent3);
  txt(s, [T(".venv/bin/python -m app.server", { fontFace: "Courier New", bold: true, color: "FFFFFF" }), T("    →  http://localhost:8000", { fontFace: "Courier New", color: H.accent2 })], { x: 1.55, y: 1.45, w: 11.0, h: 0.7, fontSize: 18, valign: "middle" });
  const demo = [
    ["route", "Định tuyến", "bấm 2 điểm trên bản đồ; server chạy Dijkstra + APQ", "TV2"],
    ["traffic", "Traffic Incident", "tắc ×10 hoặc cấm đường trên tuyến → Reroute; ngoài tuyến → giữ tuyến", "TV2"],
    ["hub", "Backbone", "Kruskal trên 24 Hub, trọng số trung bình hai chiều", "TV3"],
    ["truck", "Phân cụm và lập Trip", "Kruskal dừng ở k cụm → chọn ≤ 12 điểm → Knapsack → Held-Karp", "TV4"],
    ["layers", "Liên thông theo phường", "Union-Find trên đồ thị con của từng phường", "TV3"],
  ];
  demo.forEach(([ic, h, d, who], i) => {
    const y = 2.45 + i * 0.86;
    txt(s, String(i + 1), { x: 0.6, y, w: 0.5, h: 0.7, fontSize: 28, bold: true, color: C.accent2, fontFace: "Cambria", valign: "middle", align: "center" });
    card(s, 1.2, y, 11.5, 0.7, C.background2, "demo-" + i);
    iconCircle(s, ic, 1.3, y + 0.08, 0.54, C.accent1);
    txt(s, h, { x: 2.0, y, w: 2.9, h: 0.7, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
    txt(s, d, { x: 4.9, y, w: 6.9, h: 0.7, fontSize: 15, valign: "middle" });
    txt(s, who, { x: 11.8, y, w: 0.8, h: 0.7, fontSize: 14, bold: true, color: C.accent3, valign: "middle", align: "right" });
  });
  txt(s, "Không có mạng: bỏ chọn \"Bản đồ nền\", trang vẫn vẽ toàn bộ Road Segment (Leaflet có sẵn trong app/vendor/).", { x: 1.2, y: 6.8 - 0.05, w: 11.5, h: 0.0001 + 0.0, fontSize: 1 }); // placeholder removed below
  s.addNotes(`Người điều khiển: TV1. Khoảng 4 phút. Chuẩn bị trước: server đã chạy, trình duyệt mở sẵn localhost:8000; nếu không có mạng thì bỏ chọn "Bản đồ nền".
1. Định tuyến (TV2 giải thích): bấm hai điểm xa nhau, chỉ thời gian chạy Dijkstra và độ dài tuyến.
2. Traffic Incident (TV2): gây tắc ×10 trên một đoạn của tuyến → tuyến mới hiện ra (khoảng 110 ms). Gây tắc ở đoạn ngoài tuyến → tuyến giữ nguyên, phản hồi khoảng 0,4 ms. Nhắc lại bổ đề quy tắc bỏ qua.
3. Backbone (TV3): vẽ cây 23 tuyến giữa 24 Hub; giải thích thời gian chủ yếu là 24 lần Dijkstra dựng ma trận (khoảng 3,8 s).
4. Phân cụm và lập Trip (TV4): chia Parcel thành cụm, chọn một cụm, lập Trip: chỉ số điểm dừng (≤ 12), khối lượng (359–399 kg trên xe 400 kg) và thứ tự giao.
5. Liên thông theo phường (TV3): bảng số thành phần; chỉ Bồ Đề và Hoàn Kiếm liên thông nội bộ.
Dự phòng: nếu demo lỗi, quay lại slide 10–19 để trình bày bằng số liệu đã đo.`);

  // 23. Kết luận
  s = newSlide("CONTENT", SEC6, "Kết luận và hướng phát triển", "Kết luận · TV1");
  card(s, 0.6, 1.4, 5.9, 5.35, C.background2, "done");
  iconCircle(s, "check", 0.8, 1.6, 0.6, C.accent3);
  txt(s, "Đã làm được", { x: 1.55, y: 1.6, w: 4.8, h: 0.6, fontSize: 18, bold: true, color: C.text2, valign: "middle" });
  txt(s, bullets([
    "Hệ thống hoàn chỉnh cho Đề tài 4: dữ liệu thật → CTDL tự cài đặt → demo web",
    "Lõi khoảng 1.300 dòng Python chỉ dùng mảng; quy tắc được test AST kiểm tra",
    "81 test, mỗi giải thuật có lời giải đối chứng độc lập",
    "Thực nghiệm khớp Big-O ở xu hướng; hai chỗ lệch được giải thích bằng số đo",
  ], { fontSize: 15 }), { x: 0.85, y: 2.4, w: 5.45, h: 4.2 });
  card(s, 6.85, 1.4, 5.85, 5.35, C.accent1, "next");
  iconCircle(s, "chart", 7.05, 1.6, 0.6, C.accent2, true);
  txt(s, "Hướng phát triển", { x: 7.8, y: 1.6, w: 4.7, h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle" });
  txt(s, bullets([
    "A* với heuristic đường chim bay, Dijkstra hai chiều",
    "Incremental SSSP thay cho tính lại toàn bộ",
    "Rút gọn đỉnh bậc 2 của dữ liệu OSM",
    "VRP nhiều xe, có khung giờ giao",
    "Cài lại lõi bằng C++ để so sánh không bị hằng số trình thông dịch chi phối",
  ], { fontSize: 15, color: "FFFFFF" }), { x: 7.1, y: 2.4, w: 5.4, h: 4.2 });
  s.addNotes(`Người trình bày: TV1. Khoảng 1 phút.
- Tóm tắt: nhóm xây dựng hệ thống hoàn chỉnh từ dữ liệu bản đồ thật, qua các cấu trúc dữ liệu tự cài đặt, tới demo tìm tuyến, gây sự cố, Backbone, phân cụm và lập chuyến.
- Lõi khoảng 1.300 dòng không dùng dict, set, heapq, có test tự động kiểm tra; 81 test với lời giải đối chứng.
- Bài học từ thực nghiệm: lợi thế của APQ phụ thuộc tỉ lệ decrease-key; hằng số trình thông dịch có thể đảo thứ hạng ở quy mô vừa.
- Hướng phát triển: A* và Dijkstra hai chiều giảm số đỉnh phải duyệt; incremental SSSP; rút gọn đỉnh bậc 2 (78% số đỉnh); VRP nhiều xe có khung giờ; cài lại lõi bằng C++.
Câu cần nói: "Kết quả khớp lý thuyết ở xu hướng, và nhóm giải thích được hai chỗ lệch bằng số đo."`);

  // 24. Cảm ơn
  s = newSlide("TITLE_DARK", SEC6, "Cảm ơn hội đồng đã lắng nghe");
  s.addText([T("Hỏi đáp · vấn đáp cá nhân", { breakLine: true }), T("Báo cáo IEEE: report/ · Phiếu vấn đáp: docs/vandap/", { color: "FFFFFF", fontSize: 15 })], { placeholder: "body" });
  s.addImage({ path: path.join(__dirname, "assets/map_dark.png"), x: 8.55, y: 0.45, w: 4.3, h: 4.52, altText: "Mạng đường nội thành Hà Nội", objectName: "map" });
  const qa = [["TV1", "Đồ thị, dữ liệu, tích hợp"], ["TV2", "APQ, Dijkstra, Reroute"], ["TV3", "Union-Find, Kruskal"], ["TV4", "Knapsack, Held-Karp"], ["TV5", "Benchmark"]];
  qa.forEach(([m, d], i) => {
    const x = 0.7 + i * 2.45;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.75, w: 2.25, h: 0.95, fill: { color: "1B3D5E" }, line: { type: "none" }, rectRadius: 0.08, objectName: "qa-" + m });
    txt(s, [T(m, { bold: true, color: "FFFFFF", fontSize: 18, breakLine: true }), T(d, { color: H.accent6, fontSize: 13 })], { x: x + 0.15, y: 5.82, w: 2.0, h: 0.82 });
  });
  s.addNotes(`Người trình bày: TV1 thay mặt nhóm. Khoảng 15 giây, sau đó chuyển sang 15 phút vấn đáp.
- Cảm ơn hội đồng. Mỗi thành viên trả lời câu hỏi về module của mình (xem phiếu docs/vandap/tvN-*.md).
- Câu hỏi dễ gặp: vì sao Locator thay dict (TV2); chứng minh bổ đề rank và ý nghĩa α(n) (TV3); vì sao O(nW) là pseudo-polynomial (TV4); vì sao heapq chỉ là đường tham chiếu (TV5); vì sao giữ SCC lớn nhất và vì sao phân vùng theo phường (TV1).
- Nếu được hỏi về chỗ yếu: thời gian Reroute là số đo từ demo; B&B chỉ thử trên dữ liệu ngẫu nhiên; plan_trip chọn điểm và chọn kiện tách rời.`);

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("Wrote", OUT, "slides:", slideNo);
}

build().catch((e) => { console.error(e); process.exit(1); });
