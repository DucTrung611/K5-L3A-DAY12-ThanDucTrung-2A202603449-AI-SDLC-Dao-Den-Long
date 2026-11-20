#!/usr/bin/env node
// Hook PostToolUse (Edit|Write|MultiEdit): sửa file code/test/contract -> chạy unit test ngay.
// Test đỏ -> exit 2: stderr được đưa lại cho agent để sửa trước khi làm tiếp.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let file = "";
  try {
    file = JSON.parse(raw || "{}").tool_input?.file_path || "";
  } catch {
    /* không phải JSON -> bỏ qua */
  }
  const rel = path.relative(ROOT, path.resolve(file)).replace(/\\/g, "/");
  const relevant = /^(src|tests|scripts)\/.*\.(js|json)$/.test(rel) || rel === "game.contract.json";
  if (!relevant) process.exit(0);
  const r = spawnSync(process.execPath, ["--test", "tests/unit/*.test.js"], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) process.exit(0);
  const tail = (r.stdout + r.stderr).split("\n").filter((l) => /✖|not ok|Error|expected|actual/i.test(l)).slice(0, 30).join("\n");
  process.stderr.write(`Unit test ĐỎ sau khi sửa ${rel}. Sửa code (không sửa test/expect để cho qua):\n${tail}\n`);
  process.exit(2);
});
