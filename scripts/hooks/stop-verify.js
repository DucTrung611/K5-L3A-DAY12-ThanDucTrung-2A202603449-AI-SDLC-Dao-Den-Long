#!/usr/bin/env node
// Hook Stop: agent định kết thúc lượt -> chạy toàn bộ kiểm chứng (contract, unit test, scenario, determinism, bot).
// Đỏ -> exit 2 (chặn kết thúc, stderr báo cho agent). Để tránh vòng lặp vô hạn, sau 3 lần chặn liên tiếp
// trong cùng session thì cho dừng nhưng báo lỗi rõ cho người dùng.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_BLOCKS = 3;
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    /* bỏ qua */
  }
  const counter = path.join(os.tmpdir(), `ddl-stop-${String(input.session_id || "na").replace(/[^\w-]/g, "")}`);
  const steps = [
    ["contract", ["scripts/check-contract.js"]],
    ["unit test", ["--test", "tests/unit/*.test.js"]],
    ["scenarios", ["scripts/run-scenarios.js"]],
    ["determinism", ["scripts/check-determinism.js"]],
    ["bot playthrough", ["scripts/bot-playthrough.js", "--seeds", "1,2,3"]],
  ];
  const failed = [];
  for (const [name, args] of steps) {
    const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
    if (r.status !== 0) failed.push(`[${name}] exit ${r.status}\n${(r.stdout + r.stderr).split("\n").filter((l) => !/^\s*✔/.test(l) && /FAIL|✖|Error|KHÁC|SAI|mong đợi/i.test(l)).slice(0, 15).join("\n")}`);
  }
  if (!failed.length) {
    fs.rmSync(counter, { force: true });
    process.exit(0);
  }
  const n = (Number(fs.existsSync(counter) ? fs.readFileSync(counter, "utf8") : 0) || 0) + 1;
  fs.writeFileSync(counter, String(n));
  const msg = `Kiểm chứng ĐỎ – chưa được kết thúc (lần chặn ${n}/${MAX_BLOCKS}):\n${failed.join("\n")}\nChạy \`npm run verify\` để xem chi tiết.\n`;
  if (n > MAX_BLOCKS) {
    fs.rmSync(counter, { force: true });
    process.stderr.write("CẢNH BÁO: đã chặn " + MAX_BLOCKS + " lần mà vẫn đỏ – cho dừng để người dùng xử lý.\n" + msg);
    process.exit(1);
  }
  process.stderr.write(msg);
  process.exit(2);
});
