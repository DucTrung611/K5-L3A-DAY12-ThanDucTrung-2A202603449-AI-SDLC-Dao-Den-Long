// Cài đặt (âm lượng, độ nhạy chuột, bảng màu dễ phân biệt, giảm chuyển động, chữ lớn, phụ đề, phím) được lưu giữa các lần mở game
// (localStorage; không có thì dùng mặc định).
import { sanitizeKeys, DEFAULT_KEYS } from "./keymap.js";

const KEY = "dao-den-long.settings.v1";
export const DEFAULTS = Object.freeze({ volume: 0.6, sensitivity: 1.0, accessible: false, reduceMotion: false, bigText: false, subtitles: true, keys: DEFAULT_KEYS });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      volume: clamp(Number.isFinite(s.volume) ? s.volume : DEFAULTS.volume, 0, 1),
      sensitivity: clamp(Number.isFinite(s.sensitivity) ? s.sensitivity : DEFAULTS.sensitivity, 0.2, 3),
      accessible: s.accessible === true,
      reduceMotion: s.reduceMotion === true,
      bigText: s.bigText === true,
      subtitles: s.subtitles !== false,
      keys: sanitizeKeys(s.keys),
    };
  } catch {
    return { ...DEFAULTS, keys: { ...DEFAULT_KEYS } };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ volume: s.volume, sensitivity: s.sensitivity, accessible: s.accessible === true, reduceMotion: s.reduceMotion === true, bigText: s.bigText === true, subtitles: s.subtitles !== false, keys: s.keys }),
    );
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua, cài đặt chỉ có hiệu lực trong phiên này */
  }
}
