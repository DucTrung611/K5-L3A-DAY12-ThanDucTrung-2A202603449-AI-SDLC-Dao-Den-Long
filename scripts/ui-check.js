#!/usr/bin/env node
// Kiểm tra giao diện Phase 4 bằng trình duyệt thật (Playwright + Chrome/Edge): đổi phím, cỡ chữ, chữ lớn, giảm chuyển động,
// phụ đề, bảng xếp hạng (lưu đĩa + xuất CLI). Tự mở máy chủ vite với file bảng xếp hạng tạm. Ảnh lưu vào --shots <thư mục>.
// node scripts/ui-check.js [--shots docs/proof/phase-4] [--out out/ui-check.json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes("--" + n) ? args[args.indexOf("--" + n) + 1] : d);
const shots = opt("shots", null);
const outJson = opt("out", path.join(ROOT, "out", "ui-check.json"));
if (shots) fs.mkdirSync(shots, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-ui-"));
const lbFile = path.join(tmp, "leaderboard.json");
const PORT = 5199;
const server = spawn(process.execPath, [path.join(ROOT, "scripts", "run.js"), "--port", String(PORT), "--strictPort"], { cwd: ROOT, env: { ...process.env, DDL_LEADERBOARD: lbFile }, stdio: "ignore" });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  – " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/api/leaderboard`)).ok) break;
    } catch {
      /* chờ máy chủ */
    }
    await sleep(500);
  }
  const tries = process.env.BENCH_BROWSER ? [{ executablePath: process.env.BENCH_BROWSER }] : [{ channel: "chrome" }, { channel: "msedge" }, {}];
  for (const t of tries) {
    try {
      browser = await chromium.launch({ ...t, headless: process.env.BENCH_HEADLESS === "1", args: ["--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
      break;
    } catch {
      /* thử trình duyệt tiếp theo */
    }
  }
  if (!browser) throw new Error("không mở được trình duyệt");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const shot = async (name) => shots && (await page.screenshot({ path: path.join(shots, name) }));
  const url = `http://localhost:${PORT}/`;
  await page.goto(url);
  await page.waitForSelector("#btnPlay");
  await shot("ui-01-menu.png");

  // --- cỡ chữ ---
  const minFont = () =>
    page.evaluate(() => {
      let min = Infinity;
      let who = "";
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el.checkVisibility || !el.checkVisibility({ checkVisibilityCSS: true })) continue;
        if (el.closest("[hidden]") || el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < min) {
          min = fs;
          who = (el.id || el.className || el.tagName) + ": " + n.textContent.trim().slice(0, 20);
        }
      }
      return { min, who };
    });
  let f = await minFont();
  check("menu: mọi chữ hiển thị >= 18 px ở 1280x720", f.min >= 18, `nhỏ nhất ${f.min}px (${f.who})`);
  await page.click("#btnSettings");
  f = await minFont();
  check("cài đặt: mọi chữ hiển thị >= 18 px", f.min >= 18, `nhỏ nhất ${f.min}px (${f.who})`);
  await shot("ui-02-settings.png");
  await page.check("#bt");
  const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  check("Chữ lớn: cỡ chữ gốc ×1.25 (22.5 px)", rootPx === 22.5, `${rootPx}px`);
  f = await minFont();
  check("Chữ lớn: chữ nhỏ nhất >= 22.5 px", f.min >= 22.5, `${f.min}px`);
  await shot("ui-03-big-text.png");
  await page.uncheck("#bt");

  // --- giảm chuyển động ---
  await page.check("#rm");
  check("Giảm chuyển động: bật được và lưu", (await page.evaluate(() => JSON.parse(localStorage.getItem("dao-den-long.settings.v1")).reduceMotion)) === true);
  check("Giảm chuyển động: chớp màn hình bị ẩn", (await page.evaluate(() => getComputedStyle(document.getElementById("flash")).display)) === "none");

  // --- đổi phím ---
  await page.click("#btnKeys");
  await shot("ui-04-keys.png");
  const rows = await page.$$eval("#keyRows button", (b) => b.length);
  check("đổi phím: đủ 9 hành động", rows === 9, `${rows} hàng`);
  const label = (a) => page.$eval(`#keyRows button[data-action="${a}"]`, (b) => b.textContent);
  await page.click('#keyRows button[data-action="jump"]');
  await page.keyboard.press("KeyE"); // E đang là Tương tác -> trùng
  const warn = await page.textContent("#keyWarn");
  check("đổi phím: phát hiện trùng và cảnh báo", /đã dùng cho/.test(warn) && (await label("jump")) === "Space", warn);
  await shot("ui-05-key-conflict.png");
  await page.click('#keyRows button[data-action="jump"]');
  await page.keyboard.press("KeyZ");
  check("đổi phím: gán Nhảy = Z", (await label("jump")) === "Z");
  await page.click('#keyRows button[data-action="pause"]');
  await page.keyboard.press("KeyP");
  check("đổi phím: gán Tạm dừng = P", (await label("pause")) === "P");
  await page.reload();
  await page.waitForSelector("#btnPlay");
  check("đổi phím: lưu bền qua tải lại trang (menu hiện Z)", /Z/.test(await page.textContent("#menuControls")));
  await page.click("#btnSettings");
  await page.click("#btnKeys");
  await page.click("#btnKeysReset");
  check("đổi phím: Khôi phục mặc định", (await label("jump")) === "Space" && (await label("pause")) === "Esc");
  await page.click("#btnKeysBack");
  await page.click("#btnBack");

  // --- vào game: phụ đề, rung camera ---
  await page.click("#btnPlay");
  await page.click("#btnGo");
  await page.evaluate(() => window.__ddl.step(330)); // Bóng Mực đầu tiên xuất hiện ở giây 5 (tick 300)
  await sleep(300);
  const sub = await page.textContent("#subtitle");
  check("phụ đề: 'Bóng Mực xuất hiện' khi Bóng Mực xuất hiện", /Bóng Mực xuất hiện/.test(sub), sub);
  await shot("ui-06-subtitle-shade.png");
  // 10 s cuối + đèn fuel < 30: dựng đêm bằng scenario (thời gian và dầu do sim tự tính, không sửa tay giữa chừng)
  await page.evaluate(() => window.__ddl.beginNight(1, 5, { time_left_s: 10.5, lanterns: [{ id: "L1", lit: true, fuel: 20 }] }));
  await page.evaluate(() => window.__ddl.step(30));
  await sleep(300);
  check("chỉ báo: 10 s cuối của Đêm", /giây tới bình minh/.test(await page.textContent("#cueBar")), await page.textContent("#cueBar"));
  check("chỉ báo: đèn fuel < 30", /sắp tắt/.test(await page.textContent("#lowFuelText")) && /sắp cạn dầu/.test(await page.textContent("#subtitle")), await page.textContent("#subtitle"));
  await shot("ui-07-low-fuel-last10.png");

  // --- thua -> nhập tên -> bảng xếp hạng ---
  await page.evaluate(() => {
    window.__ddl.game.player.flames = 0;
    window.__ddl.step(2);
  });
  await page.waitForSelector("#result:not([hidden])");
  check("thua: màn kết quả có ô nhập tên", await page.isVisible("#resName"));
  await shot("ui-08-result-name.png");
  await page.fill("#resInput", "ab");
  await page.click("#resSave");
  check("tên 2 ký tự bị từ chối", /3–12/.test(await page.textContent("#resMsg")));
  await page.fill("#resInput", "bad name!");
  await page.click("#resSave");
  check("tên có ký tự lạ bị từ chối", /chữ, số/.test(await page.textContent("#resMsg")));
  await page.fill("#resInput", "Tester_1");
  await page.click("#resSave");
  await page.waitForFunction(() => /Đã lưu/.test(document.getElementById("resMsg").textContent));
  check("lưu điểm khi thua: thành công", true, await page.textContent("#resMsg"));
  check("bản ghi nằm trên ĐĨA (file bảng xếp hạng)", fs.existsSync(lbFile) && JSON.parse(fs.readFileSync(lbFile, "utf8")).entries[0]?.name === "Tester_1");

  // --- bảng xếp hạng từ menu, bền sau khi mở lại ---
  await page.reload();
  await page.waitForSelector("#btnBoard");
  await page.click("#btnBoard");
  await page.waitForSelector("#boardBody table");
  const row = await page.$eval("#boardBody tbody tr", (r) => r.textContent);
  check("bảng xếp hạng truy cập từ Menu và giữ dữ liệu sau khi tải lại", /Tester_1/.test(row), row);
  await shot("ui-09-leaderboard.png");

  // --- xuất CLI ---
  const exp = path.join(tmp, "export.json");
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "run.js"), "--export-leaderboard", exp], { env: { ...process.env, DDL_LEADERBOARD: lbFile }, encoding: "utf8" });
  const j = r.status === 0 ? JSON.parse(fs.readFileSync(exp, "utf8")) : null;
  check("CLI --export-leaderboard khớp bản ghi vừa lưu", j && j.entries.length === 1 && j.entries[0].name === "Tester_1" && j.entries[0].nights_won === 0 && /\+07:00|[+-]\d\d:\d\d$/.test(j.entries[0].achieved_at), j ? JSON.stringify(j.entries[0]) : r.stderr);

  check("không có lỗi JS/console trong cả phiên", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("chạy kiểm tra giao diện", false, String(e && e.stack ? e.stack : e));
} finally {
  await browser?.close();
  server.kill();
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify({ passed: results.every((x) => x.ok), results }, null, 2) + "\n");
  const bad = results.filter((x) => !x.ok).length;
  console.log(`\nUI check: ${bad === 0 ? "PASS" : "FAIL"} (${results.length - bad}/${results.length})`);
  process.exit(bad === 0 ? 0 : 1);
}
