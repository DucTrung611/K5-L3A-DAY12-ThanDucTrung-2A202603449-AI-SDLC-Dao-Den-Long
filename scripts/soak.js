#!/usr/bin/env node
// node scripts/soak.js --seed 7 --nights 10 --out soak.json   (Ticket-04 mục 2; mã thoát 0 nếu chạy xong, 1 nếu lỗi tham số)
import fs from "node:fs";
import path from "node:path";
import v8 from "node:v8";
import vm from "node:vm";
import { createGame } from "../src/sim/game.js";
import { runSoakNight, soakNightOf } from "../src/sim/soak.js";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : def;
};
const seed = Number(opt("seed", 7));
const nights = Number(opt("nights", 10));
const out = opt("out");
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1 || !out) {
  process.stderr.write("Cách dùng: node scripts/soak.js --seed 7 --nights 10 --out soak.json\n");
  process.exit(1);
}
v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc");
const mb = () => {
  gc(); // đo RSS sau khi dọn rác để phản ánh rò rỉ thật chứ không phải rác chưa thu
  return Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
};

const t0 = process.hrtime.bigint();
const results = [];
let crashes = 0;
let memStart = null;
for (let i = 0; i < nights; i++) {
  const night = soakNightOf(i);
  try {
    if (i === 0) {
      createGame({ seed: seed + i, night }); // "tải xong Đêm đầu tiên"
      memStart = mb();
    }
    results.push(runSoakNight(seed + i, night).result);
  } catch (e) {
    crashes++;
    results.push("crashed");
    process.stderr.write(`Đêm ${i + 1} (seed ${seed + i}) sập: ${e && e.stack ? e.stack : e}\n`);
  }
}
const memEnd = mb(); // sau khi reset xong Đêm cuối (game cuối đã ra khỏi phạm vi)
const report = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: memEnd,
  duration_s: Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 10) / 10,
};
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
const pass = crashes === 0 && memEnd <= 1.2 * memStart;
console.log(`Soak: ${pass ? "PASS" : "FAIL"} – ${nights} đêm, crashes=${crashes}, RSS ${memStart} -> ${memEnd} MB (ngưỡng ${(1.2 * memStart).toFixed(1)}), ${report.duration_s}s`);
process.exitCode = pass ? 0 : 1;
