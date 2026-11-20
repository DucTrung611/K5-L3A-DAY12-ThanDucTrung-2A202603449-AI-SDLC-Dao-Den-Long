// Bộ nhớ (MB) của cây tiến trình trình duyệt do bench tự mở, nhận diện qua thư mục user-data-dir riêng
// (không đụng tới cửa sổ trình duyệt khác của người dùng). Trả về null nếu không đo được.
import { execFileSync } from "node:child_process";

export function browserRssMb(marker) {
  try {
    if (process.platform === "win32") {
      const ps = "$m = $env:DDL_MARK; (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($m) } | Measure-Object WorkingSetSize -Sum).Sum";
      const out = execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8", timeout: 15000, env: { ...process.env, DDL_MARK: marker } }).trim();
      const n = Number(out);
      return Number.isFinite(n) && n > 0 ? n / 1048576 : null;
    }
    const out = execFileSync("ps", ["-axo", "rss=,command="], { encoding: "utf8", timeout: 15000 });
    let kb = 0;
    for (const line of out.split("\n")) if (line.includes(marker)) kb += Number(line.trim().split(/\s+/)[0]) || 0;
    return kb > 0 ? kb / 1024 : null;
  } catch {
    return null;
  }
}
