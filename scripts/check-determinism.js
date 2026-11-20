#!/usr/bin/env node
// Kiểm tra tính tất định: cùng seed + scenario + inputs -> output giống hệt (so byte) giữa 2 lần chạy CLI riêng biệt,
// cho cả 3 đêm (Đêm 2 có Gió Lạc/bùa/bục nhảy, Đêm 3 có gió mạnh/địa hình tầng).
// Scenario: người chơi bất tử. Inputs: đi vòng quanh, bấm interact/pulse/jump/dash/pause định kỳ (tất định, sinh bằng công thức), thế giới mặc định (sinh ngẫu nhiên bật).
// Ngoài ra kiểm tra seed khác -> output khác.
// Dùng: node scripts/check-determinism.js [--json out.json]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out", "determinism");
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const TICKS = 21600; // 1 đêm dài nhất (ticket: tối đa 21.600 tick)

const frames = [];
for (let t = 0; t < TICKS; t += 30) {
  const a = t / 240;
  const f = { tick: t, move: [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a * 1.3) * 1000) / 1000], cam_yaw_deg: (t / 10) % 360 };
  const phase = (t / 30) % 12;
  f.interact = phase === 1 || phase === 7;
  f.pulse = phase === 3;
  f.jump = phase === 6;
  f.dash = phase === 9;
  f.pause = phase === 11 && t % 3600 < 90; // thỉnh thoảng bấm tạm dừng/tiếp tục
  frames.push(f);
}
const inputsFile = path.join(OUT, "inputs-tour.json");
fs.writeFileSync(inputsFile, JSON.stringify({ frames }));
// Người chơi "bất tử" (100000 lửa) để mỗi lượt chạy trọn cả đêm, phủ hết lịch sinh dài (Gió Lạc ở tick 1200/2400..., gió Đêm 3 ở tick 1800...)
const scenarioFile = path.join(OUT, "scenario-immortal.json");
fs.writeFileSync(scenarioFile, JSON.stringify({ player: { flames: 100000 } }));

const run = (night, seed, tag) => {
  const out = path.join(OUT, `n${night}-seed${seed}-${tag}.jsonl`);
  const t0 = process.hrtime.bigint();
  const r = spawnSync(
    process.execPath,
    ["src/headless/cli.js", "--seed", String(seed), "--night", String(night), "--inputs", path.relative(ROOT, inputsFile), "--scenario", path.relative(ROOT, scenarioFile), "--ticks", String(TICKS), "--out", path.relative(ROOT, out), "--snapshot-every", "10"],
    { cwd: ROOT, encoding: "utf8" },
  );
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (r.status !== 0) throw new Error(`đêm ${night} seed ${seed}: exit ${r.status} ${r.stderr}`);
  const buf = fs.readFileSync(out);
  return { sha: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length, last: buf.toString().trim().split("\n").pop(), ms };
};

const seeds = [1, 7, 42];
const rows = [];
let ok = true;
for (const night of [1, 2, 3]) {
  for (const s of seeds) {
    const a = run(night, s, "a");
    const b = run(night, s, "b");
    const same = a.sha === b.sha;
    ok &&= same;
    rows.push({ night, seed: s, run1: a.sha.slice(0, 16), run2: b.sha.slice(0, 16), bytes: a.bytes, identical: same, end: a.last, ms: Math.round(Math.min(a.ms, b.ms)) });
  }
}
const distinct = [1, 2, 3].every((n) => new Set(rows.filter((r) => r.night === n).map((r) => r.run1)).size === seeds.length);
ok &&= distinct;

for (const r of rows) console.log(`đêm ${r.night} seed ${String(r.seed).padEnd(3)} ${r.run1} ${r.run2} ${r.identical ? "GIỐNG" : "KHÁC!"} ${String(r.ms).padStart(5)} ms  ${r.end}`);
console.log(distinct ? "Các seed khác nhau cho output khác nhau: OK" : "LỖI: seed khác nhau nhưng output trùng");
console.log(ok ? "Determinism: PASS" : "Determinism: FAIL");
if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify({ ticks: TICKS, runs: rows, distinct_seeds_differ: distinct, pass: ok }, null, 2) + "\n");
process.exitCode = ok ? 0 : 1;
