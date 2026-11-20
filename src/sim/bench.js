// Cảnh benchmark chuẩn (Ticket-04 mục 1): Đêm 1, 200 Bóng Mực `wander` rải đều, 100 đom đóm, L1–L3 sáng fuel 100.
// Dùng lõi mô phỏng thật (shade vẫn đi theo luật wander) nhưng khóa mọi thứ làm đổi cảnh: sinh thêm, sát thương,
// nhặt đom đóm, hao dầu, kết thúc Đêm. Tất định theo seed (createRng), không Math.random.
import { createGame, stepGame } from "./game.js";
import { createRng } from "./rng.js";
import { TICK_RATE } from "./tuning.js";

export const BENCH = Object.freeze({ shades: 200, motes: 100, island_r: 36, camera: { radius: 30, height: 15, period_s: 15 } });

/** n điểm rải đều trên đĩa bán kính r (lưới xoắn ốc hoa hướng dương + nhiễu nhỏ theo seed). */
function spread(n, r, rng) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rad = r * Math.sqrt((i + 0.5) / n);
    const ang = i * 2.399963229728653 + rng.next() * 0.3;
    out.push([Math.round(rad * Math.cos(ang) * 1000) / 1000, 0, Math.round(rad * Math.sin(ang) * 1000) / 1000]);
  }
  return out;
}

export function createBenchGame(seed = 42) {
  const rng = createRng(seed);
  const scenario = {
    player: { pos: [0, 0, 0], carried: 0 },
    lanterns: ["L1", "L2", "L3"].map((id) => ({ id, lit: true, fuel: 100, ever_lit: true })),
    shades: spread(BENCH.shades, BENCH.island_r, rng).map((pos) => ({ pos, state: "wander" })),
    motes: spread(BENCH.motes, BENCH.island_r - 2, rng),
    random_motes: false,
    random_shades: false,
    random_drifters: false,
    wind_enabled: false,
  };
  const g = createGame({ seed, night: 1, scenario });
  g.bench = true;
  return g;
}

const NEUTRAL = (inp) => {
  inp.move = [0, 0];
  inp.cam_yaw_deg = 0;
  inp.jump = inp.interact = inp.pulse = inp.dash = inp.pause = false;
};

/** Một tick: chạy lõi rồi khóa lại các yếu tố bị tắt trong cảnh benchmark. */
export function stepBench(g) {
  stepGame(g, NEUTRAL);
  const P = g.player;
  P.pos = [0, 0, 0];
  P.vel = [0, 0, 0];
  P.carried = 0;
  P.flames = g.tuning.flames;
  P.invuln = 0;
  P.fallWait = 0;
  g.timeLeft = g.baseTime;
  g.state = "playing";
  g.result = null;
  g.reason = null;
  for (const L of g.lanterns) {
    if (["L1", "L2", "L3"].includes(L.id)) {
      L.lit = true;
      L.fuelU = g.fu.max;
    }
  }
  for (const s of g.shades) {
    if (s.state !== "wander") {
      s.state = "wander";
      s.target = null;
      s.left = 0;
    }
  }
  g.motes.length = Math.min(g.motes.length, BENCH.motes);
}

/** Vị trí camera ở thời điểm t giây: vòng tròn tâm (0,0,0) r=30, Y=15, ngược chiều kim đồng hồ nhìn từ trên xuống, bắt đầu (30,15,0). */
export function benchCamera(t) {
  const a = (2 * Math.PI * t) / BENCH.camera.period_s;
  return { pos: [BENCH.camera.radius * Math.cos(a), BENCH.camera.height, -BENCH.camera.radius * Math.sin(a)], look: [0, 0, 0] };
}
export const BENCH_TICK_RATE = TICK_RATE;
