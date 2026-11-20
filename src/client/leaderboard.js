// Bảng xếp hạng phía client. Ưu tiên lưu lên đĩa qua /api/leaderboard (máy chủ vite: data/leaderboard.json, cũng là nguồn của
// `--export-leaderboard`); nếu không có máy chủ (bản web tĩnh) thì lưu localStorage. Luôn phản chiếu vào localStorage.
import { addEntry, normalizeEntries, qualifies } from "../sim/leaderboard.js";

const KEY = "dao-den-long.leaderboard.v1";
const readLocal = () => {
  try {
    return normalizeEntries(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return [];
  }
};
const writeLocal = (entries) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* bị chặn lưu trữ: bỏ qua */
  }
};
const timeout = (ms) => (typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

export async function loadBoard() {
  try {
    const r = await fetch("api/leaderboard", { signal: timeout(1500) });
    if (!r.ok) throw new Error(String(r.status));
    const entries = normalizeEntries((await r.json()).entries);
    writeLocal(entries);
    return { entries, source: "disk" };
  } catch {
    return { entries: readLocal(), source: "browser" };
  }
}

export const boardQualifies = (entries, score) => qualifies(entries, score);

/** Lưu một bản ghi. Trả về { entries, rank, source }. Ném lỗi nếu bản ghi không hợp lệ (máy chủ trả 400). */
export async function saveEntry(entry) {
  let res = null;
  try {
    res = await fetch("api/leaderboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry), signal: timeout(2000) });
  } catch {
    /* không có máy chủ (bản web tĩnh): lưu trong trình duyệt */
  }
  if (res && res.status === 400) throw new Error((await res.json()).error || "bản ghi không hợp lệ");
  if (res && res.ok) {
    const j = await res.json();
    writeLocal(j.entries);
    return { entries: j.entries, rank: j.rank, source: "disk" };
  }
  const r = addEntry(readLocal(), entry);
  writeLocal(r.entries);
  return { ...r, source: "browser" };
}

/** ISO 8601 theo giờ địa phương kèm múi giờ, ví dụ 2026-11-20T16:45:00+07:00. */
export function isoWithOffset(date = new Date()) {
  const p = (n, w = 2) => String(Math.abs(n)).padStart(w, "0");
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}
