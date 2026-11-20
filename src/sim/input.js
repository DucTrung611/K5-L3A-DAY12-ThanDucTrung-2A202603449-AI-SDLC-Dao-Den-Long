// Mô hình input theo Test Contract (v1.0 mục C, v1.1 thêm dash và pause).
// - Mặc định: move [0,0], cam_yaw_deg 0, mọi nút false.
// - Frame chỉ đổi trường có mặt; trường vắng giữ giá trị cũ.
// - Nút kích hoạt khi chuyển false -> true (cạnh lên).

export const BUTTONS = ["jump", "interact", "pulse", "dash", "pause"];

export function createInputState() {
  const s = { move: [0, 0], cam_yaw_deg: 0, prev: {} };
  for (const b of BUTTONS) {
    s[b] = false;
    s.prev[b] = false;
  }
  return s;
}

/** Áp một frame (đã được validate) lên trạng thái input hiện tại. */
export function applyFrame(inp, frame) {
  if (frame.move !== undefined) inp.move = [frame.move[0], frame.move[1]];
  if (frame.cam_yaw_deg !== undefined) inp.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of BUTTONS) if (frame[b] !== undefined) inp[b] = frame[b];
}

/** Trả về các nút vừa được nhấn (cạnh lên) ở tick này rồi lưu lại trạng thái để so ở tick sau. */
export function consumePresses(inp) {
  const pressed = {};
  for (const b of BUTTONS) {
    pressed[b] = inp[b] === true && inp.prev[b] !== true;
    inp.prev[b] = inp[b] === true;
  }
  return pressed;
}

/** Hướng di chuyển trong thế giới (XZ) từ move + cam_yaw_deg. Vector dài hơn 1 được chuẩn hóa về 1. */
export function worldMoveDir(move, camYawDeg) {
  const th = (camYawDeg * Math.PI) / 180;
  const c = Math.cos(th);
  const s = Math.sin(th);
  let x = move[0] * c + move[1] * s;
  let z = -move[0] * s + move[1] * c;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return [x, z];
}
