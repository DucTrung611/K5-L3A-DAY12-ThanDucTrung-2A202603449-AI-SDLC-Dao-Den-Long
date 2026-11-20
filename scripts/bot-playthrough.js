#!/usr/bin/env node
// Kiểm chứng "Đêm 1 chơi được từ đầu tới thắng/thua":
// 1) bot chơi trong tiến trình -> ghi file inputs theo contract
// 2) phát lại inputs bằng CLI headless (hộp đen) -> end line phải khớp kết quả của bot.
// Dùng: node scripts/bot-playthrough.js [--out-dir out/bot] [--json out.json] [--seeds 1,2,3]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { playBot } from "./lib/bot.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const outDir = path.resolve(ROOT, opt("--out-dir", "out/bot"));
const seeds = opt("--seeds", "1,2,3,4,5").split(",").map(Number);
fs.mkdirSync(outDir, { recursive: true });

const rows = [];
let replayOk = true;
for (const seed of seeds) {
  const bot = playBot({ seed });
  const inputs = path.join(outDir, `seed${seed}-inputs.json`);
  const out = path.join(outDir, `seed${seed}.jsonl`);
  fs.writeFileSync(inputs, JSON.stringify({ frames: bot.frames }));
  const r = spawnSync(process.execPath, ["src/headless/cli.js", "--seed", String(seed), "--night", "1", "--inputs", path.relative(ROOT, inputs), "--ticks", "18000", "--out", path.relative(ROOT, out), "--snapshot-every", "60"], { cwd: ROOT, encoding: "utf8" });
  const end = r.status === 0 ? JSON.parse(fs.readFileSync(out, "utf8").trim().split("\n").pop()) : null;
  const match = !!end && end.state === bot.result && end.ticks === bot.ticks && end.score === bot.score;
  replayOk &&= match;
  rows.push({ seed, bot: `${bot.result}/${bot.reason}`, ticks: bot.ticks, score: bot.score, flames_left: bot.flames, motes: bot.stats.picked, stuns: bot.stats.stunned, hits: bot.stats.hits, replay_end: end, replay_matches: match });
}
console.log("seed  kết quả            tick   điểm  lửa  nhặt  xua  trúng  CLI phát lại khớp");
for (const r of rows) console.log(`${String(r.seed).padEnd(5)} ${r.bot.padEnd(18)} ${String(r.ticks).padEnd(6)} ${String(r.score).padEnd(5)} ${String(r.flames_left).padEnd(4)} ${String(r.motes).padEnd(5)} ${String(r.stuns).padEnd(4)} ${String(r.hits).padEnd(6)} ${r.replay_matches ? "CÓ" : "KHÔNG"}`);
const wins = rows.filter((r) => r.bot.startsWith("won")).length;
console.log(`\nBot thắng ${wins}/${rows.length} seed; phát lại qua CLI ${replayOk ? "khớp 100%" : "CÓ SAI LỆCH"}`);
if (opt("--json")) fs.writeFileSync(path.resolve(ROOT, opt("--json")), JSON.stringify({ rows, wins, replay_ok: replayOk }, null, 2) + "\n");
process.exitCode = replayOk && wins > 0 ? 0 : 1;
