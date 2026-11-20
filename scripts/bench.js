#!/usr/bin/env node
// node scripts/bench.js --seed 42 --duration 30 --out bench.json   (Ticket-04 mục 1)
// Mở trình duyệt Chromium (Chrome -> Edge -> Chromium của Playwright) 1280x720, không toàn màn hình, tắt VSync
// (--disable-frame-rate-limit --disable-gpu-vsync), tải bench.html (cảnh chuẩn), bỏ 3 s khởi động, đo `duration` giây
// rồi ghi bench.json và thoát với mã 0. Mã thoát 1 nếu lỗi (không có trình duyệt, trang không chạy...).
// Biến môi trường: BENCH_HEADLESS=1 (máy không có màn hình), BENCH_BROWSER=<đường dẫn exe>.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { benchStats } from "./lib/benchstats.js";
import { browserRssMb } from "./lib/rss.js";

let T0 = Date.now(); // mốc cho load_ms: lúc bắt đầu mở trình duyệt (không tính thời gian build dist/ nếu phải build)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : def;
};
const seed = Number(opt("seed", 42));
const duration = Number(opt("duration", 30));
const out = opt("out");
if (!Number.isFinite(seed) || !(duration > 0) || !out) {
  process.stderr.write("Cách dùng: node scripts/bench.js --seed 42 --duration 30 --out bench.json\n");
  process.exit(1);
}

function newestSrcMtime() {
  let m = 0;
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else m = Math.max(m, fs.statSync(p).mtimeMs);
    }
  };
  walk(path.join(ROOT, "src"));
  for (const f of ["bench.html", "index.html", "vite.config.js"]) m = Math.max(m, fs.statSync(path.join(ROOT, f)).mtimeMs);
  return m;
}
function ensureBuild() {
  const marker = path.join(DIST, "bench.html");
  if (fs.existsSync(marker) && fs.statSync(marker).mtimeMs >= newestSrcMtime()) return;
  console.log("Đang build bản web tĩnh (dist/)...");
  const r = spawnSync(process.execPath, [path.join(ROOT, "node_modules", "vite", "bin", "vite.js"), "build"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new Error("vite build thất bại");
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
function serveDist() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent((req.url || "/").split("?")[0]);
      const file = path.join(DIST, path.normalize(u === "/" ? "/index.html" : u));
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.statusCode = 404;
        return res.end("not found");
      }
      res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
      res.end(fs.readFileSync(file));
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

async function launch(userDataDir) {
  const flags = ["--disable-frame-rate-limit", "--disable-gpu-vsync", "--no-first-run", "--no-default-browser-check", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--ignore-gpu-blocklist"];
  const headless = process.env.BENCH_HEADLESS === "1";
  if (headless) flags.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader");
  const tries = process.env.BENCH_BROWSER ? [{ executablePath: process.env.BENCH_BROWSER }] : [{ channel: "chrome" }, { channel: "msedge" }, {}];
  let lastErr;
  for (const t of tries) {
    try {
      return await chromium.launchPersistentContext(userDataDir, { ...t, headless, args: flags, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ignoreDefaultArgs: ["--enable-automation"] });
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error("Không mở được trình duyệt Chromium (cài Chrome/Edge hoặc đặt BENCH_BROWSER): " + (lastErr && lastErr.message));
}

let srv;
let ctx;
let userDataDir;
try {
  ensureBuild();
  T0 = Date.now();
  srv = await serveDist();
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-bench-"));
  ctx = await launch(userDataDir);
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.on("pageerror", (e) => process.stderr.write("Lỗi trang: " + e.message + "\n"));
  await page.goto(`http://127.0.0.1:${srv.address().port}/bench.html?seed=${seed}&duration=${duration}`);

  let peak = 0;
  let sampled = false;
  const mark = path.basename(userDataDir);
  const sampler = setInterval(() => {
    const v = browserRssMb(mark);
    if (v !== null) {
      sampled = true;
      peak = Math.max(peak, v);
    }
  }, 1500);
  await page.waitForFunction(() => window.__benchFirstFrame !== undefined, null, { timeout: 120000 });
  const firstFrameEpoch = await page.evaluate(() => window.__benchFirstFrame);
  await page.waitForFunction(() => window.__benchResult !== undefined, null, { timeout: (duration + 3 + 60) * 1000, polling: 500 });
  clearInterval(sampler);
  const raw = await page.evaluate(() => window.__benchResult);
  const finalRss = browserRssMb(mark);
  if (finalRss !== null) {
    sampled = true;
    peak = Math.max(peak, finalRss);
  }
  const ua = await page.evaluate(() => navigator.userAgent);
  const version = (ua.match(/(Edg|Chrome)\/[\d.]+/) || [""])[0].replace("/", " ");
  const stats = benchStats(raw.dts);
  const report = {
    contract_version: "1.3",
    avg_fps: stats.avg_fps,
    p1_low_fps: stats.p1_low_fps,
    frame_ms_p95: stats.frame_ms_p95,
    frames: stats.frames,
    load_ms: Math.round(firstFrameEpoch - T0),
    peak_mem_mb: sampled ? Math.round(peak) : null,
    vsync_off: true,
    renderer: `${raw.renderer}; ${version || "Chromium"}; viewport ${raw.size[0]}x${raw.size[1]}; ${raw.shades} Bóng Mực, ${raw.motes} đom đóm`,
    os: `${os.type()} ${os.release()} ${os.arch()}`,
  };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  const ok = report.avg_fps >= 60 && report.p1_low_fps >= 30 && report.load_ms <= 10000;
  console.log(`Bench: avg ${report.avg_fps} fps, p1-low ${report.p1_low_fps} fps, p95 ${report.frame_ms_p95} ms, ${report.frames} khung, load ${report.load_ms} ms, RAM đỉnh ${report.peak_mem_mb} MB -> ${ok ? "ĐẠT" : "CHƯA ĐẠT ngưỡng (avg>=60, p1>=30, load<=10000)"}`);
  process.exitCode = 0;
} catch (e) {
  process.stderr.write("Bench lỗi: " + (e && e.stack ? e.stack : e) + "\n");
  process.exitCode = 1;
} finally {
  try {
    await ctx?.close();
  } catch {
    /* đã đóng */
  }
  srv?.close();
  if (userDataDir) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* Windows có thể còn giữ file một lúc */
    }
  }
  process.exit(process.exitCode ?? 0);
}
