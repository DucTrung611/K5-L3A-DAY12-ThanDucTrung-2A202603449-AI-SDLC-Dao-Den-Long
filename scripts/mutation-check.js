#!/usr/bin/env node
// Kiểm tra "test không phải loại luôn đạt" (RULES mục 5): sửa cố ý một hằng số/dòng logic trong BẢN SAO TẠM của repo,
// chạy bộ scenario headless; mỗi mutation phải làm ít nhất một scenario FAIL ("bị giết"). Mutation sống sót = lỗ hổng test.
// Dùng: node scripts/mutation-check.js [--json out.json]   (khoảng 3-4 phút)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

const M = (name, file, from, to) => ({ name, file, from, to });
const MUTATIONS = [
  M("nhặt: pickup_radius 1.0 → 1.1", "src/sim/tuning.js", "pickup_radius: 1.0,", "pickup_radius: 1.1,"),
  M("nhặt: pickup_height 1.5 → 2.0", "src/sim/tuning.js", "pickup_height: 1.5,", "pickup_height: 2.0,"),
  M("nhảy: jump_velocity 7 → 6", "src/sim/tuning.js", "jump_velocity: 7.0,", "jump_velocity: 6.0,"),
  M("tỏa sáng: choáng 2.0 → 1.5 s", "src/sim/tuning.js", "pulse_stun_s: 2.0,", "pulse_stun_s: 1.5,"),
  M("tỏa sáng: đẩy 4 → 3 m", "src/sim/tuning.js", "pulse_push_m: 4.0,", "pulse_push_m: 3.0,"),
  M("vùng an toàn: 6 → 5 m", "src/sim/tuning.js", "safe_radius: 6.0,", "safe_radius: 5.0,"),
  M("Bóng Mực: tốc độ 4.0 → 3.5", "src/sim/tuning.js", "shade_speed: 4.0,", "shade_speed: 3.5,"),
  M("lướt: 14 → 12 m/s", "src/sim/tuning.js", "dash_speed: 14.0,", "dash_speed: 12.0,"),
  M("lướt: hồi chiêu 1.5 → 1.0 s", "src/sim/tuning.js", "dash_cooldown_s: 1.5,", "dash_cooldown_s: 1.0,"),
  M("rơi: chờ 60 → 30 tick", "src/sim/tuning.js", "fall_wait_ticks: 60,", "fall_wait_ticks: 30,"),
  M("hồi sinh: bất tử 90 → 60 tick", "src/sim/tuning.js", "respawn_invuln_ticks: 90,", "respawn_invuln_ticks: 60,"),
  M("bùa: hiệu lực 600 → 300 tick", "src/sim/tuning.js", "charm_ticks: 600,", "charm_ticks: 300,"),
  M("bùa: tốc độ 7.2 → 7.0", "src/sim/tuning.js", "charm_speed: 7.2,", "charm_speed: 7.0,"),
  M("Gió Lạc: cướp 3 → 2", "src/sim/tuning.js", "drifter_steal: 3,", "drifter_steal: 2,"),
  M("Gió Lạc: bay đi 240 → 200 tick", "src/sim/tuning.js", "drifter_flee_ticks: 240,", "drifter_flee_ticks: 200,"),
  M("gió mạnh: 2.0 → 1.5 m/s", "src/sim/tuning.js", "wind_push: 2.0,", "wind_push: 1.5,"),
  M("Bóng Mực: phát hiện 12 → 10 m", "src/sim/tuning.js", "shade_detect: 12,", "shade_detect: 10,"),
  M("điểm: tỏa sáng +5 → +10", "src/sim/tuning.js", "per_stun: 5,", "per_stun: 10,"),
  M("input: bỏ phát hiện cạnh lên", "src/sim/input.js", "pressed[b] = inp[b] === true && inp.prev[b] !== true;", "pressed[b] = inp[b] === true;"),
  M("va chạm: bỏ qua bất tử", "src/sim/game.js", "if (P.invuln === 0) {", "if (true) {"),
  M("địa hình: vách không chặn", "src/sim/game.js", "h - pos[1] <= R.step_height + EPS", "true"),
  M("nạp đèn: nạp quá mức cần", "src/sim/game.js", "const amount = Math.max(0, Math.min(P.carried, cost - best.deposited));", "const amount = P.carried;"),
  M("điểm: không cộng khi nạp", "src/sim/game.js", "g.score += amount * S.per_mote;", "g.score += 0;"),
  M("thắng: bỏ thưởng dầu bình minh", "src/sim/game.js", "S.per_dawn_lantern + Math.floor(L.fuelU / TICK_RATE + 1e-9)", "S.per_dawn_lantern"),
  M("tick: không đếm hồi chiêu tỏa sáng", "src/sim/game.js", "if (P.pulseCd > 0) P.pulseCd--;", ""),
  // ---- Phase 3 (Ticket-03): Đèn cạn dầu ----
  M("dầu: tự hao 1.0 → 2.0 /s", "src/sim/tuning.js", "fuel_decay_per_s: 1.0,", "fuel_decay_per_s: 2.0,"),
  M("dầu: Bóng Mực hút 5 → 4 /s", "src/sim/tuning.js", "drain_per_s: 5,", "drain_per_s: 4,"),
  M("dầu: ngưỡng yếu 30 → 25", "src/sim/tuning.js", "low_fuel_threshold: 30,", "low_fuel_threshold: 25,"),
  M("dầu: mỗi đom đóm 10 → 8", "src/sim/tuning.js", "fuel_per_mote: 10,", "fuel_per_mote: 8,"),
  M("thắp lại: cần 5 → 4", "src/sim/tuning.js", "relight_cost: 5,", "relight_cost: 4,"),
  M("thắng: win_ratio 0.6 → 0.5", "src/sim/tuning.js", "win_ratio: 0.6,", "win_ratio: 0.5,"),
  M("sức chứa: tối đa 20 → 18", "src/sim/tuning.js", "capacity_max: 20,", "capacity_max: 18,"),
  M("sức chứa: mỗi lần thắp +2 → +3", "src/sim/tuning.js", "capacity_step: 2,", "capacity_step: 3,"),
  M("Đêm 1: 240 → 250 s", "src/sim/tuning.js", "night1_duration_s: 240,", "night1_duration_s: 250,"),
  M("điểm: thắp lại +40 → +30", "src/sim/tuning.js", "per_relight: 40,", "per_relight: 30,"),
  M("điểm: Tỏa Sáng trúng drain 15 → 10", "src/sim/tuning.js", "per_stun_drain: 15,", "per_stun_drain: 10,"),
  M("điểm: mỗi đèn bình minh 50 → 40", "src/sim/tuning.js", "per_dawn_lantern: 50,", "per_dawn_lantern: 40,"),
  M("drain: bán kính 2 → 3 m", "src/sim/tuning.js", "drain_radius: 2,", "drain_radius: 3,"),
  M("drain: chase khi Mây trong 6 → 5 m", "src/sim/tuning.js", "drain_chase_radius: 6,", "drain_chase_radius: 5,"),
  M("drain: ghi fuel_drain mỗi 60 → 120 tick", "src/sim/tuning.js", "drain_event_every_ticks: 60,", "drain_event_every_ticks: 120,"),
  M("vùng an toàn: fuel == 30 mất vùng", "src/sim/game.js", "L.lit && L.fuelU >= g.fu.low;", "L.lit && L.fuelU > g.fu.low;"),
  M("drain: không cộng dồn nhiều con", "src/sim/game.js", "L.fuelU -= F.decay + list.length * F.drain;", "L.fuelU -= F.decay + (list.length ? F.drain : 0);"),
  M("hết dầu: tắt trễ 1 tick", "src/sim/game.js", "L.lit && L.fuelU <= 1e-9", "L.lit && L.fuelU < -1e-9"),
  M("châm dầu: ceil → floor", "src/sim/game.js", "Math.ceil((F.max - best.fuelU) / F.perMote - 1e-9)", "Math.floor((F.max - best.fuelU) / F.perMote - 1e-9)"),
  M("châm dầu: không giới hạn 100", "src/sim/game.js", "best.fuelU = Math.min(F.max, best.fuelU + F.perMote * used);", "best.fuelU = best.fuelU + F.perMote * used;"),
  M("điểm: không cộng khi châm dầu", "src/sim/game.js", "g.score += used * S.per_mote;", "g.score += 0;"),
  M("thắp lại: vẫn cần 10", "src/sim/game.js", "const cost = relight ? T.relight_cost : T.lantern_cost;", "const cost = T.lantern_cost;"),
  M("điểm: thắp lại tính như thắp mới", "src/sim/game.js", "g.score += relight ? S.per_relight : S.per_lantern;", "g.score += S.per_lantern;"),
  M("thắng: ceil → floor ngưỡng đèn", "src/sim/game.js", "Math.ceil(T.win_ratio * g.lanterns.length - 1e-9)", "Math.floor(T.win_ratio * g.lanterns.length - 1e-9)"),
  M("thắng: bình minh ưu tiên hơn hết lửa", "src/sim/game.js", 'if (P.flames <= 0) finish(g, "lost", "no_flames", emit);\n  else if (g.timeLeft', 'if (P.flames <= 0 && g.timeLeft > EPS) finish(g, "lost", "no_flames", emit);\n  else if (g.timeLeft'),
  M("sức chứa: không tăng", "src/sim/game.js", "P.carried < capacityOf(g) &&", "P.carried < T.carry_capacity &&"),
  M("sức chứa: không đếm lần thắp", "src/sim/game.js", "P.successfulLights++;", ""),
  M("điểm: Tỏa Sáng drain không +15", "src/sim/game.js", 's.state === "drain" ? T.score.per_stun_drain : T.score.per_stun;', "T.score.per_stun;"),
  M("Bóng Mực wander: chọn cả đèn khỏe", "src/sim/game.js", "if (!L.lit || L.fuelU >= low) continue;", "if (!L.lit) continue;"),
  M("Bóng Mực wander: bằng nhau chọn id lớn", "src/sim/game.js", "if (d < bd - EPS) {\n        bd = d;\n        tgt = L;", "if (d <= bd + EPS) {\n        bd = d;\n        tgt = L;"),
  M("Bóng Mực wander: đi tới đèn quá nhanh", "src/sim/game.js", "const k = Math.min(g.map.shade.speed * DT, d) / d;", "const k = Math.min(g.map.shade.speed * DT * 2, d) / d;"),
  M("đèn chỉ vừa thắp không hồi đầy 100", "src/sim/game.js", "best.fuelU = F.max;\n    best.everLit = true;", "best.fuelU = F.max - 600;\n    best.everLit = true;"),
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-mut-"));
for (const d of ["src", "scripts", "tests"]) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
for (const f of ["game.contract.json", "package.json"]) fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f));

const run = () => {
  const r = spawnSync(process.execPath, ["scripts/run-scenarios.js", "--out-dir", "out/mut", "--json", "out/mut.json"], { cwd: tmp, encoding: "utf8" });
  const res = JSON.parse(fs.readFileSync(path.join(tmp, "out", "mut.json"), "utf8"));
  return { status: r.status, failed: res.filter((x) => !x.pass).map((x) => x.name) };
};

const base = run();
if (base.status !== 0) {
  console.error("Bản gốc đã có scenario FAIL, dừng:", base.failed);
  process.exit(1);
}
const rows = [];
for (const m of MUTATIONS) {
  const file = path.join(tmp, m.file);
  const orig = fs.readFileSync(path.join(ROOT, m.file), "utf8");
  if (!orig.includes(m.from)) throw new Error(`mutation "${m.name}": không tìm thấy đoạn cần sửa trong ${m.file}`);
  fs.writeFileSync(file, orig.replace(m.from, m.to));
  const r = run();
  fs.writeFileSync(file, orig);
  rows.push({ mutation: m.name, killed: r.failed.length > 0, failing_scenarios: r.failed });
  console.log(`${r.failed.length ? "BỊ GIẾT " : "SỐNG SÓT"}  ${m.name}  ${r.failed.length ? "→ " + r.failed.slice(0, 4).join(", ") + (r.failed.length > 4 ? ` (+${r.failed.length - 4})` : "") : ""}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
const survived = rows.filter((r) => !r.killed);
console.log(`\n${rows.length - survived.length}/${rows.length} mutation bị giết bởi scenario headless; ${survived.length} sống sót`);
if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify({ total: rows.length, killed: rows.length - survived.length, survived: survived.map((r) => r.mutation), rows }, null, 2) + "\n");
process.exitCode = survived.length ? 1 : 0;
