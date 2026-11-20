// Bàn phím/chuột -> input theo đúng mô hình của Test Contract (move, cam_yaw_deg, nút boolean).
// Camera nhìn theo hướng (sinθ, cosθ); trong Three.js phía phải màn hình khi đó là (-cosθ, sinθ),
// tương ứng move.x = -1 theo công thức contract -> phím D cho move.x âm.

export function createControls(dom) {
  const keys = new Set();
  const state = { camYawDeg: 0, dragging: false, lastX: 0 };
  const onKey = (e, down) => {
    const k = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(k)) e.preventDefault();
    if (down) keys.add(k);
    else keys.delete(k);
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
    state.camYawDeg -= (e.clientX - state.lastX) * 0.3;
    state.lastX = e.clientX;
  });
  const stop = () => (state.dragging = false);
  dom.addEventListener("pointerup", stop);
  dom.addEventListener("pointercancel", stop);

  return {
    keys,
    get camYawDeg() {
      return state.camYawDeg;
    },
    reset() {
      state.camYawDeg = 0;
    },
    /** Gọi mỗi tick mô phỏng: cập nhật yaw rồi trả về hàm áp input cho stepGame. */
    tick(dt) {
      if (keys.has("ArrowLeft")) state.camYawDeg += 110 * dt;
      if (keys.has("ArrowRight")) state.camYawDeg -= 110 * dt;
      state.camYawDeg = ((state.camYawDeg % 360) + 360) % 360;
      const fwd = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
      const side = (keys.has("KeyA") ? 1 : 0) - (keys.has("KeyD") ? 1 : 0);
      const yaw = state.camYawDeg;
      return (inp) => {
        inp.move = [side, fwd];
        inp.cam_yaw_deg = yaw;
        inp.jump = keys.has("Space");
        inp.interact = keys.has("KeyE");
        inp.pulse = keys.has("KeyF");
      };
    },
  };
}
