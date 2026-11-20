#!/usr/bin/env node
// Headless CLI theo Test Contract v1.0 mục B.
// node src/headless/cli.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//                          --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
// Mã thoát: 0 thành công; 1 lỗi tham số/lỗi chạy; 2 file scenario/inputs sai định dạng.

import fs from "node:fs";
import path from "node:path";
import { runHeadless } from "../sim/run.js";
import { validateScenario, validateInputs, FormatError } from "../sim/validate.js";

class ArgError extends Error {}

function parseArgs(argv) {
  const known = new Set(["--seed", "--night", "--scenario", "--inputs", "--ticks", "--out", "--snapshot-every"]);
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!known.has(k)) throw new ArgError(`tham số không hợp lệ: ${k}`);
    const v = argv[i + 1];
    if (v === undefined || (v.startsWith("--") && known.has(v))) throw new ArgError(`thiếu giá trị cho ${k}`);
    a[k.slice(2)] = v;
    i++;
  }
  const int = (name, { required, min, def }) => {
    if (a[name] === undefined) {
      if (required) throw new ArgError(`thiếu --${name}`);
      return def;
    }
    if (!/^-?\d+$/.test(a[name])) throw new ArgError(`--${name} phải là số nguyên`);
    const n = Number(a[name]);
    if (min !== undefined && n < min) throw new ArgError(`--${name} phải >= ${min}`);
    return n;
  };
  const opts = {
    seed: int("seed", { required: true }),
    night: int("night", { required: true, min: 1 }),
    ticks: int("ticks", { required: true, min: 0 }),
    snapshotEvery: int("snapshot-every", { required: false, min: 1, def: 10 }),
    scenario: a.scenario,
    inputs: a.inputs,
    out: a.out,
  };
  if (![1, 2, 3].includes(opts.night)) throw new ArgError(`--night phải là 1, 2 hoặc 3 (nhận ${opts.night})`);
  if (!opts.out) throw new ArgError("thiếu --out");
  return opts;
}

function readJson(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    throw new FormatError(`${label}: không đọc được file ${file} (${e.code || e.message})`);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FormatError(`${label}: JSON không hợp lệ (${e.message})`);
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`Lỗi: ${e.message}\n`);
    return 1;
  }
  try {
    const scenario = opts.scenario ? validateScenario(readJson(opts.scenario, "scenario"), opts.night) : undefined;
    const inputs = opts.inputs ? validateInputs(readJson(opts.inputs, "inputs")) : undefined;
    const { lines } = runHeadless({
      seed: opts.seed,
      night: opts.night,
      scenario,
      inputs,
      ticks: opts.ticks,
      snapshotEvery: opts.snapshotEvery,
    });
    const dir = path.dirname(path.resolve(opts.out));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(opts.out, lines.join("\n") + "\n");
    return 0;
  } catch (e) {
    if (e instanceof FormatError) {
      process.stderr.write(`Lỗi định dạng: ${e.message}\n`);
      return 2;
    }
    process.stderr.write(`Lỗi: ${e && e.stack ? e.stack : e}\n`);
    return 1;
  }
}

process.exitCode = main();
