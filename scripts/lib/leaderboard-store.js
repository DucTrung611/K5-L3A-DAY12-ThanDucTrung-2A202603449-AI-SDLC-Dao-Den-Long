// Lưu bảng xếp hạng lên ĐĨA (data/leaderboard.json) – cầu nối giữa game trong trình duyệt (qua /api/leaderboard
// của máy chủ vite) và lệnh CLI `--export-leaderboard`. Đường dẫn đổi được bằng biến môi trường DDL_LEADERBOARD.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addEntry, normalizeEntries } from "../../src/sim/leaderboard.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const leaderboardPath = () => path.resolve(process.env.DDL_LEADERBOARD || path.join(ROOT, "data", "leaderboard.json"));

export function readLeaderboard(file = leaderboardPath()) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
    return normalizeEntries(Array.isArray(j) ? j : j.entries);
  } catch {
    return []; // chưa có file hoặc file hỏng: bảng rỗng
  }
}

export function writeLeaderboard(entries, file = leaderboardPath()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ entries: normalizeEntries(entries) }, null, 2) + "\n");
  fs.renameSync(tmp, file); // ghi nguyên tử: tắt game giữa chừng không làm hỏng file
}

export function submitEntry(entry, file = leaderboardPath()) {
  const r = addEntry(readLeaderboard(file), entry);
  writeLeaderboard(r.entries, file);
  return r;
}

/** Middleware vite (dev và preview): GET /api/leaderboard, POST /api/leaderboard. */
export function leaderboardMiddleware() {
  return (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/leaderboard")) return next();
    const send = (code, body) => {
      res.statusCode = code;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET") return send(200, { entries: readLeaderboard() });
    if (req.method === "POST") {
      let raw = "";
      req.on("data", (c) => {
        raw += c;
        if (raw.length > 4096) req.destroy();
      });
      req.on("end", () => {
        try {
          send(200, submitEntry(JSON.parse(raw)));
        } catch (e) {
          send(400, { error: String(e.message || e) });
        }
      });
      return;
    }
    send(405, { error: "method not allowed" });
  };
}
