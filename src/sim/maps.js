// Bản đồ chuẩn của Ticket-02 (Phần 2). Góc θ đo từ +X trên mặt phẳng XZ: (cx + r·cosθ, cz + r·sinθ).
// Mỗi bản đồ có hàm chiều cao h(x,z): số = mặt đất, -Infinity = hư không (rơi), +Infinity = vật cản đặc.
import { TUNING, RULES } from "./tuning.js";

const rad = (d) => (d * Math.PI) / 180;
const polar = (cx, cz, r, deg) => [cx + r * Math.cos(rad(deg)), 0, cz + r * Math.sin(rad(deg))];
// Các điểm cách đều `step` độ bắt đầu từ `from`; mặc định đi hết một vòng (không lặp điểm đầu).
const ring = (cx, cz, r, step, from = 0, to = from + 360 - step / 2) => {
  const out = [];
  for (let a = from; a <= to + 1e-9; a += step) out.push(polar(cx, cz, r, a));
  return out;
};
const EPS = RULES.eps;
const VOID = -Infinity;
const WALL = Infinity;

// ---------- Đêm 1: Đảo Bến ----------
const night1 = {
  id: 1,
  name: "Đảo Bến",
  duration_s: TUNING.night1_duration_s,
  start: [0, 0, 0],
  height: (x, z) => (Math.hypot(x, z) <= 40 + EPS ? 0 : VOID),
  lanterns: [
    ["L1", [0, 0, 25]],
    ["L2", [23.8, 0, 7.7]],
    ["L3", [14.7, 0, -20.2]],
    ["L4", [-14.7, 0, -20.2]],
    ["L5", [-23.8, 0, 7.7]],
  ],
  motePoints: [...ring(0, 0, 12, 45), ...ring(0, 0, 33, 22.5)],
  shadePoints: ring(0, 0, 37, 30, 15),
  shade: { every_s: 8, max: 6, speed: TUNING.shade_speed },
  pads: [],
  charms: [],
  drifters: false,
  wind: false,
  islands: [{ c: [0, 0], r: 40 }],
};

// ---------- Đêm 2: Đảo Cầu ----------
const A = [0, 0];
const B = [70, 0];
const night2 = {
  id: 2,
  name: "Đảo Cầu",
  duration_s: TUNING.night2_duration_s,
  start: [0, 0, 0],
  height: (x, z) => {
    if (Math.hypot(x - A[0], z - A[1]) <= 28 + EPS) return 0;
    if (Math.hypot(x - B[0], z - B[1]) <= 28 + EPS) return 0;
    if (x >= 26 - EPS && x <= 44 + EPS && Math.abs(z) <= 2 + EPS) return 0; // cầu tre, không lan can
    return VOID;
  },
  lanterns: [
    ["L1", [0, 0, 20]],
    ["L2", [17, 0, -10]],
    ["L3", [-17, 0, -10]],
    ["L4", [70, 0, 20]],
    ["L5", [87, 0, -10]],
    ["L6", [53, 0, -10]],
  ],
  motePoints: [
    ...ring(0, 0, 10, 90),
    ...ring(0, 0, 22, 45),
    ...ring(70, 0, 10, 90),
    ...ring(70, 0, 22, 45),
  ],
  shadePoints: [...ring(0, 0, 26, 45, 22.5), ...ring(70, 0, 26, 45, 22.5)],
  shade: { every_s: 7, max: 8, speed: TUNING.shade_speed },
  pads: [
    { pos: [20, 0, 18], vy: 14, speed: 24, toward: [70, 0] },
    { pos: [50, 0, -18], vy: 14, speed: 24, toward: [0, 0] },
  ],
  charms: [["C1", [35, 0, 0]]],
  drifters: true,
  wind: false,
  islands: [
    { c: A, r: 28 },
    { c: B, r: 28 },
  ],
};

// ---------- Đêm 3: Đảo Chuông ----------
const RAMP_ANGLES = [30, 150];
const rampHeight = (x, z) => {
  for (const a of RAMP_ANGLES) {
    const c = Math.cos(rad(a));
    const s = Math.sin(rad(a));
    const along = x * c + z * s;
    const across = -x * s + z * c;
    // dốc rộng 3 m: chân ở r=30 (Y=0), đỉnh ở r=24 (Y=3); kéo dài 0.1 m lên mép tầng 1 để không hở khe
    if (Math.abs(across) <= 1.5 + EPS && along >= 23.9 - EPS && along <= 30 + EPS) return Math.min(3, (3 * (30 - along)) / 6);
  }
  return null;
};
const night3Height = (x, z) => {
  const r = Math.hypot(x, z);
  if (r > 45 + EPS) return VOID;
  if (r <= 2 + EPS) return WALL; // tháp chuông (cột r = 2 trên tầng 2)
  if (r <= 8 + EPS) return 6; // tầng 2
  if (z > 0 && r >= 12 - EPS && r <= 24 + EPS) return 3; // tầng 1 (vành khăn nửa z > 0)
  const rh = rampHeight(x, z);
  if (rh !== null) return rh;
  return 0; // tầng 0
};
const night3 = {
  id: 3,
  name: "Đảo Chuông",
  duration_s: TUNING.night3_duration_s,
  start: [0, 0, -20],
  height: night3Height,
  lanterns: [
    ["L1", [0, 6, 6]],
    ["L2", [18, 3, 10]],
    ["L3", [-18, 3, 10]],
    ["L4", [35, 0, -10]],
    ["L5", [-35, 0, -10]],
    ["L6", [20, 0, -35]],
    ["L7", [-20, 0, -35]],
  ],
  motePoints: [
    ...ring(0, 0, 34, 20), // 18 điểm tầng 0
    ...ring(0, 0, 18, 20, 20, 160), // 8 điểm tầng 1
    ...ring(0, 0, 5, 90, 45), // 4 điểm tầng 2
  ].map((p) => [p[0], night3Height(p[0], p[2]), p[2]]),
  shadePoints: ring(0, 0, 43, 22.5),
  shade: { every_s: 6, max: 10, speed: RULES.shade_speed_night3 },
  pads: [{ pos: [0, 3, 13], vy: 12, speed: 8, dir: [0, -1] }],
  charms: [
    ["C1", [30, 0, 25]],
    ["C2", [-30, 0, 25]],
  ],
  drifters: true,
  wind: true,
  islands: [{ c: [0, 0], r: 45 }],
};
export const MAPS = { 1: night1, 2: night2, 3: night3 };
export const NIGHTS = [1, 2, 3];
export const lanternIds = (night) => MAPS[night].lanterns.map(([id]) => id);
export const groundAt = (map, x, z) => map.height(x, z);
