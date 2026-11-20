// Ticket-03: đèn k/n kèm ngưỡng thắng, thanh đom đóm theo sức chứa tăng dần (đang_mang / sức_chứa), nhắc châm dầu,
// cảnh báo đèn sắp tắt (fuel < 30, nhấp nháy 1 Hz), mũi tên chỉ tới đèn cần chăm (đèn tắt hoặc sắp cạn).
// HUD đầy đủ theo Ticket-02: Ngọn Lửa (trên trái), đồng hồ mm:ss (trên giữa, đỏ và nhấp nháy khi ≤ 30 s),
// đèn k/n + điểm (trên phải), thanh đom đóm 10 ô (dưới giữa), biểu tượng hồi chiêu Lướt/Tỏa Sáng (dưới phải),
// nhắc "E — Nạp ánh sáng (x/10)" khi đứng gần đèn, mũi tên chỉ tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình.
import { secToTicks } from "../sim/tuning.js";
import { capacityOf } from "../sim/game.js";

const $ = (id) => document.getElementById(id);
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export function createHud(tuning) {
  const flames = $("flames");
  const slots = $("slots");
  const arrow = $("arrow");
  let toastTimer = 0;
  slots.innerHTML = "<i></i>".repeat(tuning.capacity_max);
  const dashTicks = secToTicks(tuning.dash_cooldown_s);
  const pulseTicks = secToTicks(tuning.pulse_cooldown_s);
  const setCd = (el, frac) => el.style.setProperty("--cd", `${Math.round(Math.max(0, Math.min(1, frac)) * 360)}deg`);

  return {
    show(on) {
      $("hud").classList.toggle("on", on);
    },
    toast(text, ms = 1800) {
      const t = $("toast");
      t.textContent = text;
      t.style.opacity = 1;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (t.style.opacity = 0), ms);
    },
    flash() {
      const f = $("flash");
      f.style.opacity = 1;
      setTimeout(() => (f.style.opacity = 0), 220);
    },
    update(g, view, time) {
      const P = g.player;
      if (flames.childElementCount !== tuning.flames) flames.innerHTML = "<span></span>".repeat(tuning.flames);
      [...flames.children].forEach((el, i) => el.classList.toggle("out", i >= P.flames));
      const lit = g.lanterns.filter((L) => L.lit).length;
      const needLit = Math.ceil(tuning.win_ratio * g.lanterns.length - 1e-9);
      $("lit").textContent = `${lit}/${g.lanterns.length}`;
      $("litNeed").textContent = `cần ≥ ${needLit} lúc bình minh`;
      $("lit").classList.toggle("short", lit < needLit);
      $("score").textContent = g.score;
      const s = Math.max(0, Math.ceil(g.timeLeft - 1e-9));
      const clock = $("clock");
      clock.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      clock.classList.toggle("urgent", g.timeLeft <= 30);
      clock.classList.toggle("blink", g.timeLeft <= 30 && Math.floor(time * 2) % 2 === 0);
      const cap = capacityOf(g);
      [...slots.children].forEach((el, i) => {
        el.hidden = i >= cap;
        el.classList.toggle("on", i < P.carried);
      });
      $("carried").textContent = `${P.carried}/${cap}`;
      const dashReady = P.charm > 0 ? 1 : 1 - P.dashCd / dashTicks;
      setCd($("cdDash"), dashReady);
      $("cdDash").classList.toggle("ready", dashReady >= 1);
      const pulseReady = 1 - P.pulseCd / pulseTicks;
      setCd($("cdPulse"), pulseReady);
      $("cdPulse").classList.toggle("ready", pulseReady >= 1 && P.carried >= tuning.pulse_cost);
      $("charmBadge").hidden = !(P.charm > 0);
      $("charmBadge").textContent = `Bùa Gió ${(P.charm / 60).toFixed(1)} s`;

      // nhắc nạp ánh sáng
      let hint = "";
      // chỉ đèn NHẬN ĐƯỢC (chưa sáng, hoặc sáng nhưng chưa đầy dầu) mới được nhắc – giống cách sim chọn đèn
      const near = g.lanterns.filter((L) => (!L.lit || L.fuelU < g.fu.max) && distXZ(P.pos, L.pos) <= tuning.interact_radius);
      if (near.length) {
        const L = near.reduce((b, x) => (distXZ(P.pos, x.pos) < distXZ(P.pos, b.pos) ? x : b));
        if (!L.lit) {
          const cost = L.everLit ? tuning.relight_cost : tuning.lantern_cost;
          const verb = L.everLit ? "Thắp lại" : "Nạp ánh sáng";
          hint = P.carried > 0 ? `E — ${verb} (${L.deposited}/${cost})` : `${L.id} cần ${cost - L.deposited} đom đóm nữa (${L.deposited}/${cost})`;
        } else {
          const fuel = L.fuelU / 60;
          const used = Math.min(P.carried, Math.ceil((g.fu.max - L.fuelU) / g.fu.perMote));
          hint = P.carried > 0 ? `E — Châm dầu (${Math.floor(fuel)}/${tuning.fuel_max}, +${used * tuning.fuel_per_mote})` : `${L.id} còn ${Math.floor(fuel)}/${tuning.fuel_max} dầu – mang đom đóm tới châm`;
        }
      } else if (P.carried >= cap) hint = "Đã mang đầy đom đóm – mang về đèn gần nhất";

      // cảnh báo đèn sắp tắt (fuel < 30): nhấp nháy 1 Hz
      const lows = g.lanterns.filter((L) => L.lit && L.fuelU < g.fu.low);
      const lowEl = $("lowFuel");
      lowEl.hidden = lows.length === 0;
      if (lows.length) {
        $("lowFuelText").textContent = `Đèn sắp tắt: ${lows.map((L) => `${L.id} (${Math.ceil(L.fuelU / 60)})`).join(" · ")}`;
        lowEl.style.opacity = Math.floor(time * 2) % 2 === 0 ? 1 : 0.35;
      }
      $("hint").textContent = hint;

      // mũi tên tới đèn cần chăm gần nhất (đèn tắt hoặc sắp cạn dầu) khi ngoài màn hình
      const unlit = g.lanterns.filter((L) => !L.lit || L.fuelU < g.fu.low);
      let shown = false;
      if (unlit.length && P.fallWait === 0) {
        const L = unlit.reduce((b, x) => (distXZ(P.pos, x.pos) < distXZ(P.pos, b.pos) ? x : b));
        const p = view.project(L.pos);
        if (!p.visible) {
          let nx = p.behind ? -p.nx : p.nx;
          let ny = p.behind ? -p.ny : p.ny;
          const m = Math.max(Math.abs(nx), Math.abs(ny)) || 1;
          nx /= m;
          ny /= m;
          const x = (nx * 0.5 * 0.86 + 0.5) * innerWidth;
          const y = (-ny * 0.5 * 0.8 + 0.5) * innerHeight;
          arrow.style.transform = `translate(${x}px, ${y}px) rotate(${Math.atan2(-ny, nx) + Math.PI / 2}rad)`;
          arrow.querySelector("b").textContent = `${L.id} · ${Math.round(distXZ(P.pos, L.pos))} m`;
          shown = true;
        }
      }
      arrow.hidden = !shown;
    },
  };
}
