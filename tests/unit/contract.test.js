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

// Phase 2: contract v1.1 (test Phase 1 kiểm "1.0" và fall_enabled=false nên được sửa theo Ticket-02, không bỏ).
test("game.contract.json: các khóa bắt buộc của v1.1", () => {
  assert.equal(contract.contract_version, "1.1");
  for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd"]) assert.equal(typeof contract[k], "string");
  assert.equal(contract.tuning.lantern_count_night1, 5);
  assert.equal(contract.tuning.fall_enabled, true);
  for (const k of ["dash_speed", "dash_duration_s", "dash_cooldown_s", "night2_duration_s", "night3_duration_s"]) assert.equal(typeof contract.tuning[k], "number", k);
});

test("số chuẩn của Ticket-02 (viết tay lại, độc lập với tuning.js)", () => {
  const t = contract.tuning;
  assert.deepEqual(
    [t.player_speed, t.carry_capacity, t.lantern_cost, t.pickup_radius, t.interact_radius, t.pulse_cost, t.pulse_radius, t.pulse_cooldown_s, t.pulse_stun_s, t.pulse_push_m, t.safe_radius, t.shade_speed, t.invuln_s, t.flames],
    [6, 10, 10, 1, 2, 3, 5, 3, 2, 4, 6, 4, 1.5, 3],
  );
  assert.deepEqual([t.night1_duration_s, t.night2_duration_s, t.night3_duration_s], [300, 330, 360]);
  assert.deepEqual([t.dash_speed, t.dash_duration_s, t.dash_cooldown_s], [14, 0.2, 1.5]);
  assert.deepEqual(t.score, { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 });
});

test("src/sim không dùng nguồn bất định (Math.random, Date, performance) và không import render", () => {
  const dir = path.join(ROOT, "src", "sim");
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /Math\.random|Date\.now|new Date|performance\.now/, `${f} dùng nguồn bất định`);
    assert.doesNotMatch(src, /from ["']three["']|document\.|window\./, `${f} phụ thuộc render/DOM`);
  }
});
