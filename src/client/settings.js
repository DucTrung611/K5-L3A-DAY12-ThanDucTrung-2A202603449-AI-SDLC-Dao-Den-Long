// Cài đặt (âm lượng, độ nhạy chuột, bảng màu dễ phân biệt – Ticket-03) được lưu giữa các lần mở game (localStorage; không có thì dùng mặc định).
const KEY = "dao-den-long.settings.v1";
export const DEFAULTS = Object.freeze({ volume: 0.6, sensitivity: 1.0, accessible: false });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      volume: clamp(Number.isFinite(s.volume) ? s.volume : DEFAULTS.volume, 0, 1),
      sensitivity: clamp(Number.isFinite(s.sensitivity) ? s.sensitivity : DEFAULTS.sensitivity, 0.2, 3),
      accessible: s.accessible === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume: s.volume, sensitivity: s.sensitivity, accessible: s.accessible === true }));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua, cài đặt chỉ có hiệu lực trong phiên này */
  }
}
