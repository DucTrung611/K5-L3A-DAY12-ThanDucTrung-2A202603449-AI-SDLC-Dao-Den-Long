#!/usr/bin/env node
// Chạy toàn bộ kiểm chứng và lưu bằng chứng THẬT vào docs/proof/phase-N/ (không sửa tay).
// Dùng: npm run proof -- --phase 1
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const phase = args.includes("--phase") ? args[args.indexOf("--phase") + 1] : "1";
const dir = path.join(ROOT, "docs", "proof", `phase-${phase}`);
fs.mkdirSync(dir, { recursive: true });
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
const node = (argv) => spawnSync(process.execPath, argv, { cwd: ROOT, encoding: "utf8" });
const sh = (c) => {
  try {
    return execSync(c, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const out = [];
const log = (s = "") => out.push(s);

// 1. contract
const contract = node(["scripts/check-contract.js"]);
// 2. unit test
const unit = node(["--test", "--test-reporter=tap", "tests/unit/*.test.js"]);
const unitPass = (unit.stdout.match(/^# pass (\d+)/m) || [])[1];
const unitFail = (unit.stdout.match(/^# fail (\d+)/m) || [])[1];
fs.writeFileSync(path.join(dir, "unit-tests.tap"), unit.stdout);
// 3. scenarios
const scenDir = path.join(dir, "scenarios");
fs.rmSync(scenDir, { recursive: true, force: true });
const scen = node(["scripts/run-scenarios.js", "--out-dir", rel(scenDir), "--json", rel(path.join(dir, "scenarios.json"))]);
const scenRes = JSON.parse(fs.readFileSync(path.join(dir, "scenarios.json"), "utf8"));
// 4. determinism
const det = node(["scripts/check-determinism.js", "--json", rel(path.join(dir, "determinism.json"))]);
const detRes = JSON.parse(fs.readFileSync(path.join(dir, "determinism.json"), "utf8"));
// 5. bot
const botDir = path.join(dir, "bot");
fs.rmSync(botDir, { recursive: true, force: true });
const bot = node(["scripts/bot-playthrough.js", "--out-dir", rel(botDir), "--json", rel(path.join(dir, "bot.json"))]);
const botRes = JSON.parse(fs.readFileSync(path.join(dir, "bot.json"), "utf8"));
// 6. hiệu năng headless: 1 đêm đầy đủ (18000 tick), sinh ngẫu nhiên bật, người chơi không thể chết
const perfScenario = path.join(ROOT, "out", "perf-scenario.json");
fs.mkdirSync(path.dirname(perfScenario), { recursive: true });
fs.writeFileSync(perfScenario, JSON.stringify({ player: { flames: 1000000 } }));
const perfRuns = [];
for (let i = 0; i < 3; i++) {
  const t0 = process.hrtime.bigint();
  const r = node(["src/headless/cli.js", "--seed", "11", "--night", "1", "--scenario", rel(perfScenario), "--ticks", "18000", "--out", "out/perf.jsonl"]);
  perfRuns.push({ ms: Number(process.hrtime.bigint() - t0) / 1e6, status: r.status });
}
const perfEnd = fs.readFileSync(path.join(ROOT, "out", "perf.jsonl"), "utf8").trim().split("\n").pop();
const perfMs = Math.min(...perfRuns.map((r) => r.ms));

const commit = sh("git rev-parse --short HEAD") || "(chưa có commit)";
const dirty = sh("git status --porcelain") ? " + thay đổi chưa commit" : "";
const passScen = scenRes.filter((r) => r.pass).length;
const allOk = contract.status === 0 && unit.status === 0 && scen.status === 0 && det.status === 0 && bot.status === 0;

log(`# Kết quả kiểm chứng Phase ${phase} (tự sinh bởi \`npm run proof -- --phase ${phase}\`)`);
log();
log(`- Thời điểm: ${new Date().toISOString()}`);
log(`- Mã nguồn: commit \`${commit}\`${dirty}`);
log(`- Máy: ${os.type()} ${os.release()} · ${os.cpus()[0]?.model?.trim()} ×${os.cpus().length} · RAM ${Math.round(os.totalmem() / 2 ** 30)} GB · Node ${process.version}`);
log(`- Tổng: **${allOk ? "TẤT CẢ ĐẠT" : "CÓ MỤC CHƯA ĐẠT"}**`);
log();
log("| Kiểm chứng | Lệnh | Kết quả |");
log("|---|---|---|");
log(`| Contract khớp tuning | \`npm run contract\` | ${contract.status === 0 ? "ĐẠT" : "CHƯA ĐẠT"} |`);
log(`| Unit test | \`npm test\` | ${unit.status === 0 ? "ĐẠT" : "CHƯA ĐẠT"} (${unitPass} pass / ${unitFail} fail) – [unit-tests.tap](unit-tests.tap) |`);
log(`| Scenario headless (hộp đen qua CLI) | \`npm run scenarios\` | ${passScen}/${scenRes.length} ĐẠT – [scenarios.json](scenarios.json) |`);
log(`| Tất định (4 seed × 2 lần, 18000 tick) | \`npm run determinism\` | ${detRes.pass ? "ĐẠT" : "CHƯA ĐẠT"} – [determinism.json](determinism.json) |`);
log(`| Bot chơi từ đầu tới kết thúc + phát lại CLI | \`npm run bot\` | thắng ${botRes.wins}/${botRes.rows.length}, phát lại ${botRes.replay_ok ? "khớp" : "LỆCH"} – [bot.json](bot.json) |`);
log();
log("## Scenario");
log();
log("| Scenario | Yêu cầu | Mô tả (expect tính tay) | Kết quả | Output |");
log("|---|---|---|---|---|");
for (const r of scenRes) {
  const f = path.join(scenDir, `${r.name}.jsonl`);
  const link = fs.existsSync(f) ? `[jsonl](scenarios/${r.name}.jsonl)` : "(exit ≠ 0, không có output)";
  log(`| \`${r.name}\` | ${r.requirement || ""} | ${(r.description || "").replace(/\|/g, "/")} | ${r.pass ? "ĐẠT" : "CHƯA ĐẠT: " + r.errors.join("; ")} | ${link} |`);
}
log();
log("## Tất định");
log();
log("| Seed | sha256 lần 1 | sha256 lần 2 | Giống nhau | Dòng end |");
log("|---|---|---|---|---|");
for (const r of detRes.seeds) log(`| ${r.seed} | \`${r.run1}\` | \`${r.run2}\` | ${r.identical ? "Có" : "KHÔNG"} | \`${r.end}\` |`);
log(`\nSeed khác nhau cho output khác nhau: ${detRes.distinct_seeds_differ ? "Có" : "KHÔNG"}.`);
log();
log("## Bot playthrough (Đêm 1 chơi được từ đầu tới thắng)");
log();
log("| Seed | Kết quả | Tick | Điểm | Lửa còn | Đom đóm nhặt | Lần xua | Lần bị chạm | Phát lại CLI khớp |");
log("|---|---|---|---|---|---|---|---|---|");
for (const r of botRes.rows) log(`| ${r.seed} | ${r.bot} | ${r.ticks} | ${r.score} | ${r.flames_left} | ${r.motes} | ${r.stuns} | ${r.hits} | ${r.replay_matches ? "Có" : "KHÔNG"} – [inputs](bot/seed${r.seed}-inputs.json) · [output](bot/seed${r.seed}.jsonl) |`);
log();
log("## Hiệu năng headless");
log();
log(`1 đêm đầy đủ 18000 tick (300 s game), sinh ngẫu nhiên bật, snapshot mỗi 10 tick, 3 lần chạy: ${perfRuns.map((r) => r.ms.toFixed(0) + " ms").join(", ")} (gồm khởi động Node).`);
log(`Nhanh nhất ${perfMs.toFixed(0)} ms ≈ ${Math.round(18000 / (perfMs / 1000)).toLocaleString("en-US")} tick/giây (≈ ${Math.round(18000 / (perfMs / 1000) / 60)}× thời gian thực). Dòng end: \`${perfEnd}\`.`);
fs.writeFileSync(path.join(dir, "results.md"), out.join("\n") + "\n");
console.log(out.slice(0, 12).join("\n"));
console.log(`\n-> ${rel(path.join(dir, "results.md"))}`);
process.exitCode = allOk ? 0 : 1;
