// Bảng xếp hạng cục bộ (Ticket-04 mục 3): logic thuần, dùng chung client, CLI và test. Không I/O.
// Bản ghi: { name, score, nights_won, achieved_at (ISO 8601 có múi giờ), seed }. Lấy giờ hiện tại nằm ở client (sim không đụng Date).

export const LEADERBOARD_SIZE = 10;
// 3–12 ký tự; [A-Za-z0-9_] và chữ Latin có dấu (tiếng Việt là điểm cộng của ticket).
export const NAME_RE = /^[\p{Script=Latin}0-9_]{3,12}$/u;
const ISO_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const isValidName = (name) => typeof name === "string" && NAME_RE.test(name);

/** Trả về chuỗi lỗi (tiếng Việt) hoặc null nếu hợp lệ. */
export function nameError(name) {
  if (typeof name !== "string") return "Tên phải là chuỗi";
  const n = [...name].length;
  if (n < 3 || n > 12) return "Tên phải dài 3–12 ký tự";
  if (!NAME_RE.test(name)) return "Tên chỉ gồm chữ, số và dấu gạch dưới (_)";
  return null;
}

export function isValidEntry(e) {
  return (
    !!e &&
    isValidName(e.name) &&
    Number.isInteger(e.score) && e.score >= 0 &&
    Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 &&
    typeof e.achieved_at === "string" && ISO_TZ_RE.test(e.achieved_at) && Number.isFinite(Date.parse(e.achieved_at)) &&
    Number.isInteger(e.seed)
  );
}

/** Điểm giảm dần; bằng điểm thì achieved_at sớm hơn đứng trên; còn bằng nữa thì giữ thứ tự cũ (sort ổn định). */
export function compareEntries(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  return Date.parse(a.achieved_at) - Date.parse(b.achieved_at);
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
