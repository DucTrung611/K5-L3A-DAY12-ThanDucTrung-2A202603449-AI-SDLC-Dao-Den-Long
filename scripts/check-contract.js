#!/usr/bin/env node
// So game.contract.json với src/sim/tuning.js (nguồn sự thật) – khai sai tuning sẽ làm trượt test ẩn.
// Contract v1.3 (Ticket-04): giữ nguyên mọi tuning của v1.0–v1.2, thêm bench_cmd và soak_cmd.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUNING } from "../src/sim/tuning.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const c = JSON.parse(fs.readFileSync(path.join(ROOT, "game.contract.json"), "utf8"));
const errs = [];

// Giá trị chuẩn do Ticket-02 quy định (viết lại ở đây một lần nữa để lỗi gõ ở tuning.js cũng bị bắt)
const STANDARD = {
  player_speed: 6.0, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5, pickup_radius: 1.0, interact_radius: 2.0,
  pulse_cost: 3, pulse_radius: 5.0, night1_duration_s: 240, flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2.0,
  pulse_push_m: 4.0, pulse_cooldown_s: 3.0, safe_radius: 6.0, shade_speed: 4.0, shade_hit_radius: 1.0, fall_enabled: true,
  dash_speed: 14.0, dash_duration_s: 0.2, dash_cooldown_s: 1.5, night2_duration_s: 270, night3_duration_s: 300,
  // Ticket-03 mục 7.1
  fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
};
// Ticket-03 mục 5 (thay toàn bộ công thức điểm cũ; không còn per_second_left)
const STANDARD_SCORE = { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_dawn_lantern: 50, per_flame_left: 50 };

const REQUIRED_TOP = ["contract_version", "team", "build_cmd", "run_cmd", "headless_cmd", "bench_cmd", "soak_cmd", "tuning"];
for (const k of REQUIRED_TOP) if (!(k in c)) errs.push(`thiếu khóa ${k}`);
if (c.contract_version !== "1.3") errs.push(`contract_version phải là "1.3" (đang ${c.contract_version})`);
for (const k of ["bench_cmd", "soak_cmd", "run_cmd"]) if (typeof c[k] !== "string" || !c[k].trim()) errs.push(`${k} phải là chuỗi lệnh không rỗng`);
if (c.tuning && "per_second_left" in (c.tuning.score || {})) errs.push("tuning.score.per_second_left đã bị bỏ ở Ticket-03");
for (const [k, v] of Object.entries(STANDARD)) {
  if (!(k in (c.tuning || {}))) errs.push(`tuning thiếu ${k}`);
  else {
    if (c.tuning[k] !== v) errs.push(`tuning.${k}: contract=${c.tuning[k]} nhưng số chuẩn của ticket là ${v}`);
    if (TUNING[k] !== v) errs.push(`tuning.${k}: src/sim/tuning.js=${TUNING[k]} nhưng số chuẩn của ticket là ${v}`);
  }
}
for (const [k, v] of Object.entries(STANDARD_SCORE)) {
  if (c.tuning?.score?.[k] !== v) errs.push(`tuning.score.${k}: contract=${c.tuning?.score?.[k]} nhưng số chuẩn là ${v}`);
  if (TUNING.score[k] !== v) errs.push(`tuning.score.${k}: src/sim/tuning.js=${TUNING.score[k]} nhưng số chuẩn là ${v}`);
}

if (errs.length) {
  console.error("Contract: FAIL\n- " + errs.join("\n- "));
  process.exitCode = 1;
} else console.log(`Contract: PASS (v1.3: ${Object.keys(STANDARD).length} khóa tuning + ${Object.keys(STANDARD_SCORE).length} khóa score khớp số chuẩn của ticket và src/sim/tuning.js)`);
