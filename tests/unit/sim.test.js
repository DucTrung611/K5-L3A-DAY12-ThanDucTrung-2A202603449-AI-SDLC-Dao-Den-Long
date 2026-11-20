import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, snapshotOf, defaultLanternPos } from "../../src/sim/game.js";
import { runHeadless } from "../../src/sim/run.js";
import { TUNING } from "../../src/sim/tuning.js";
import { r3 } from "../../src/sim/output.js";

const ISOLATED = { random_motes: false, random_shades: false, motes: [], shades: [] };
const press = (btn) => (inp) => {
  inp[btn] = true;
};
const release = (btn) => (inp) => {
  inp[btn] = false;
};
const stepN = (g, n, fn) => {
  const ev = [];
  for (let i = 0; i < n && g.state === "playing"; i++) ev.push(...stepGame(g, fn));
  return ev;
};

test("đèn mặc định: 5 đèn, L1 ở (0,0,25), bán kính 25", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  assert.equal(g.lanterns.length, TUNING.lantern_count_night1);
  assert.deepEqual(g.lanterns.map((l) => l.id), ["L1", "L2", "L3", "L4", "L5"]);
  assert.deepEqual(defaultLanternPos(0), [0, 0, 25]);
  for (const l of g.lanterns) assert.ok(Math.abs(Math.hypot(l.pos[0], l.pos[2]) - 25) < 1e-9);
});

test("tick 0 trước input, sự kiện ghi tick = k+1", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, motes: [[0, 0, 1]] } });
  assert.equal(snapshotOf(g).tick, 0);
  const ev = stepGame(g);
  assert.equal(g.tick, 1);
  assert.deepEqual(ev, [{ tick: 1, name: "mote_picked", data: { carried: 1 } }]);
});

test("time_left_s = thời lượng - bước/60", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  stepN(g, 120);
  assert.equal(r3(g.timeLeft), 298);
});

test("dựng scenario không cộng điểm và không phát sự kiện", () => {
  const { lines } = runHeadless({ seed: 1, scenario: { ...ISOLATED, lanterns: [{ id: "L1", lit: true }] }, ticks: 0 });
  assert.equal(lines.length, 2); // snapshot tick 0 + end
  assert.equal(JSON.parse(lines[0]).score, 0);
});

test("pulse: trúng trong bán kính (≤ r), trượt ngoài bán kính", () => {
  const r = TUNING.pulse_radius;
  const g = createGame({
    seed: 1,
    scenario: { ...ISOLATED, player: { carried: 2 }, shades: [{ id: "in", pos: [r, 0, 0] }, { id: "out", pos: [0, 0, r + 0.01] }] },
  });
  const ev = stepGame(g, press("pulse"));
  assert.deepEqual(ev.find((e) => e.name === "pulse").data, { stunned_ids: ["in"] });
  assert.equal(g.score, TUNING.score.per_stun);
  assert.equal(g.player.carried, 0);
});

test("bị chạm: dropped = floor(carried * hit_drop_ratio)", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 7 }, shades: [{ pos: [0.5, 0, 0] }] } });
  const ev = stepGame(g);
  assert.deepEqual(ev[0].data, { by: "shade", flames: 2, dropped: Math.floor(7 * TUNING.hit_drop_ratio) });
  assert.equal(g.player.carried, 7 - 3);
});

test("Bóng Mực đang choáng không gây sát thương", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 2 }, shades: [{ pos: [0.5, 0, 0] }] } });
  // pulse đẩy ra 4 m và choáng; sau đó không có hit trong suốt thời gian choáng
  const ev = stepN(g, 100, press("pulse"));
  assert.equal(ev.filter((e) => e.name === "player_hit").length, 0);
});

test("thắng: bonus = floor(time_left)*per_second_left + flames*per_flame_left", () => {
  const scenario = {
    ...ISOLATED,
    player: { pos: [0, 0, 23], carried: 5, flames: 2 },
    time_left_s: 100.5,
    lanterns: ["L2", "L3", "L4", "L5"].map((id) => ({ id, lit: true })),
  };
  const g = createGame({ seed: 1, scenario });
  stepN(g, 10); // đi 0 bước có input -> vẫn chơi
  const before = g.score;
  stepGame(g, press("interact"));
  assert.equal(g.state, "won");
  const tl = 100.5 - 11 / 60;
  assert.equal(g.score - before, TUNING.score.per_lantern + Math.floor(tl) * TUNING.score.per_second_left + 2 * TUNING.score.per_flame_left);
});

test("đã kết thúc thì stepGame không làm gì thêm", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, time_left_s: 1 / 60 } });
  stepGame(g);
  assert.equal(g.state, "lost");
  assert.deepEqual(stepGame(g), []);
  assert.equal(g.tick, 1);
});

test("tất định trong cùng tiến trình: cùng seed -> cùng output; khác seed -> khác", () => {
  const a = runHeadless({ seed: 5, ticks: 2400 }).lines.join("\n");
  const b = runHeadless({ seed: 5, ticks: 2400 }).lines.join("\n");
  const c = runHeadless({ seed: 6, ticks: 2400 }).lines.join("\n");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("id Bóng Mực tự sinh không trùng id do scenario đặt", () => {
  const g = createGame({ seed: 3, scenario: { random_motes: false, shades: [{ id: "S1", pos: [30, 0, 0] }] } });
  const ev = stepN(g, 600, release("pulse"));
  const spawned = ev.find((e) => e.name === "shade_spawned");
  assert.ok(spawned, "phải có shade_spawned ở giây 10");
  assert.notEqual(spawned.data.id, "S1");
});
