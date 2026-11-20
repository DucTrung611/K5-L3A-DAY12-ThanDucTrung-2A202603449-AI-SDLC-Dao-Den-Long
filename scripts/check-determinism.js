#!/usr/bin/env node
// Kiểm tra tính tất định: cùng seed + scenario + inputs -> output giống hệt (so byte) giữa 2 lần chạy CLI riêng biệt.
// Dùng thế giới mặc định (sinh ngẫu nhiên bật) + inputs chạy vòng quanh đảo, nhặt/nạp/pulse, 1 đêm đầy đủ.
// Ngoài ra kiểm tra seed khác -> output khác (sinh ngẫu nhiên thật sự phụ thuộc seed).
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

// inputs: chạy hình sao quanh đảo, bấm interact/pulse/jump định kỳ (tất định, sinh bằng công thức)
const frames = [];
for (let t = 0; t < 18000; t += 30) {
  const a = t / 240;
  const f = { tick: t, move: [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a * 1.3) * 1000) / 1000], cam_yaw_deg: (t / 10) % 360 };
  const phase = (t / 30) % 8;
  f.interact = phase === 1 || phase === 5;
  f.pulse = phase === 3;
  f.jump = phase === 6;
  frames.push(f);
}
const inputsFile = path.join(OUT, "inputs-tour.json");
fs.writeFileSync(inputsFile, JSON.stringify({ frames }));

const run = (seed, tag) => {
  const out = path.join(OUT, `seed${seed}-${tag}.jsonl`);
  const r = spawnSync(
    process.execPath,
    ["src/headless/cli.js", "--seed", String(seed), "--night", "1", "--inputs", path.relative(ROOT, inputsFile), "--ticks", "18000", "--out", path.relative(ROOT, out), "--snapshot-every", "10"],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`seed ${seed}: exit ${r.status} ${r.stderr}`);
  const buf = fs.readFileSync(out);
  return { sha: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length, last: buf.toString().trim().split("\n").pop() };
};

const seeds = [1, 7, 42, 2026];
const rows = [];
let ok = true;
for (const s of seeds) {
  const a = run(s, "a");
  const b = run(s, "b");
  const same = a.sha === b.sha;
  ok &&= same;
  rows.push({ seed: s, run1: a.sha.slice(0, 16), run2: b.sha.slice(0, 16), bytes: a.bytes, identical: same, end: a.last });
}
const distinct = new Set(rows.map((r) => r.run1)).size === seeds.length;
ok &&= distinct;

for (const r of rows) console.log(`seed ${String(r.seed).padEnd(5)} ${r.run1} ${r.run2} ${r.identical ? "GIỐNG" : "KHÁC!"}  ${r.end}`);
console.log(distinct ? "Các seed khác nhau cho output khác nhau: OK" : "LỖI: seed khác nhau nhưng output trùng");
console.log(ok ? "Determinism: PASS" : "Determinism: FAIL");
if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify({ seeds: rows, distinct_seeds_differ: distinct, pass: ok }, null, 2) + "\n");
process.exitCode = ok ? 0 : 1;
