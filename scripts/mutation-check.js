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
  M("nạp đèn: nạp quá mức cần", "src/sim/game.js", "const amount = Math.min(P.carried, T.lantern_cost - best.deposited);", "const amount = P.carried;"),
  M("điểm: không cộng khi nạp", "src/sim/game.js", "g.score += amount * S.per_mote;", "g.score += 0;"),
  M("thắng: bỏ thưởng thời gian", "src/sim/game.js", "Math.floor(Math.max(0, g.timeLeft) + 1e-7) * S.per_second_left", "0"),
  M("tick: không đếm hồi chiêu tỏa sáng", "src/sim/game.js", "if (P.pulseCd > 0) P.pulseCd--;", ""),
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
