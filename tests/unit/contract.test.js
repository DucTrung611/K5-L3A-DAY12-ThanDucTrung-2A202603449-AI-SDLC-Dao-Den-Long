import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUNING } from "../../src/sim/tuning.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "game.contract.json"), "utf8"));

test("game.contract.json: tuning khớp đúng số game đang dùng", () => {
  assert.deepEqual(contract.tuning, JSON.parse(JSON.stringify(TUNING)));
});

// Phase 2: contract v1.1; Phase 3 (Ticket-03): v1.2 (test kiểm "1.1" được sửa theo ticket, không bỏ).
test("game.contract.json: các khóa bắt buộc của v1.2", () => {
  assert.equal(contract.contract_version, "1.2");
  for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd"]) assert.equal(typeof contract[k], "string");
  assert.equal(contract.tuning.lantern_count_night1, 5);
  assert.equal(contract.tuning.fall_enabled, true);
  for (const k of ["dash_speed", "dash_duration_s", "dash_cooldown_s", "night2_duration_s", "night3_duration_s"]) assert.equal(typeof contract.tuning[k], "number", k);
  for (const k of ["fuel_max", "fuel_decay_per_s", "fuel_per_mote", "relight_cost", "win_ratio", "drain_per_s", "low_fuel_threshold", "capacity_max"]) assert.equal(typeof contract.tuning[k], "number", k);
});

test("số chuẩn của Ticket-03 (viết tay lại, độc lập với tuning.js)", () => {
  const t = contract.tuning;
  assert.deepEqual([t.fuel_max, t.fuel_decay_per_s, t.fuel_per_mote, t.relight_cost, t.win_ratio, t.drain_per_s, t.low_fuel_threshold, t.capacity_max], [100, 1.0, 10, 5, 0.6, 5, 30, 20]);
  assert.deepEqual([t.night1_duration_s, t.night2_duration_s, t.night3_duration_s], [240, 270, 300]);
  assert.deepEqual(t.score, { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_dawn_lantern: 50, per_flame_left: 50 });
});

test("số chuẩn còn hiệu lực của Ticket-02 (viết tay lại, độc lập với tuning.js)", () => {
  const t = contract.tuning;
  assert.deepEqual(
    [t.player_speed, t.carry_capacity, t.lantern_cost, t.pickup_radius, t.interact_radius, t.pulse_cost, t.pulse_radius, t.pulse_cooldown_s, t.pulse_stun_s, t.pulse_push_m, t.safe_radius, t.shade_speed, t.invuln_s, t.flames],
    [6, 10, 10, 1, 2, 3, 5, 3, 2, 4, 6, 4, 1.5, 3],
  );
  // thời lượng đêm và công thức điểm của Ticket-02 bị Ticket-03 thay (kiểm ở test ngay trên)
  assert.deepEqual([t.dash_speed, t.dash_duration_s, t.dash_cooldown_s], [14, 0.2, 1.5]);
});

test("src/sim không dùng nguồn bất định (Math.random, Date, performance) và không import render", () => {
  const dir = path.join(ROOT, "src", "sim");
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /Math\.random|Date\.now|new Date|performance\.now/, `${f} dùng nguồn bất định`);
    assert.doesNotMatch(src, /from ["']three["']|document\.|window\./, `${f} phụ thuộc render/DOM`);
  }
});
