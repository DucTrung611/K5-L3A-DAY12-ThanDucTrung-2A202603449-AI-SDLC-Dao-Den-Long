// Đổi phím (Ticket-04 mục 4): mỗi hành động một phím, phát hiện trùng, khôi phục mặc định, lưu bền (qua settings.js).
export const ACTIONS = [
  ["up", "Đi tới"],
  ["down", "Đi lùi"],
  ["left", "Sang trái"],
  ["right", "Sang phải"],
  ["jump", "Nhảy"],
  ["dash", "Lướt"],
  ["interact", "Tương tác (nạp/châm dầu)"],
  ["pulse", "Tỏa sáng"],
  ["pause", "Tạm dừng"],
];
export const DEFAULT_KEYS = Object.freeze({
  up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", jump: "Space", dash: "ShiftLeft", interact: "KeyE", pulse: "KeyF", pause: "Escape",
});
// Phím dành riêng, không gán được: xoay camera (←/→), đi tới/lùi phụ (↑/↓) và xác nhận (Enter).
export const RESERVED = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"];

/** Shift/Ctrl/Alt trái và phải coi như một phím. */
export const normalizeCode = (code) => (/^(Shift|Control|Alt)Right$/.test(code) ? code.replace("Right", "Left") : code);

const NAMES = { Space: "Space", ShiftLeft: "Shift", ControlLeft: "Ctrl", AltLeft: "Alt", Escape: "Esc", Enter: "Enter", Tab: "Tab", Backspace: "Backspace", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
export function keyLabel(code) {
  if (NAMES[code]) return NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return "Num" + code.slice(6);
  return code;
}

/** Chuẩn hóa cấu hình đọc từ bộ nhớ: thiếu/sai thì dùng mặc định; có trùng phím thì dùng lại toàn bộ mặc định. */
export function sanitizeKeys(raw) {
  const out = { ...DEFAULT_KEYS };
  if (raw && typeof raw === "object") {
    for (const [a] of ACTIONS) {
      const c = typeof raw[a] === "string" ? normalizeCode(raw[a]) : null;
      if (c && c.length <= 24 && !RESERVED.includes(c)) out[a] = c;
    }
  }
  // cấu hình hỏng (hai hành động cùng một phím): quay về mặc định toàn bộ để không còn trùng
  if (new Set(Object.values(out)).size !== ACTIONS.length) return { ...DEFAULT_KEYS };
  return out;
}

/** Hành động đang dùng phím này (khác `except`), hoặc null. */
export function findConflict(keys, code, except) {
  const c = normalizeCode(code);
  for (const [a] of ACTIONS) if (a !== except && keys[a] === c) return a;
  return null;
}

export const actionName = (id) => (ACTIONS.find(([a]) => a === id) || [, id])[1];
