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

test("game.contract.json: các khóa bắt buộc", () => {
  assert.equal(contract.contract_version, "1.0");
  for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd"]) assert.equal(typeof contract[k], "string");
  assert.equal(contract.tuning.lantern_count_night1, 5);
  assert.equal(contract.tuning.fall_enabled, false);
});

test("src/sim không dùng nguồn bất định (Math.random, Date, performance) và không import render", () => {
  const dir = path.join(ROOT, "src", "sim");
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /Math\.random|Date\.now|new Date|performance\.now/, `${f} dùng nguồn bất định`);
    assert.doesNotMatch(src, /from ["']three["']|document\.|window\./, `${f} phụ thuộc render/DOM`);
  }
});
