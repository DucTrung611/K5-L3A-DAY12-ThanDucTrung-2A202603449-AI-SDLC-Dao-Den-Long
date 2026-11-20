// Phase 4 (Ticket-04): bảng xếp hạng, công thức benchmark, cảnh benchmark, soak, đổi phím, lệnh xuất CLI.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addEntry, normalizeEntries, isValidName, nameError, qualifies, LEADERBOARD_SIZE } from "../../src/sim/leaderboard.js";
import { benchStats, percentile } from "../../scripts/lib/benchstats.js";
import { createBenchGame, stepBench, benchCamera, BENCH } from "../../src/sim/bench.js";
import { runSoakNight, soakNightOf } from "../../src/sim/soak.js";
import { sanitizeKeys, findConflict, DEFAULT_KEYS, ACTIONS, normalizeCode, keyLabel } from "../../src/client/keymap.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entry = (name, score, at, extra = {}) => ({ name, score, nights_won: 1, achieved_at: at, seed: 1, ...extra });

// ---------- bảng xếp hạng ----------
test("tên: 3–12 ký tự [A-Za-z0-9_] (cho phép chữ Latin có dấu)", () => {
  for (const ok of ["abc", "Mây_01", "A".repeat(12), "Nguyen_Van", "x_1"]) assert.equal(isValidName(ok), true, ok);
  for (const bad of ["ab", "A".repeat(13), "có khoảng", "a-b-c", "tên!", "", "日本語です", "a.b.c"]) assert.equal(isValidName(bad), false, bad);
  assert.equal(nameError("ab"), "Tên phải dài 3–12 ký tự");
  assert.equal(nameError("a b c"), "Tên chỉ gồm chữ, số và dấu gạch dưới (_)");
  assert.equal(nameError("hop_le"), null);
});

test("xếp hạng: điểm giảm dần, bằng điểm thì achieved_at sớm hơn đứng trên", () => {
  let list = [];
  list = addEntry(list, entry("Late", 500, "2026-11-20T10:00:00+07:00")).entries;
  list = addEntry(list, entry("Top", 900, "2026-11-20T11:00:00+07:00")).entries;
  list = addEntry(list, entry("Early", 500, "2026-11-20T09:00:00+07:00")).entries;
  assert.deepEqual(list.map((e) => e.name), ["Top", "Early", "Late"]);
});

test("xếp hạng: so thời điểm theo tức thời, không theo chuỗi (khác múi giờ)", () => {
  // 10:00+07:00 = 03:00Z sớm hơn 05:00Z dù chuỗi "10:00" > "05:00"
  const a = entry("Vn_time", 100, "2026-11-20T10:00:00+07:00");
  const b = entry("Utc_time", 100, "2026-11-20T05:00:00Z");
  assert.deepEqual(normalizeEntries([b, a]).map((e) => e.name), ["Vn_time", "Utc_time"]);
});

test("xếp hạng: chỉ giữ top 10, bản ghi thấp nhất bị loại, rank trả về đúng", () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, entry("P" + String(i).padStart(2, "0"), i * 10, `2026-11-20T10:${String(i).padStart(2, "0")}:00+07:00`)).entries;
  assert.equal(list.length, LEADERBOARD_SIZE);
  assert.equal(list[0].name, "P11");
  assert.equal(list[9].name, "P02"); // P00 và P01 bị loại
  const r = addEntry(list, entry("Mid", 55, "2026-11-20T12:00:00+07:00"));
  assert.equal(r.rank, 7);
  assert.equal(addEntry(list, entry("Low", 1, "2026-11-20T12:00:00+07:00")).rank, null);
  assert.equal(qualifies(list, 1), false);
  assert.equal(qualifies(list, 20), true);
});

test("xếp hạng: bản ghi sai bị từ chối/lọc; dữ liệu hỏng trên đĩa không làm sập", () => {
  assert.throws(() => addEntry([], entry("ab", 1, "2026-11-20T10:00:00+07:00")));
  assert.throws(() => addEntry([], entry("hop_le", 1, "2026-11-20 10:00:00")), /không hợp lệ/); // thiếu T và múi giờ
  assert.throws(() => addEntry([], entry("hop_le", 1, "2026-11-20T10:00:00+07:00", { nights_won: 4 })));
  assert.throws(() => addEntry([], entry("hop_le", -1, "2026-11-20T10:00:00+07:00")));
  assert.deepEqual(normalizeEntries("rác"), []);
  assert.equal(normalizeEntries([null, 3, { name: "x" }, entry("ok_ten", 5, "2026-11-20T10:00:00+07:00")]).length, 1);
});

test("CLI: --export-leaderboard xuất {entries} đúng thứ tự, cả hai lệnh (run_cmd và headless_cmd)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-lb-"));
  const src = path.join(dir, "lb.json");
  fs.writeFileSync(src, JSON.stringify({ entries: [entry("Low", 10, "2026-11-20T10:00:00+07:00"), entry("High", 99, "2026-11-20T11:00:00+07:00")] }));
  for (const script of ["scripts/run.js", "src/headless/cli.js"]) {
    const out = path.join(dir, path.basename(script) + ".json");
    const r = spawnSync(process.execPath, [path.join(ROOT, script), "--export-leaderboard", out], { env: { ...process.env, DDL_LEADERBOARD: src }, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const j = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepEqual(j.entries.map((e) => e.name), ["High", "Low"]);
    assert.deepEqual(Object.keys(j.entries[0]).sort(), ["achieved_at", "name", "nights_won", "score", "seed"]);
  }
  const none = spawnSync(process.execPath, [path.join(ROOT, "scripts/run.js"), "--export-leaderboard", path.join(dir, "e.json")], { env: { ...process.env, DDL_LEADERBOARD: path.join(dir, "khong-co.json") }, encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "e.json"), "utf8")), { entries: [] });
});

// ---------- công thức benchmark ----------
test("benchStats: avg_fps, p1_low_fps, p95 đúng công thức của ticket", () => {
  const same = Array(100).fill(10);
  assert.deepEqual(benchStats(same), { frames: 100, avg_fps: 100, p1_low_fps: 100, frame_ms_p95: 10 });
  // 200 khung: k = ceil(2) = 2 giá trị dt lớn nhất (100, 50) -> p1 = 1000 / 75
  const mixed = [...Array(198).fill(10), 50, 100];
  const s = benchStats(mixed);
  assert.equal(s.frames, 200);
  assert.equal(s.avg_fps, Math.round(((1000 * 200) / (1980 + 150)) * 10) / 10);
  assert.equal(s.p1_low_fps, Math.round((1000 / 75) * 10) / 10);
  assert.equal(s.frame_ms_p95, 10);
  // N nhỏ: k = max(1, ceil(0.01 N)) = 1
  assert.equal(benchStats([20, 10]).p1_low_fps, 50);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95), 10);
  assert.equal(percentile(Array.from({ length: 100 }, (_, i) => i + 1), 0.95), 95);
});

// ---------- cảnh benchmark ----------
test("cảnh benchmark: Đêm 1, đúng 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng fuel 100, Mây ở (0,0,0)", () => {
  const g = createBenchGame(42);
  assert.equal(g.night, 1);
  assert.equal(g.shades.length, BENCH.shades);
  assert.ok(g.shades.every((s) => s.state === "wander"));
  assert.equal(g.motes.length, BENCH.motes);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  for (const id of ["L1", "L2", "L3"]) {
    const L = g.lanterns.find((l) => l.id === id);
    assert.equal(L.lit, true);
    assert.equal(L.fuelU, g.fu.max);
  }
  // rải đều: không dồn một chỗ (mỗi góc phần tư có ít nhất 30 con)
  const quad = [0, 0, 0, 0];
  for (const s of g.shades) quad[(s.pos[0] >= 0 ? 1 : 0) + (s.pos[2] >= 0 ? 2 : 0)]++;
  assert.ok(quad.every((n) => n >= 30), JSON.stringify(quad));
});

test("cảnh benchmark: sau 10 giây mô phỏng vẫn đúng 200/100, không đổi dầu/Ngọn Lửa/kết thúc Đêm; shade có di chuyển", () => {
  const g = createBenchGame(42);
  const before = g.shades.map((s) => [...s.pos]);
  for (let i = 0; i < 600; i++) {
    stepBench(g);
    assert.equal(g.state, "playing");
  }
  assert.equal(g.shades.length, 200);
  assert.equal(g.motes.length, 100);
  assert.equal(g.player.flames, 3);
  assert.equal(g.player.carried, 0);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.ok(g.shades.every((s) => s.state === "wander"));
  for (const id of ["L1", "L2", "L3"]) assert.equal(g.lanterns.find((l) => l.id === id).fuelU, g.fu.max);
  const moved = g.shades.filter((s, i) => Math.hypot(s.pos[0] - before[i][0], s.pos[2] - before[i][2]) > 1).length;
  assert.ok(moved > 100, `chỉ ${moved} Bóng Mực di chuyển`);
});

test("cảnh benchmark: tất định theo seed", () => {
  const run = (seed) => {
    const g = createBenchGame(seed);
    for (let i = 0; i < 300; i++) stepBench(g);
    return JSON.stringify(g.shades.map((s) => s.pos));
  };
  assert.equal(run(42), run(42));
  assert.notEqual(run(42), run(43));
});

test("camera benchmark: quỹ đạo tròn r=30, Y=15, xuất phát (30,15,0), ngược chiều kim đồng hồ, chu kỳ 15 s", () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(near(benchCamera(0).pos, [30, 15, 0]));
  assert.ok(near(benchCamera(3.75).pos, [0, 15, -30])); // 90° ngược chiều kim đồng hồ nhìn từ trên xuống (+X phải, +Z xuống)
  assert.ok(near(benchCamera(7.5).pos, [-30, 15, 0]));
  assert.ok(near(benchCamera(15).pos, [30, 15, 0]));
  assert.deepEqual(benchCamera(4.2).look, [0, 0, 0]);
  const p = benchCamera(2.2).pos;
  assert.ok(Math.abs(Math.hypot(p[0], p[2]) - 30) < 1e-9);
});

// ---------- soak ----------
test("soak: một Đêm chạy hết, tất định theo seed, bản đồ xoay vòng 1→2→3→1", () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(soakNightOf), [1, 2, 3, 1, 1]);
  const a = runSoakNight(7, 1);
  const b = runSoakNight(7, 1);
  assert.equal(a.result, b.result);
  assert.equal(a.ticks, b.ticks);
  assert.equal(a.game.score, b.game.score);
  assert.ok(["won", "lost"].includes(a.result));
  assert.ok(a.ticks > 1000);
  assert.ok(runSoakNight(8, 2).ticks > 1000);
});

test("soak CLI: 10 đêm, không sập, ghi đủ trường, RSS không phình quá 20%", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ddl-soak-")), "soak.json");
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/soak.js"), "--seed", "7", "--nights", "10", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.deepEqual(Object.keys(j), ["nights", "crashes", "results", "mem_start_mb", "mem_end_mb", "duration_s"]);
  assert.equal(j.nights, 10);
  assert.equal(j.crashes, 0);
  assert.equal(j.results.length, 10);
  assert.ok(j.mem_end_mb <= 1.2 * j.mem_start_mb);
  const bad = spawnSync(process.execPath, [path.join(ROOT, "scripts/soak.js"), "--seed", "x", "--nights", "10", "--out", out], { encoding: "utf8" });
  assert.equal(bad.status, 1);
});

// ---------- đổi phím ----------
test("đổi phím: mặc định đủ 9 hành động, không trùng; phát hiện trùng; cấu hình hỏng được sửa", () => {
  assert.equal(ACTIONS.length, 9);
  assert.equal(new Set(ACTIONS.map(([a]) => DEFAULT_KEYS[a])).size, 9);
  assert.equal(findConflict(DEFAULT_KEYS, "KeyE", "jump"), "interact");
  assert.equal(findConflict(DEFAULT_KEYS, "KeyE", "interact"), null); // bấm lại chính phím của mình không phải trùng
  assert.equal(findConflict(DEFAULT_KEYS, "ShiftRight", "jump"), "dash"); // Shift phải = Shift trái
  assert.equal(findConflict(DEFAULT_KEYS, "KeyZ", "jump"), null);
  const dup = sanitizeKeys({ ...DEFAULT_KEYS, jump: "KeyE" }); // jump trùng interact
  assert.equal(new Set(Object.values(dup)).size, 9);
  assert.deepEqual(sanitizeKeys(null), DEFAULT_KEYS);
  assert.equal(sanitizeKeys({ up: "ArrowLeft" }).up, DEFAULT_KEYS.up); // phím dành riêng không gán được
  assert.equal(sanitizeKeys({ up: "KeyI" }).up, "KeyI");
  assert.equal(normalizeCode("ControlRight"), "ControlLeft");
  assert.equal(keyLabel("KeyW"), "W");
  assert.equal(keyLabel("Space"), "Space");
});
