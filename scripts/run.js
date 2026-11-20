#!/usr/bin/env node
// `run_cmd` của game.contract.json.
//   node scripts/run.js                               -> chạy game (máy chủ vite, http://localhost:5173)
//   node scripts/run.js --export-leaderboard out.json -> xuất bảng xếp hạng {"entries":[...]} đúng thứ tự rồi thoát
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { readLeaderboard } from "./lib/leaderboard-store.js";

const args = process.argv.slice(2);
const i = args.indexOf("--export-leaderboard");
if (i >= 0) {
  const out = args[i + 1];
  if (!out || out.startsWith("--")) {
    process.stderr.write("Lỗi: thiếu đường dẫn sau --export-leaderboard\n");
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ entries: readLeaderboard() }, null, 2) + "\n");
  process.exit(0);
}
const vite = spawn(process.execPath, [path.resolve("node_modules/vite/bin/vite.js"), ...args], { stdio: "inherit" });
vite.on("exit", (code) => process.exit(code ?? 0));
