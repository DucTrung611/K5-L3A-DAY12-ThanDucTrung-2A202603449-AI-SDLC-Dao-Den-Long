// Bàn phím/chuột -> input theo đúng mô hình của Test Contract (move, cam_yaw_deg, nút boolean).
// Camera nhìn theo hướng (sinθ, cosθ); trong Three.js phía phải màn hình khi đó là (-cosθ, sinθ),
// tương ứng move.x = -1 theo công thức contract -> "sang phải" cho move.x âm.
// Ticket-04: phím lấy từ `keys` (đổi được, xem keymap.js). ←/→ luôn xoay camera, ↑/↓ luôn là đi tới/lùi phụ.
import { normalizeCode } from "./keymap.js";

export function createControls(dom, { sensitivity = 1, keys: bindings } = {}) {
  const keys = new Set();
  let bind = { ...bindings };
  let capture = null; // đang chờ người dùng bấm phím mới (màn hình đổi phím)
  const state = { camYawDeg: 0, dragging: false, lastX: 0, sens: sensitivity };
  const pauseCbs = [];
  const typing = (e) => e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
  const has = (action) => keys.has(bind[action]);
  const onKey = (e, down) => {
    if (typing(e)) return;
    const k = normalizeCode(e.code);
    if (down && capture) {
      e.preventDefault();
      if (!e.repeat) capture(k);
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(k) || k === bind.dash || k === bind.jump) e.preventDefault();
    if (down) {
      if (k === bind.pause && !e.repeat) pauseCbs.forEach((f) => f());
      keys.add(k);
    } else keys.delete(k);
  };
  addEventListener("keydown", (e) => onKey(e, true));
  addEventListener("keyup", (e) => onKey(e, false));
  addEventListener("blur", () => keys.clear());
  dom.addEventListener("pointerdown", (e) => {
    state.dragging = true;
    state.lastX = e.clientX;
    dom.setPointerCapture?.(e.pointerId);
  });
  dom.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    state.camYawDeg -= (e.clientX - state.lastX) * 0.3 * state.sens;
    state.lastX = e.clientX;
  });
  const stop = () => (state.dragging = false);
  dom.addEventListener("pointerup", stop);
  dom.addEventListener("pointercancel", stop);

  return {
    keys,
    onPause: (f) => pauseCbs.push(f),
    setSensitivity: (s) => (state.sens = s),
    setBindings: (b) => {
      bind = { ...b };
      keys.clear();
    },
    /** Chờ một phím tiếp theo rồi gọi cb(code); trả về hàm hủy. */
    captureNextKey(cb) {
      capture = (k) => {
        capture = null;
        cb(k);
      };
      return () => (capture = null);
    },
    get camYawDeg() {
      return state.camYawDeg;
    },
    reset() {
      state.camYawDeg = 0;
      keys.clear();
    },
    /** Gọi mỗi tick mô phỏng: cập nhật yaw rồi trả về hàm áp input cho stepGame. */
    tick(dt) {
      if (keys.has("ArrowLeft")) state.camYawDeg += 110 * state.sens * dt;
      if (keys.has("ArrowRight")) state.camYawDeg -= 110 * state.sens * dt;
      state.camYawDeg = ((state.camYawDeg % 360) + 360) % 360;
      const fwd = (has("up") || keys.has("ArrowUp") ? 1 : 0) - (has("down") || keys.has("ArrowDown") ? 1 : 0);
      const side = (has("left") ? 1 : 0) - (has("right") ? 1 : 0);
      const yaw = state.camYawDeg;
      return (inp) => {
        inp.move = [side, fwd];
        inp.cam_yaw_deg = yaw;
        inp.jump = has("jump");
        inp.interact = has("interact");
        inp.pulse = has("pulse");
        inp.dash = has("dash");
        inp.pause = false; // tạm dừng do main.js xử lý bằng cạnh lên riêng
      };
    },
  };
}
