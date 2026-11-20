import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseJsonl, validateOutput } from "../../scripts/lib/jsonl.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-cli-"));
const cli = (...args) => spawnSync(process.execPath, ["src/headless/cli.js", ...args], { cwd: ROOT, encoding: "utf8" });
const tmp = (name, content) => {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
};

test("chạy thành công: exit 0, output đúng định dạng, dòng cuối là end", () => {
  const out = path.join(TMP, "ok.jsonl");
  const r = cli("--seed", "3", "--night", "1", "--ticks", "700", "--out", out, "--snapshot-every", "7");
  assert.equal(r.status, 0, r.stderr);
  const objs = parseJsonl(fs.readFileSync(out, "utf8"));
  assert.deepEqual(validateOutput(objs, { snapshotEvery: 7, ticks: 700 }), []);
  assert.equal(objs.at(-1).type, "end");
  assert.equal(objs.filter((o) => o.type === "snapshot").length, Math.floor(700 / 7) + 1);
});

test("--snapshot-every mặc định 10", () => {
  const out = path.join(TMP, "def.jsonl");
  assert.equal(cli("--seed", "1", "--night", "1", "--ticks", "35", "--out", out).status, 0);
  const ticks = parseJsonl(fs.readFileSync(out, "utf8")).filter((o) => o.type === "snapshot").map((o) => o.tick);
  assert.deepEqual(ticks, [0, 10, 20, 30]);
});

test("thiếu --seed -> exit 1 + stderr", () => {
  const r = cli("--night", "1", "--ticks", "10", "--out", path.join(TMP, "x.jsonl"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /seed/);
});

test("tham số lạ / night khác 1 -> exit khác 0", () => {
  assert.notEqual(cli("--seed", "1", "--night", "1", "--ticks", "1", "--out", path.join(TMP, "a.jsonl"), "--bogus", "1").status, 0);
  assert.notEqual(cli("--seed", "1", "--night", "2", "--ticks", "1", "--out", path.join(TMP, "b.jsonl")).status, 0);
});

test("inputs JSON hỏng -> exit 2", () => {
  const r = cli("--seed", "1", "--night", "1", "--ticks", "5", "--out", path.join(TMP, "c.jsonl"), "--inputs", tmp("bad.json", "{frames: ["));
  assert.equal(r.status, 2);
  assert.ok(r.stderr.length > 0);
});

test("inputs thiếu frames / nút không phải boolean -> exit 2", () => {
  const base = ["--seed", "1", "--night", "1", "--ticks", "5", "--out", path.join(TMP, "d.jsonl"), "--inputs"];
  assert.equal(cli(...base, tmp("nf.json", "{}")).status, 2);
  assert.equal(cli(...base, tmp("nb.json", JSON.stringify({ frames: [{ tick: 0, jump: 1 }] }))).status, 2);
});

test("scenario sai kiểu -> exit 2", () => {
  const base = ["--seed", "1", "--night", "1", "--ticks", "5", "--out", path.join(TMP, "e.jsonl"), "--scenario"];
  assert.equal(cli(...base, tmp("s1.json", JSON.stringify({ player: { pos: [0, 0] } }))).status, 2);
  assert.equal(cli(...base, tmp("s2.json", JSON.stringify({ shades: [{ pos: [1, 0, 0], id: "A" }, { pos: [2, 0, 0], id: "A" }] }))).status, 2);
  assert.equal(cli(...base, tmp("s3.json", "[]")).status, 2);
});

test("file inputs có BOM UTF-8 vẫn đọc được", () => {
  const p = tmp("bom.json", "﻿" + JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }] }));
  assert.equal(cli("--seed", "1", "--night", "1", "--ticks", "5", "--out", path.join(TMP, "f.jsonl"), "--inputs", p).status, 0);
});
