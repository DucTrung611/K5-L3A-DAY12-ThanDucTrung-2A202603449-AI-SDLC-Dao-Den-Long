// Bảng xếp hạng cục bộ (Ticket-04 mục 3): logic thuần, dùng chung client, CLI và test. Không I/O.
// Bản ghi: { name, score, nights_won, achieved_at (ISO 8601 có múi giờ), seed }. Lấy giờ hiện tại nằm ở client; so sánh thời điểm dùng isoToMs (sim không dùng đồng hồ hệ thống).

export const LEADERBOARD_SIZE = 10;
// 3–12 ký tự thuộc [A-Za-z0-9_] (đúng ticket; chữ có dấu chỉ là điểm cộng nên không nhận, tránh lệch đặc tả).
export const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const ISO_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// Đổi ISO 8601 có múi giờ sang mili-giây UTC mà không dùng đồng hồ hệ thống (src/sim cấm). NaN nếu sai định dạng/giá trị.
const daysFromCivil = (y, m, d) => {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
};
export function isoToMs(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(str);
  if (!m) return NaN;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  const dim = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mo < 1 || mo > 12 || d < 1 || d > dim[mo - 1] || h > 23 || mi > 59 || s > 59) return NaN;
  let off = 0;
  if (m[8] !== "Z") {
    const [oh, om] = m[8].slice(1).split(":").map(Number);
    if (oh > 23 || om > 59) return NaN;
    off = (m[8][0] === "-" ? -1 : 1) * (oh * 60 + om);
  }
  const frac = m[7] ? Number("0." + m[7]) : 0;
  return ((daysFromCivil(y, mo, d) * 24 + h) * 60 + mi - off) * 60000 + s * 1000 + Math.round(frac * 1000);
}

export const isValidName = (name) => typeof name === "string" && NAME_RE.test(name);

/** Trả về chuỗi lỗi (tiếng Việt) hoặc null nếu hợp lệ. */
export function nameError(name) {
  if (typeof name !== "string") return "Tên phải là chuỗi";
  const n = [...name].length;
  if (n < 3 || n > 12) return "Tên phải dài 3–12 ký tự";
  if (!NAME_RE.test(name)) return "Tên chỉ gồm A-Z, a-z, 0-9 và dấu gạch dưới (_)";
  return null;
}

export function isValidEntry(e) {
  return (
    !!e &&
    isValidName(e.name) &&
    Number.isInteger(e.score) && e.score >= 0 &&
    Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 &&
    typeof e.achieved_at === "string" && ISO_TZ_RE.test(e.achieved_at) && Number.isFinite(isoToMs(e.achieved_at)) &&
    Number.isInteger(e.seed)
  );
}

/** Điểm giảm dần; bằng điểm thì achieved_at sớm hơn đứng trên; còn bằng nữa thì giữ thứ tự cũ (sort ổn định). */
export function compareEntries(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  return isoToMs(a.achieved_at) - isoToMs(b.achieved_at);
}

/** Dữ liệu đọc từ đĩa/localStorage có thể hỏng: bỏ bản ghi sai, sắp xếp, cắt top 10. */
export function normalizeEntries(list) {
  const ok = (Array.isArray(list) ? list : []).filter(isValidEntry).map((e) => ({
    name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed,
  }));
  return ok.sort(compareEntries).slice(0, LEADERBOARD_SIZE);
}

/** Thêm một bản ghi, trả về { entries (top 10 mới), rank (1-based, null nếu không vào top) }. */
export function addEntry(list, entry) {
  if (!isValidEntry(entry)) throw new Error("bản ghi bảng xếp hạng không hợp lệ");
  const mine = { name: entry.name, score: entry.score, nights_won: entry.nights_won, achieved_at: entry.achieved_at, seed: entry.seed };
  const entries = normalizeEntries([...normalizeEntries(list), mine]);
  const rank = entries.indexOf(entries.find((e) => e.name === mine.name && e.score === mine.score && e.achieved_at === mine.achieved_at && e.seed === mine.seed));
  return { entries, rank: rank >= 0 ? rank + 1 : null };
}

/** Điểm này có vào được top 10 không (để client quyết định có mời nhập tên). */
export function qualifies(list, score) {
  const cur = normalizeEntries(list);
  return cur.length < LEADERBOARD_SIZE || score >= cur[cur.length - 1].score;
}
