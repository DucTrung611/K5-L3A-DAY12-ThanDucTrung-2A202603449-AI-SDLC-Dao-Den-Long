import { test } from "node:test";
import assert from "node:assert/strict";
import { createInputState, applyFrame, consumePresses, worldMoveDir } from "../../src/sim/input.js";

const close = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("mặc định: move [0,0], yaw 0, mọi nút false", () => {
  const s = createInputState();
  assert.deepEqual(s.move, [0, 0]);
  assert.equal(s.cam_yaw_deg, 0);
  for (const b of ["jump", "interact", "pulse", "dash"]) assert.equal(s[b], false);
});

test("yaw 0: x là +X, z là +Z", () => {
  assert.deepEqual(worldMoveDir([1, 0], 0), [1, 0]);
  assert.deepEqual(worldMoveDir([0, 1], 0), [0, 1]);
});

test("yaw 90°: move [0,1] -> +X ; move [1,0] -> -Z (theo công thức contract)", () => {
  const [x, z] = worldMoveDir([0, 1], 90);
  close(x, 1);
  close(z, 0);
  const [x2, z2] = worldMoveDir([1, 0], 90);
  close(x2, 0);
  close(z2, -1);
});

test("vector dài hơn 1 được chuẩn hóa, ngắn hơn 1 giữ nguyên", () => {
  const [x, z] = worldMoveDir([1, 1], 0);
  close(Math.hypot(x, z), 1);
  close(x, Math.SQRT1_2);
  assert.deepEqual(worldMoveDir([0.5, 0], 0), [0.5, 0]);
});

test("frame chỉ đổi trường có mặt", () => {
  const s = createInputState();
  applyFrame(s, { tick: 0, move: [0, 1], interact: true });
  applyFrame(s, { tick: 5, cam_yaw_deg: 45 });
  assert.deepEqual(s.move, [0, 1]);
  assert.equal(s.interact, true);
  assert.equal(s.cam_yaw_deg, 45);
});

test("nút chỉ kích hoạt khi false -> true", () => {
  const s = createInputState();
  applyFrame(s, { tick: 0, pulse: true });
  assert.equal(consumePresses(s).pulse, true);
  assert.equal(consumePresses(s).pulse, false); // vẫn giữ true -> không kích hoạt lại
  applyFrame(s, { tick: 2, pulse: false });
  assert.equal(consumePresses(s).pulse, false);
  applyFrame(s, { tick: 3, pulse: true });
  assert.equal(consumePresses(s).pulse, true);
});
