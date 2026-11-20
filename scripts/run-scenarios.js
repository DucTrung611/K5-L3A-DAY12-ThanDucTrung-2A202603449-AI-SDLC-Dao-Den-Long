#!/usr/bin/env node
// Chạy mọi scenario trong tests/scenarios/* qua headless_cmd của game.contract.json (kiểm thử hộp đen),
// kiểm tra định dạng JSONL + so với expect.json. Thoát 1 nếu có scenario FAIL.
// Dùng: node scripts/run-scenarios.js [--out-dir out/scenarios] [--json results.json] [--only tên]

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseJsonl, validateOutput } from "./lib/jsonl.js";
import { checkExpect } from "./lib/expect.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const outDir = path.resolve(ROOT, opt("--out-dir", "out/scenarios"));
const jsonOut = opt("--json");
const only = opt("--only");

const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "game.contract.json"), "utf8"));
const [cmd, ...cmdArgs] = contract.headless_cmd.split(" ");
const scenDir = path.join(ROOT, "tests", "scenarios");
fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const name of fs.readdirSync(scenDir).sort()) {
  if (only && name !== only) continue;
  const dir = path.join(scenDir, name);
  const specFile = path.join(dir, "expect.json");
  if (!fs.existsSync(specFile)) continue;
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const out = path.join(outDir, `${name}.jsonl`);
  if (fs.existsSync(out)) fs.rmSync(out);
  const night = spec.night ?? 1;
  const argv = [...cmdArgs, "--seed", String(spec.seed ?? 1), "--night", String(night), "--ticks", String(spec.ticks), "--out", path.relative(ROOT, out)];
  if (spec.snapshot_every) argv.push("--snapshot-every", String(spec.snapshot_every));
  for (const f of ["scenario", "inputs"]) {
    const p = path.join(dir, `${f}.json`);
    if (fs.existsSync(p)) argv.push(`--${f}`, path.relative(ROOT, p));
  }
  const t0 = process.hrtime.bigint();
  // headless_cmd bắt đầu bằng "node" -> gọi thẳng node hiện tại (không qua shell, an toàn với đường dẫn có dấu cách)
  const r = spawnSync(cmd === "node" ? process.execPath : cmd, argv, { cwd: ROOT, encoding: "utf8" });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const errs = [];
  const wantExit = spec.exit_code ?? 0;
  if (r.status !== wantExit) errs.push(`mã thoát ${r.status}, mong đợi ${wantExit}. stderr: ${(r.stderr || "").trim()}`);
  if (wantExit !== 0 && !(r.stderr || "").trim()) errs.push("lỗi nhưng không có thông báo stderr");
  if (wantExit === 0 && r.status === 0) {
    const objs = parseJsonl(fs.readFileSync(out, "utf8"));
    errs.push(...validateOutput(objs, { snapshotEvery: spec.snapshot_every || 10, ticks: spec.ticks, fallEnabled: contract.tuning.fall_enabled, night }));
    errs.push(...checkExpect(objs, spec, contract.tuning));
  }
  results.push({ name, requirement: spec.requirement, description: spec.description, pass: errs.length === 0, errors: errs, ms: Math.round(ms) });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("Scenario", 30) + pad("Req", 8) + pad("Kết quả", 10) + "ms");
for (const r of results) {
  console.log(pad(r.name, 30) + pad(r.requirement || "", 8) + pad(r.pass ? "PASS" : "FAIL", 10) + r.ms);
  for (const e of r.errors) console.log("    - " + e);
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} scenario PASS`);
if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify(results, null, 2) + "\n");
process.exitCode = failed ? 1 : 0;
