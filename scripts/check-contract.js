#!/usr/bin/env node
// So game.contract.json với src/sim/tuning.js (nguồn sự thật) – khai sai tuning sẽ làm trượt test ẩn.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUNING } from "../src/sim/tuning.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const c = JSON.parse(fs.readFileSync(path.join(ROOT, "game.contract.json"), "utf8"));
const errs = [];

const REQUIRED_TOP = ["contract_version", "team", "build_cmd", "run_cmd", "headless_cmd", "tuning"];
const REQUIRED_TUNING = [
  "player_speed", "carry_capacity", "lantern_cost", "lantern_count_night1", "pickup_radius", "interact_radius",
  "pulse_cost", "pulse_radius", "night1_duration_s", "flames", "invuln_s", "hit_drop_ratio", "pulse_stun_s",
  "pulse_push_m", "pulse_cooldown_s", "safe_radius", "shade_speed", "shade_hit_radius", "fall_enabled", "score",
];
const REQUIRED_SCORE = ["per_mote", "per_lantern", "per_stun", "per_second_left", "per_flame_left"];

for (const k of REQUIRED_TOP) if (!(k in c)) errs.push(`thiếu khóa ${k}`);
if (c.contract_version !== "1.0") errs.push(`contract_version phải là "1.0" (đang ${c.contract_version})`);
for (const k of REQUIRED_TUNING) {
  if (!(k in (c.tuning || {}))) errs.push(`tuning thiếu ${k}`);
  else if (k !== "score" && c.tuning[k] !== TUNING[k]) errs.push(`tuning.${k}: contract=${c.tuning[k]} nhưng game dùng ${TUNING[k]}`);
}
for (const k of REQUIRED_SCORE) {
  if (c.tuning?.score?.[k] !== TUNING.score[k]) errs.push(`tuning.score.${k}: contract=${c.tuning?.score?.[k]} nhưng game dùng ${TUNING.score[k]}`);
}
if (c.tuning?.lantern_count_night1 !== 5) errs.push("lantern_count_night1 phải là 5 theo PRD-0");

if (errs.length) {
  console.error("Contract: FAIL\n- " + errs.join("\n- "));
  process.exitCode = 1;
} else console.log(`Contract: PASS (${REQUIRED_TUNING.length - 1} khóa tuning + ${REQUIRED_SCORE.length} khóa score khớp src/sim/tuning.js)`);
