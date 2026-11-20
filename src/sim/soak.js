// Soak test (Ticket-04 mục 2): chạy nhiều Đêm liên tiếp trong CÙNG tiến trình, input ngẫu nhiên theo seed.
// Đêm thứ i (i = 0..nights-1) dùng seed `seed + i` và bản đồ ((i % 3) + 1). Mỗi 30 tick chọn lại hướng đi;
// mỗi tick: 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác. Logic thuần (không I/O, không đo bộ nhớ) để test được.
import { createGame, stepGame } from "./game.js";
import { createRng } from "./rng.js";

export const SOAK_RATES = Object.freeze({ turn_every_ticks: 30, jump: 0.05, dash: 0.03, pulse: 0.02, interact: 0.1 });
const MAX_TICKS = 40000; // chặn an toàn; đêm dài nhất 300 s = 18000 tick

export const soakNightOf = (i) => (i % 3) + 1;

/** Chạy một Đêm tới khi kết thúc. Trả về { result, ticks, game }. */
export function runSoakNight(seed, night) {
  const game = createGame({ seed, night });
  const rng = createRng(seed ^ 0x5bd1e995); // luồng input tách khỏi luồng của game
  let move = [0, 0];
  let k = 0;
  while (game.state !== "won" && game.state !== "lost" && k < MAX_TICKS) {
    if (k % SOAK_RATES.turn_every_ticks === 0) {
      const a = rng.next() * 2 * Math.PI;
      move = [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a) * 1000) / 1000];
    }
    const jump = rng.next() < SOAK_RATES.jump;
    const dash = rng.next() < SOAK_RATES.dash;
    const pulse = rng.next() < SOAK_RATES.pulse;
    const interact = rng.next() < SOAK_RATES.interact;
    stepGame(game, (inp) => {
      inp.move = move;
      inp.cam_yaw_deg = 0;
      inp.jump = jump;
      inp.dash = dash;
      inp.pulse = pulse;
      inp.interact = interact;
      inp.pause = false;
    });
    k++;
  }
  return { result: game.state === "playing" ? "timeout" : game.state, ticks: k, game };
}
