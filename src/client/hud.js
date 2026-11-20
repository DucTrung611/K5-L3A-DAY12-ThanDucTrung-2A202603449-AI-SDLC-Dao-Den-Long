// HUD bằng DOM: Ngọn Lửa, đom đóm đang mang, số đèn đã thắp, điểm, thời gian, hồi chiêu tỏa sáng, gợi ý.
import { secToTicks } from "../sim/tuning.js";

const $ = (id) => document.getElementById(id);
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export function createHud(tuning) {
  $("capacity").textContent = tuning.carry_capacity;
  $("pulseCost").textContent = tuning.pulse_cost;
  let toastTimer = 0;
  const flames = $("flames");
  const pips = $("pips");
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
    update(g) {
      const P = g.player;
      if (flames.childElementCount !== tuning.flames) flames.innerHTML = "<span></span>".repeat(tuning.flames);
      [...flames.children].forEach((el, i) => el.classList.toggle("out", i >= P.flames));
      if (pips.childElementCount !== g.lanterns.length) pips.innerHTML = "<span></span>".repeat(g.lanterns.length);
      [...pips.children].forEach((el, i) => el.classList.toggle("on", g.lanterns[i].lit));
      $("carried").textContent = P.carried;
      $("score").textContent = g.score;
      const s = Math.max(0, Math.ceil(g.timeLeft));
      $("time").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      const cd = secToTicks(tuning.pulse_cooldown_s);
      const ready = P.carried >= tuning.pulse_cost ? 1 - P.pulseCdTicks / cd : 0;
      $("pulseBar").style.width = `${Math.round(ready * 100)}%`;

      let hint = "";
      const near = g.lanterns.filter((L) => !L.lit && distXZ(P.pos, L.pos) <= tuning.interact_radius);
      if (near.length) {
        const L = near[0];
        hint = P.carried > 0 ? `Nhấn E để nạp ánh sáng vào ${L.id} (${L.deposited}/${tuning.lantern_cost})` : `${L.id} cần ${tuning.lantern_cost - L.deposited} đom đóm nữa – đi gom thêm!`;
      } else if (P.carried >= tuning.carry_capacity) hint = "Đã mang đầy đom đóm – mang về đèn gần nhất";
      $("hint").textContent = hint;
    },
  };
}
