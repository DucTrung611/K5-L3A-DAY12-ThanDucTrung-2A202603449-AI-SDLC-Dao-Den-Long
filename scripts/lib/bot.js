// Ticket-03: bot thắp đèn tắt (thắp lại cần 5), châm dầu đèn yếu (fuel < 55), sống tới bình minh.
// Bot tham lam đơn giản – CHỈ dùng để kiểm chứng (game thắng được từ đầu tới cuối), không phải một phần của game.
// Bot đọc trạng thái mô phỏng và quyết định input; input được ghi lại thành file inputs theo contract
// để phát lại bằng CLI headless (hộp đen).
import { createGame, stepGame, capacityOf } from "../../src/sim/game.js";


const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export function playBot({ seed, maxTicks = 18000 }) {
  const g = createGame({ seed });
  const T = g.tuning;
  const frames = [];
  let last = { move: [0, 0], cam_yaw_deg: 0, interact: false, pulse: false };
  let interactToggle = false;
  let pulseToggle = false;

  for (let k = 0; k < maxTicks && g.state === "playing"; k++) {
    const P = g.player;
    const active = g.shades.filter((s) => s.state === "wander" || s.state === "chase"); // chỉ các trạng thái gây hit
    const nearShade = active.reduce((b, s) => (!b || d2(s.pos, P.pos) < d2(b.pos, P.pos) ? s : b), null);
    const shadeD = nearShade ? d2(nearShade.pos, P.pos) : Infinity;
    // đèn cần chăm: đèn tắt (nạp để thắp/thắp lại) hoặc đèn sáng sắp cạn (châm dầu)
    const needy = g.lanterns.filter((L) => !L.lit || L.fuelU / 60 < 55);
    const lantern = needy.reduce((b, L) => (!b || d2(L.pos, P.pos) < d2(b.pos, P.pos) ? L : b), null);
    const need = lantern ? (lantern.lit ? Math.ceil((100 - lantern.fuelU / 60) / T.fuel_per_mote) : (lantern.everLit ? T.relight_cost : T.lantern_cost) - lantern.deposited) : Infinity;
    const cap = capacityOf(g);

    let target = null;
    let interact = false;
    let pulse = false;
    if (nearShade && nearShade.state === "chase" && shadeD < 2.2 && P.carried >= T.pulse_cost && P.pulseCd === 0) pulse = !pulseToggle;
    if (lantern && (P.carried >= need + T.pulse_cost || P.carried >= cap || (P.carried >= need && shadeD > 10))) {
      target = lantern.pos;
      if (d2(lantern.pos, P.pos) <= T.interact_radius - 0.5) interact = !interactToggle;
    } else if (g.motes.length) {
      // đom đóm gần nhất, tránh những con đang có Bóng Mực ở gần
      let best = null;
      let bs = Infinity;
      for (const m of g.motes) {
        let s = d2(m.pos, P.pos);
        for (const sh of active) if (d2(sh.pos, m.pos) < 4) s += 30;
        if (s < bs) {
          bs = s;
          best = m;
        }
      }
      target = best.pos;
    } else if (lantern) target = lantern.pos;

    let mv = [0, 0];
    if (target) {
      const dx = target[0] - P.pos[0];
      const dz = target[2] - P.pos[2];
      const l = Math.hypot(dx, dz);
      if (l > 0.3) mv = [dx / l, dz / l];
    }
    // né Bóng Mực khi không tỏa sáng được
    if (nearShade && nearShade.state === "chase" && shadeD < 3.5 && !pulse) {
      const ax = P.pos[0] - nearShade.pos[0];
      const az = P.pos[2] - nearShade.pos[2];
      const l = Math.hypot(ax, az) || 1;
      mv = [mv[0] * 0.3 + (ax / l) * 0.7, mv[1] * 0.3 + (az / l) * 0.7];
      const m = Math.hypot(mv[0], mv[1]) || 1;
      mv = [mv[0] / m, mv[1] / m];
    }
    // Ticket-02: rơi khỏi đảo bị phạt -> không bước ra ngoài bán kính 37 m (bỏ thành phần hướng ra ngoài)
    const rr = Math.hypot(P.pos[0], P.pos[2]);
    if (rr > 37) {
      const nx = P.pos[0] / rr;
      const nz = P.pos[2] / rr;
      const out = mv[0] * nx + mv[1] * nz;
      if (out > 0) mv = [mv[0] - out * nx, mv[1] - out * nz];
    }
    mv = mv.map((v) => Math.round(v * 1000) / 1000);
    interactToggle = interact;
    pulseToggle = pulse;

    const cur = { move: mv, cam_yaw_deg: 0, interact, pulse };
    const f = { tick: k };
    if (cur.move[0] !== last.move[0] || cur.move[1] !== last.move[1]) f.move = cur.move;
    if (cur.interact !== last.interact) f.interact = cur.interact;
    if (cur.pulse !== last.pulse) f.pulse = cur.pulse;
    if (Object.keys(f).length > 1 || k === 0) frames.push(k === 0 ? { ...f, cam_yaw_deg: 0 } : f);
    last = cur;

    stepGame(g, (inp) => {
      inp.move = cur.move;
      inp.cam_yaw_deg = 0;
      inp.interact = cur.interact;
      inp.pulse = cur.pulse;
    });
  }
  return { frames, result: g.state, reason: g.reason, ticks: g.tick, score: g.score, stats: g.stats, flames: g.player.flames };
}
