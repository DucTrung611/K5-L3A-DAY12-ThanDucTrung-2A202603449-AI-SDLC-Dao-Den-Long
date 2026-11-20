import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, snapshotOf, compareIds } from "../../src/sim/game.js";
import { MAPS } from "../../src/sim/maps.js";
import { runHeadless } from "../../src/sim/run.js";
import { TUNING } from "../../src/sim/tuning.js";
import { r3 } from "../../src/sim/output.js";

const ISOLATED = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const press = (btn) => (inp) => {
  inp[btn] = true;
};
const stepN = (g, n, fn) => {
  const ev = [];
  for (let i = 0; i < n && g.state !== "won" && g.state !== "lost"; i++) ev.push(...stepGame(g, fn));
  return ev;
};
const named = (ev, name) => ev.filter((e) => e.name === name);

// ---------- bản đồ ----------
test("Đêm 1: 5 đèn theo tọa độ chuẩn, xuất phát (0,0,0), 300 s", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  assert.deepEqual(g.lanterns.map((l) => [l.id, ...l.pos]), [["L1", 0, 0, 25], ["L2", 23.8, 0, 7.7], ["L3", 14.7, 0, -20.2], ["L4", -14.7, 0, -20.2], ["L5", -23.8, 0, 7.7]]);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.timeLeft, 300);
});

test("Đêm 2: 6 đèn, 330 s, 1 bùa; Đêm 3: 7 đèn, 360 s, 2 bùa", () => {
  const g2 = createGame({ seed: 1, night: 2 });
  const g3 = createGame({ seed: 1, night: 3 });
  assert.equal(g2.lanterns.length, 6);
  assert.equal(g3.lanterns.length, 7);
  assert.equal(g2.timeLeft, 330);
  assert.equal(g3.timeLeft, 360);
  assert.deepEqual(g2.charms.map((c) => [c.id, ...c.pos]), [["C1", 35, 0, 0]]);
  assert.deepEqual(g3.charms.map((c) => [c.id, ...c.pos]), [["C1", 30, 0, 25], ["C2", -30, 0, 25]]);
  assert.deepEqual(g2.lanterns.map((l) => l.pos), [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]);
});

test("điểm sinh đom đóm: Đêm 1 có 24 điểm, Đêm 2 có 24, Đêm 3 có 30; bắt đầu 20 con ở 20 điểm khác nhau", () => {
  assert.equal(MAPS[1].motePoints.length, 24);
  assert.equal(MAPS[2].motePoints.length, 24);
  assert.equal(MAPS[3].motePoints.length, 30);
  for (const n of [1, 2, 3]) {
    const g = createGame({ seed: 9, night: n });
    assert.equal(g.motes.length, 20);
    assert.equal(new Set(g.motes.map((m) => m.pos.join(","))).size, 20);
  }
});

test("Đêm 3 địa hình: tầng 2 = 6, tầng 1 = 3 (chỉ z > 0), dốc 30° nội suy 0 → 3, tháp là vật cản, ngoài 45 m là hư không", () => {
  const h = MAPS[3].height;
  assert.equal(h(0, -20), 0);
  assert.equal(h(0, 5), 6);
  assert.equal(h(0, 18), 3);
  assert.equal(h(0, -18), 0, "nửa z < 0 không có tầng 1");
  assert.equal(h(0, 1), Infinity, "tháp chuông");
  assert.equal(h(46, 0), -Infinity);
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  assert.ok(Math.abs(h(27 * c, 27 * s) - 1.5) < 1e-9, "giữa dốc cao 1.5 m");
  assert.ok(Math.abs(h(30 * c, 30 * s) - 0) < 1e-9, "chân dốc");
  assert.ok(Math.abs(h(24 * c, 24 * s) - 3) < 1e-9, "đỉnh dốc");
});

test("Đêm 2 địa hình: hai đảo r=28, cầu tre rộng 4 m, ngoài ra là hư không", () => {
  const h = MAPS[2].height;
  assert.equal(h(0, 0), 0);
  assert.equal(h(70, 0), 0);
  assert.equal(h(35, 2), 0);
  assert.equal(h(35, 2.01), -Infinity);
  assert.equal(h(35, 10), -Infinity);
});

// ---------- tick model ----------
test("tick 0 trước input, sự kiện ghi tick = k+1, night_start ở bước đầu", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, motes: [[0, 0, 0.5]] } });
  assert.equal(snapshotOf(g).tick, 0);
  const ev = stepGame(g);
  assert.equal(g.tick, 1);
  assert.deepEqual(ev, [
    { tick: 1, name: "night_start", data: { night: 1 } },
    { tick: 1, name: "mote_picked", data: { carried: 1 } },
  ]);
});

test("time_left_s = thời lượng - sim_tick/60", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  stepN(g, 120);
  assert.equal(r3(g.timeLeft), 298);
});

test("dựng scenario không cộng điểm và không phát sự kiện", () => {
  const { lines } = runHeadless({ seed: 1, scenario: { ...ISOLATED, lanterns: [{ id: "L1", lit: true }] }, ticks: 0 });
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).score, 0);
});

// ---------- luật Phase 2 ----------
test("điểm: +10 mỗi đom đóm NẠP (không phải nhặt), +100 mỗi đèn", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { pos: [0, 0, 23], carried: 10 }, motes: [[0, 0, 23.5]] } });
  stepGame(g); // nhặt nhưng đã đầy 10 => không nhặt
  assert.equal(g.score, 0);
  stepGame(g, press("interact"));
  assert.equal(g.score, 10 * 10 + 100);
});

test("tỏa sáng: đo 3D từ tâm (chân + 0.8) tới tâm Bóng Mực (mặt đất + 1.0), trúng khi ≤ 5", () => {
  // Bóng Mực cách XZ 4.9 -> 3D = hypot(4.9, 0.2) ≈ 4.904 ≤ 5; cách XZ 5.0 -> 5.004 > 5
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 3 }, shades: [{ id: "in", pos: [4.9, 0, 0] }, { id: "out", pos: [0, 0, 5.0] }] } });
  const ev = stepGame(g, press("pulse"));
  assert.deepEqual(named(ev, "pulse")[0].data, { stunned_ids: ["in"] });
  assert.equal(g.score, TUNING.score.per_stun);
  assert.equal(g.player.carried, 0);
  assert.equal(g.player.pulseCd, 180);
});

test("tỏa sáng cộng +5 cho từng con trúng, kể cả con đang choáng", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 10 }, shades: [{ id: "A", pos: [3, 0, 0], state: "stunned", state_ticks_left: 50 }] } });
  stepGame(g, press("pulse"));
  assert.equal(g.score, 5);
  assert.equal(g.shades[0].left, 120, "tỏa sáng lại làm mới thời gian choáng");
});

test("không đủ 3 đom đóm thì tỏa sáng không kích hoạt (không event, không hồi chiêu)", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 2 } } });
  const ev = stepGame(g, press("pulse"));
  assert.equal(named(ev, "pulse").length, 0);
  assert.equal(g.player.pulseCd, 0);
  assert.equal(g.player.carried, 2);
});

test("bị chạm: rơi floor(mang/2), bất tử 90 tick, Bóng Mực lùi (recoil) và không gây hit lần nữa trong lúc bất tử", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { carried: 7 }, shades: [{ pos: [0.5, 0, 0] }] } });
  const ev = stepGame(g);
  assert.deepEqual(named(ev, "player_hit")[0].data, { by: "shade", flames: 2, dropped: 3 });
  assert.equal(g.player.carried, 4);
  assert.equal(g.motes.length, 3);
  assert.ok(g.motes.every((m) => m.kind === "dropped" && m.ttl === 480));
  assert.equal(g.shades[0].state, "recoil");
  const ev2 = stepN(g, 80);
  assert.equal(named(ev2, "player_hit").length, 0);
});

test("đom đóm rơi nằm trên vành 1.5–2.5 m quanh Mây", () => {
  const g = createGame({ seed: 4, scenario: { ...ISOLATED, player: { carried: 10 }, shades: [{ pos: [0.5, 0, 0] }] } });
  stepGame(g);
  assert.equal(g.motes.length, 5);
  for (const m of g.motes) {
    const d = Math.hypot(m.pos[0], m.pos[2]);
    assert.ok(d >= 1.5 - 1e-9 && d <= 2.5 + 1e-9, `d=${d}`);
  }
});

test("Bóng Mực đang choáng/lùi/spawning không gây sát thương", () => {
  for (const state of ["stunned", "recoil", "spawning"]) {
    const g = createGame({ seed: 1, scenario: { ...ISOLATED, shades: [{ pos: [0.5, 0, 0], state, state_ticks_left: 30 }] } });
    const ev = stepN(g, 25);
    assert.equal(named(ev, "player_hit").length, 0, state);
  }
});

test("chạm cùng tick: con id nhỏ gây hit trước (so id tự nhiên) và chỉ 1 lần mất lửa", () => {
  assert.ok(compareIds("S2", "S10") < 0);
  assert.ok(compareIds("S10", "S2") > 0);
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, shades: [{ id: "S10", pos: [0.4, 0, 0] }, { id: "S2", pos: [0, 0, 0.4] }] } });
  const ev = stepGame(g);
  assert.equal(named(ev, "player_hit").length, 1);
  assert.equal(g.player.flames, 2);
  assert.equal(g.shades.find((s) => s.id === "S2").state, "recoil");
  assert.equal(g.shades.find((s) => s.id === "S10").state, "chase");
});

test("thắng: bonus = floor(giây còn) × 2 + lửa × 50, kể cả đúng tick hết giờ; hết lửa luôn thua trước", () => {
  const lit = ["L2", "L3", "L4", "L5"].map((id) => ({ id, lit: true }));
  const base = { ...ISOLATED, player: { pos: [0, 0, 23], carried: 10, flames: 2 }, lanterns: lit };
  const g = createGame({ seed: 1, scenario: { ...base, time_left_s: 100.5 } });
  stepGame(g, press("interact"));
  assert.equal(g.state, "won");
  assert.equal(g.score, 100 + 100 + Math.floor(100.5 - 1 / 60) * 2 + 2 * 50);
  const g2 = createGame({ seed: 1, scenario: { ...base, time_left_s: 1 / 60 } });
  stepGame(g2, press("interact"));
  assert.equal(g2.state, "won", "tắt đèn cuối đúng tick hết giờ vẫn thắng");
  assert.equal(g2.score, 100 + 100 + 0 + 100);
  // đèn vừa sáng tạo vùng an toàn đẩy Bóng Mực ra nên không thể vừa thắp xong vừa bị chạm cùng tick;
  // thứ tự "hết lửa luôn thua trước" được kiểm bằng scenario đã có 0 lửa và mọi đèn đã sáng
  const allLit = ["L1", "L2", "L3", "L4", "L5"].map((id) => ({ id, lit: true }));
  const g3 = createGame({ seed: 1, scenario: { ...ISOLATED, player: { flames: 0 }, lanterns: allLit } });
  stepGame(g3);
  assert.equal(g3.state, "lost");
  assert.equal(g3.reason, "no_flames", "hết lửa luôn thua, dù mọi đèn đã sáng");
});

test("đã kết thúc thì stepGame không làm gì thêm", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, time_left_s: 1 / 60 } });
  stepGame(g);
  assert.equal(g.state, "lost");
  assert.deepEqual(stepGame(g), []);
  assert.equal(g.tick, 1);
});

test("rơi khỏi đảo: đúng 1 lần, bỏ qua bất tử, mất hết đom đóm, hồi sinh sau 60 tick bất tử 90 tick", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { pos: [41, 0, 0], carried: 6, invuln_ticks: 500 } } });
  const ev = stepN(g, 200);
  const falls = ev.filter((e) => e.name === "player_hit" && e.data.by === "fall");
  assert.equal(falls.length, 1);
  assert.deepEqual(falls[0].data, { by: "fall", flames: 2, dropped: 0, lost: 6 });
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.player.carried, 0);
  assert.equal(g.player.invuln > 0, true);
});

test("tạm dừng: tick vẫn tăng, sim_tick/thời gian đứng yên; bấm lần nữa thì tiếp tục", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  stepN(g, 5);
  const ev1 = stepGame(g, press("pause"));
  assert.deepEqual(ev1.map((e) => e.name), ["paused"]);
  assert.equal(g.state, "paused");
  stepN(g, 10, (inp) => {
    inp.pause = false;
  });
  assert.equal(g.tick, 16);
  assert.equal(g.simTick, 5);
  assert.equal(snapshotOf(g).state, "paused");
  const ev2 = stepGame(g, press("pause"));
  assert.deepEqual(ev2.map((e) => e.name), ["resumed"]);
  assert.equal(g.simTick, 6, "bước tiếp tục thực sự chạy");
});

test("tất định trong cùng tiến trình: cùng seed -> cùng output (cả 3 đêm); khác seed -> khác", () => {
  for (const night of [1, 2, 3]) {
    const a = runHeadless({ seed: 5, night, ticks: 2400 }).lines.join("\n");
    const b = runHeadless({ seed: 5, night, ticks: 2400 }).lines.join("\n");
    const c = runHeadless({ seed: 6, night, ticks: 2400 }).lines.join("\n");
    assert.equal(a, b, `đêm ${night}`);
    assert.notEqual(a, c, `đêm ${night}`);
  }
});

test("id Bóng Mực tự sinh không trùng id do scenario đặt; 2 con ở tick 300", () => {
  const g = createGame({ seed: 3, scenario: { random_motes: false, shades: [{ id: "S1", pos: [30, 0, 0] }] } });
  const ev = stepN(g, 300);
  const spawned = named(ev, "shade_spawned");
  assert.equal(spawned.length, 2);
  assert.ok(spawned.every((e) => e.tick === 300));
  assert.ok(spawned.every((e) => e.data.id !== "S1"));
});

test("Gió Lạc: chỉ chase khi mang ≥ 5 (nếu không tự về idle, không cướp); cướp 3; bay đi 240 tick rồi biến mất", () => {
  const poor = createGame({ seed: 1, night: 2, scenario: { ...ISOLATED, player: { carried: 4 }, drifters: [{ id: "D1", pos: [1, 0, 0], state: "chase" }] } });
  assert.equal(named(stepGame(poor), "drifter_steal").length, 0);
  assert.equal(poor.drifters[0].state, "idle");
  const g = createGame({ seed: 1, night: 2, scenario: { ...ISOLATED, player: { carried: 6 }, drifters: [{ id: "D1", pos: [1, 0, 0], state: "chase" }] } });
  const ev = stepGame(g);
  assert.deepEqual(named(ev, "drifter_steal")[0].data, { drifter_id: "D1", amount: 3, carried: 3 });
  stepN(g, 239);
  assert.equal(g.drifters.length, 1);
  stepN(g, 2);
  assert.equal(g.drifters.length, 0);
});

test("Bùa Gió: nhặt như đom đóm, 600 tick, hồi sau 2700 tick", () => {
  const g = createGame({ seed: 1, night: 2, scenario: { ...ISOLATED, charms: [{ id: "C1", pos: [0, 0, 0.5] }] } });
  const ev = stepGame(g);
  assert.deepEqual(named(ev, "charm_picked")[0].data, { charm_id: "C1", charm_ticks: 600 });
  assert.equal(g.player.charm, 600);
  assert.equal(g.charms[0].respawn, 2700);
  assert.equal(g.charms[0].available, false);
});
