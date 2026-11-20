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
test("Đêm 1: 5 đèn theo tọa độ chuẩn, xuất phát (0,0,0), 240 s (Ticket-03)", () => {
  const g = createGame({ seed: 1, scenario: ISOLATED });
  assert.deepEqual(g.lanterns.map((l) => [l.id, ...l.pos]), [["L1", 0, 0, 25], ["L2", 23.8, 0, 7.7], ["L3", 14.7, 0, -20.2], ["L4", -14.7, 0, -20.2], ["L5", -23.8, 0, 7.7]]);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.timeLeft, 240);
});

test("Đêm 2: 6 đèn, 270 s, 1 bùa; Đêm 3: 7 đèn, 300 s, 2 bùa (Ticket-03)", () => {
  const g2 = createGame({ seed: 1, night: 2 });
  const g3 = createGame({ seed: 1, night: 3 });
  assert.equal(g2.lanterns.length, 6);
  assert.equal(g3.lanterns.length, 7);
  assert.equal(g2.timeLeft, 270);
  assert.equal(g3.timeLeft, 300);
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
  assert.equal(r3(g.timeLeft), 238);
});

test("dựng scenario không cộng điểm và không phát sự kiện", () => {
  const { lines } = runHeadless({ seed: 1, scenario: { ...ISOLATED, lanterns: [{ id: "L1", lit: true }] }, ticks: 0 });
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).score, 0);
});

// ---------- luật Phase 2 ----------
test("điểm Ticket-03: +5 mỗi đom đóm NẠP (không phải nhặt), +100 thắp lần đầu", () => {
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { pos: [0, 0, 23], carried: 10 }, motes: [[0, 0, 23.5]] } });
  stepGame(g); // nhặt nhưng đã đầy 10 => không nhặt
  assert.equal(g.score, 0);
  stepGame(g, press("interact"));
  assert.equal(g.score, 10 * 5 + 100);
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

// Ticket-03 thay luật "thắng ngay khi tất cả đèn sáng" + thưởng thời gian bằng "sống tới bình minh với >= ceil(0.6·n) đèn".
// Test cũ (thắng sớm all_lit, thưởng floor(giây còn)·2) bị thay nên được viết lại như dưới đây và ở các test Phase 3.
test("thắng bình minh: >= ceil(0.6·n) đèn sáng, điểm = Σ(50 + floor(fuel)) + 50·lửa; hết lửa luôn thua trước", () => {
  const lit = ["L1", "L2", "L3"].map((id) => ({ id, lit: true }));
  const g = createGame({ seed: 1, scenario: { ...ISOLATED, player: { flames: 2 }, lanterns: lit, time_left_s: 1 / 60 } });
  stepGame(g);
  assert.equal(g.state, "won");
  assert.equal(g.reason, "dawn_survived");
  assert.equal(g.score, 3 * (50 + 99) + 2 * 50, "fuel 100 - 1/60 -> floor = 99");
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

// ---------- Phase 3: Đèn cạn dầu (Ticket-03) ----------
const T0 = { ...ISOLATED };
const withTuning = (over) => ({ ...TUNING, ...over });

test("thắp đủ mọi đèn KHÔNG kết thúc đêm (không còn thắng sớm)", () => {
  const lit = ["L1", "L2", "L3", "L4"].map((id) => ({ id, lit: true }));
  const g = createGame({ seed: 1, scenario: { ...T0, player: { pos: [0, 0, -8], carried: 10 }, lanterns: [...lit, { id: "L5", pos: [0, 0, -10] }] } });
  stepGame(g, press("interact"));
  assert.equal(g.lanterns.every((L) => L.lit), true);
  assert.equal(g.state, "playing");
});

test("dầu: vừa thắp = 100, hao 1/giây theo đơn vị nguyên 1/60 (không sai số thực)", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true }] } });
  assert.equal(g.lanterns[0].fuelU, 6000);
  stepN(g, 600);
  assert.equal(g.lanterns[0].fuelU, 5400);
  assert.equal(snapshotOf(g).lanterns[0].fuel, 90);
});

test("scenario: lit:true không khai báo fuel -> 100; khai báo fuel; ever_lit mặc định theo lit", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true, fuel: 42.5 }, { id: "L3", lit: false, ever_lit: true }] } });
  const snap = snapshotOf(g).lanterns;
  assert.deepEqual(snap.slice(0, 4).map((l) => [l.lit, l.fuel, l.ever_lit, l.relit_count]), [[true, 100, true, 0], [true, 42.5, true, 0], [false, 0, true, 0], [false, 0, false, 0]]);
});

test("hết dầu: fuel <= 0 -> tắt ngay sau bước hao, deposited = 0, ever_lit giữ, phát lantern_out đúng 1 lần", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true, fuel: (1 / 60) * 3, deposited: 10 }] } });
  const ev = stepN(g, 5);
  const out = named(ev, "lantern_out");
  assert.equal(out.length, 1);
  assert.equal(out[0].tick, 3);
  const L = g.lanterns[0];
  assert.deepEqual([L.lit, L.deposited, L.everLit, L.fuelU], [false, 0, true, 0]);
});

test("thắp lại cần 5; chưa từng sáng cần 10; successful_lights tăng cả khi thắp lại", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, player: { pos: [0, 0, 23], carried: 20 }, lanterns: [{ id: "L1", lit: false, ever_lit: true }, { id: "L2", pos: [0, 0, 22] }] } });
  const ev = stepGame(g, press("interact")); // gần nhất = L2 (1.0 m), chưa từng sáng -> cần 10
  assert.deepEqual(named(ev, "lantern_lit")[0].data, { lantern_id: "L2", relight: false });
  assert.equal(g.player.carried, 10);
  stepGame(g, (i) => (i.interact = false));
  g.lanterns[1].pos = [0, 0, 40]; // L2 đã sáng và ở xa: đèn gần nhất còn lại là L1 (đèn tắt đã từng sáng)
  const ev2 = stepGame(g, press("interact"));
  assert.deepEqual(named(ev2, "lantern_lit")[0].data, { lantern_id: "L1", relight: true });
  assert.equal(g.player.carried, 5);
  assert.equal(g.lanterns[0].relitCount, 1);
  assert.equal(g.player.successfulLights, 2);
});

test("châm dầu: used = min(mang, ceil((100-fuel)/10)); đèn đầy dầu không được chọn", () => {
  // tắt hao (decay 0) để đèn có thể ĐẦY dầu ở bước tương tác
  const full = createGame({ seed: 1, tuning: withTuning({ fuel_decay_per_s: 0 }), scenario: { ...T0, player: { pos: [0, 0, 23], carried: 5 }, lanterns: [{ id: "L1", lit: true }, { id: "L2", pos: [0, 0, 21] }] } });
  const evFull = stepGame(full, press("interact"));
  assert.equal(named(evFull, "refuel").length, 0, "đèn đầy dầu bị bỏ qua");
  assert.equal(named(evFull, "deposit").length, 1, "chọn đèn nhận được tiếp theo (L2 tắt, cách 2.0 m)");
  assert.equal(full.lanterns[0].fuelU, 6000);
  const part = createGame({ seed: 1, tuning: withTuning({ fuel_decay_per_s: 0 }), scenario: { ...T0, player: { pos: [0, 0, 23], carried: 9 }, lanterns: [{ id: "L1", lit: true, fuel: 61 }] } });
  const ev = stepGame(part, press("interact"));
  assert.deepEqual(named(ev, "refuel")[0].data, { lantern_id: "L1", amount: 4, fuel: 100 }, "ceil(39/10) = 4, dư bị bỏ");
  assert.equal(part.player.carried, 5);
  assert.equal(part.score, 4 * 5);
});

test("Bóng Mực drain: mỗi con hút 5/s cộng dồn với tự hao; vùng an toàn mất khi fuel < 30 (đúng 30 vẫn còn)", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, player: { pos: [0, 0, -30] }, lanterns: [{ id: "L1", lit: true, fuel: 100 }], shades: [{ id: "A", pos: [0, 0, 26], state: "drain" }, { id: "B", pos: [0, 0, 24], state: "drain" }] } });
  assert.equal(g.shades[0].target, "L1", "drain không khai báo mục tiêu -> đèn sáng gần nhất");
  stepGame(g);
  assert.equal(g.lanterns[0].fuelU, 6000 - 11, "1 + 5 + 5 đơn vị mỗi tick");
  const z30 = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true, fuel: 30 }] } });
  const z29 = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true, fuel: 29.99 }] } });
  const zone = (game) => game.lanterns[0].fuelU >= game.fu.low;
  assert.equal(zone(z30), true);
  assert.equal(zone(z29), false);
});

test("Bóng Mực drain: chase khi Mây <= 6 m; wander khi fuel >= 30; stunned khi trúng Tỏa Sáng (+15)", () => {
  const mk = (extra) => createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true, fuel: 20 }], shades: [{ id: "S", pos: [0, 0, 26], state: "drain", target_lantern_id: "L1" }], ...extra } });
  const chase = mk({ player: { pos: [0, 0, 20] } });
  stepGame(chase);
  assert.equal(chase.shades[0].state, "chase");
  const stay = mk({ player: { pos: [0, 0, 19.99] } });
  stepGame(stay);
  assert.equal(stay.shades[0].state, "drain");
  const refilled = createGame({ seed: 1, scenario: { ...T0, player: { pos: [0, 0, -30] }, lanterns: [{ id: "L1", lit: true, fuel: 40 }], shades: [{ id: "S", pos: [0, 0, 26], state: "drain", target_lantern_id: "L1" }] } });
  stepGame(refilled); // fuel 40 > 30 sau khi bị hút 1 tick -> không còn là đèn yếu
  assert.notEqual(refilled.shades[0].state, "drain", "fuel >= 30 -> thôi drain");
  const pulse = mk({ player: { pos: [0, 0, 23], carried: 3 } });
  stepGame(pulse, press("pulse"));
  assert.equal(pulse.shades[0].state, "stunned");
  assert.equal(pulse.score, 15);
});

test("sức chứa = min(20, 10 + 2·successful_lights), đặt lại mỗi đêm; HUD đọc từ snapshot.player.capacity", () => {
  for (const [n, cap] of [[0, 10], [1, 12], [4, 18], [5, 20], [9, 20]]) {
    const g = createGame({ seed: 1, scenario: { ...T0, player: { successful_lights: n } } });
    assert.equal(snapshotOf(g).player.capacity, cap);
  }
  const fresh = createGame({ seed: 1, night: 2 });
  assert.equal(snapshotOf(fresh).player.capacity, 10);
});

test("điểm bình minh: mỗi đèn sáng 50 + floor(fuel), mỗi lửa 50; thua thì không cộng", () => {
  const win = createGame({ seed: 1, scenario: { ...T0, time_left_s: 1 / 60, lanterns: [{ id: "L1", lit: true, fuel: 80.9 }, { id: "L2", lit: true, fuel: 10 }, { id: "L3", lit: true, fuel: 60 }] } });
  stepGame(win);
  // sau 1 tick: 80.9 - 1/60 -> floor 80; 10 - 1/60 -> 9; 60 - 1/60 -> 59
  assert.equal(win.score, 50 + 80 + (50 + 9) + (50 + 59) + 3 * 50);
  const lose = createGame({ seed: 1, scenario: { ...T0, time_left_s: 1 / 60, lanterns: [{ id: "L1", lit: true }] } });
  stepGame(lose);
  assert.equal(lose.state, "lost");
  assert.equal(lose.reason, "dawn");
  assert.equal(lose.score, 0);
});

test("tạm dừng: dầu đèn không hao khi pause", () => {
  const g = createGame({ seed: 1, scenario: { ...T0, lanterns: [{ id: "L1", lit: true }] } });
  stepN(g, 10);
  stepGame(g, press("pause"));
  const f = g.lanterns[0].fuelU;
  stepN(g, 30, (i) => (i.pause = false));
  assert.equal(g.lanterns[0].fuelU, f);
});

test("output headless: snapshot có fuel (1 chữ số), ever_lit, relit_count, capacity; drain/lantern_out đúng định dạng", () => {
  const { lines } = runHeadless({ seed: 1, ticks: 130, snapshotEvery: 10, scenario: { ...T0, player: { pos: [0, 0, -30] }, lanterns: [{ id: "L1", lit: true, fuel: 3 }], shades: [{ id: "S1", pos: [0, 0, 26], state: "drain" }] } });
  const objs = lines.map((l) => JSON.parse(l));
  const snap = objs.find((o) => o.type === "snapshot" && o.tick === 60);
  assert.deepEqual(Object.keys(snap.lanterns[0]), ["id", "pos", "lit", "deposited", "fuel", "ever_lit", "relit_count"]);
  assert.equal(snap.player.capacity, 10);
  assert.equal(snap.shades[0].state, "wander", "đèn đã tắt -> Bóng Mực thôi hút");
  assert.equal(snap.lanterns[0].fuel, 0);
  assert.equal(objs.filter((o) => o.name === "fuel_drain").length, 0, "180 đơn vị hết trong 30 tick, trước mốc ghi 60 tick");
  assert.equal(objs.filter((o) => o.name === "lantern_out").length, 1);
});
