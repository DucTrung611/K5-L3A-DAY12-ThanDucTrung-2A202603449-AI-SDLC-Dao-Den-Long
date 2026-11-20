// Chế độ benchmark (Ticket-04 mục 1): trang bench.html?seed=42&duration=30.
// Cảnh chuẩn: Đêm 1 đủ ánh sáng, 200 Bóng Mực wander + 100 đom đóm + L1–L3 sáng fuel 100 (src/sim/bench.js),
// camera bay vòng quanh gốc tọa độ. 3 s đầu là khởi động; sau đó ghi dt từng khung hình đúng `duration` giây.
// Kết quả thô (mảng dt) đặt ở window.__benchResult để scripts/bench.js tính chỉ số và ghi bench.json.
import { createView } from "./scene.js";
import { createBenchGame, stepBench, benchCamera } from "../sim/bench.js";
import { TICK_RATE } from "../sim/tuning.js";

const q = new URLSearchParams(location.search);
const seed = Number(q.get("seed") ?? 42);
const duration = Number(q.get("duration") ?? 30);
const WARMUP_MS = 3000;
const DT = 1 / TICK_RATE;

const view = createView(document.getElementById("app"));
view.setBench(true);
view.buildNight(1);
const game = createBenchGame(seed);

let first = null; // thời điểm khung hình đầu tiên đã vẽ (ms, theo performance.now)
let prev = 0;
let acc = 0;
let simTime = 0; // thời gian mô phỏng (s) dùng cho quỹ đạo camera và hoạt ảnh
const dts = [];

function frame(now) {
  if (first === null) {
    first = now;
    prev = now;
    simTime = 0;
  }
  const dtMs = now - prev;
  prev = now;
  const dt = Math.min(0.1, dtMs / 1000);
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 8) {
    stepBench(game);
    acc -= DT;
    n++;
  }
  simTime += dt;
  view.render(game, 0, dt, simTime, benchCamera(simTime));

  if (window.__benchFirstFrame === undefined) window.__benchFirstFrame = performance.timeOrigin + performance.now();
  const elapsed = now - first;
  if (elapsed > WARMUP_MS && elapsed <= WARMUP_MS + duration * 1000) dts.push(dtMs);
  if (elapsed > WARMUP_MS + duration * 1000) {
    const gl = view.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    window.__benchResult = {
      dts,
      renderer: `three.js r170 / WebGL: ${ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`,
      size: [view.renderer.domElement.width, view.renderer.domElement.height],
      shades: game.shades.length,
      motes: game.motes.length,
    };
    return;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
