// Sinh lại tests/scenarios/*/{scenario,inputs,expect}.json:  node tests/scenarios/_generate.mjs tests/scenarios
// (xóa thư mục scenario cũ trước khi sinh lại). Đây là nơi ghi CÔNG THỨC TÍNH TAY của mọi expect từ Ticket-02 (jumpY, fallDrop, ...);
// KHÔNG được chép output của chương trình vào expect.
// Sinh scenario Phase 2 vào tests/scenarios/<tên>/{scenario,inputs,expect}.json
// Mọi số trong expect được tính TAY từ Ticket-02 bằng công thức đóng (không đọc output của game).
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;

// ---- công thức độc lập (bán ẩn Euler: vy -= 20/60 rồi y += vy/60) ----
const jumpY = (v, n) => (v * n - (n * (n + 1)) / 6) / 60; // sau n tick kể từ lúc vy = v
const fallDrop = (k) => (k * (k + 1)) / 360; // rơi tự do k tick từ nghỉ

const BASE = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const withBase = (o = {}) => ({ ...BASE, ...o });
const N1_LANTERNS = [["L1", [0, 0, 25]], ["L2", [23.8, 0, 7.7]], ["L3", [14.7, 0, -20.2]], ["L4", [-14.7, 0, -20.2]], ["L5", [-23.8, 0, 7.7]]];
const N2_LANTERNS = [["L1", [0, 0, 20]], ["L2", [17, 0, -10]], ["L3", [-17, 0, -10]], ["L4", [70, 0, 20]], ["L5", [87, 0, -10]], ["L6", [53, 0, -10]]];
const N3_LANTERNS = [["L1", [0, 6, 6]], ["L2", [18, 3, 10]], ["L3", [-18, 3, 10]], ["L4", [35, 0, -10]], ["L5", [-35, 0, -10]], ["L6", [20, 0, -35]], ["L7", [-20, 0, -35]]];
const lanternsExpect = (list, extra = {}) => list.map(([id, pos]) => ({ id, pos, lit: false, deposited: 0, ...extra }));
const ALL_EVENTS = ["mote_picked", "deposit", "lantern_lit", "pulse", "player_hit", "shade_spawned", "game_over", "dash", "charm_picked", "drifter_steal", "drifter_drop", "paused", "resumed"];

const S = {};
const add = (name, def) => (S[name] = def);

// ======================= Hồi quy Phase 1 (tính lại với số chuẩn) =======================
add("smoke_default", {
  expect: {
    requirement: "R1/C7",
    description: "Đêm 1 mặc định seed 42: 20 đom đóm lúc đầu, thêm 1 ở tick 240 và 480; 2 Bóng Mực sinh đúng tick 300 (S1,S2) ở trạng thái spawning 60 tick rồi wander; night_start ở tick 1; không chạm trong 600 tick",
    seed: 42, ticks: 600,
    expect: {
      end: { type: "end", ticks: 600, state: "playing", score: 0 },
      snapshots: {
        0: { tick: 0, sim_tick: 0, state: "playing", night: 1, time_left_s: 300, score: 0, wind: { active: false, dir_deg: 0 },
          player: { pos: [0, 0, 0], vel: [0, 0, 0], grounded: true, flames: 3, carried: 0, invuln: false, dash_cd_s: 0, pulse_cd_s: 0, charm_s: 0 },
          lanterns: lanternsExpect(N1_LANTERNS), shades: [], motes_active: 20, drifters: [], charms: [] },
        240: { motes_active: 21 }, 310: { shades: [{ id: "S1", state: "spawning" }, { id: "S2", state: "spawning" }] },
        350: { shades: [{ state: "spawning" }, { state: "spawning" }] }, 360: { shades: [{ state: "wander" }, { state: "wander" }] },
        480: { motes_active: 22 }, 600: { time_left_s: 290, sim_tick: 600, shades: [{ id: "S1", state: "wander" }, { id: "S2", state: "wander" }] },
      },
      events: [
        { tick: 1, name: "night_start", data: { night: 1 } },
        { tick: 300, name: "shade_spawned", data: { id: "S1" } },
        { tick: 300, name: "shade_spawned", data: { id: "S2" } },
      ],
      event_counts: { night_start: 1, shade_spawned: 2, mote_picked: 0, player_hit: 0 },
    },
  },
});
add("move_forward", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }] },
  expect: {
    requirement: "R3", description: "Tick model: tick 0 trước input; move [0,1] ở 6 m/s (tăng tốc tức thời ≤ 0.1 s) -> 1 m sau 10 tick, 6 m sau 60 tick; time_left_s = 300 - 60/60",
    seed: 1, ticks: 60,
    expect: { end: { ticks: 60, state: "playing" }, snapshots: { 0: { player: { pos: [0, 0, 0] }, time_left_s: 300 }, 10: { sim_tick: 10, player: { pos: [0, 0, 1], vel: [0, 0, 6], grounded: true } }, 60: { player: { pos: [0, 0, 6] }, time_left_s: 299 } } },
  },
});
add("move_cam_yaw90", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
  expect: { requirement: "R4", description: "cam_yaw_deg=90, move [0,1]: x' = x·cosθ + z·sinθ = 1, z' = 0 -> đi +X, 6 m sau 60 tick", seed: 1, ticks: 60, expect: { snapshots: { 60: { player: { pos: [6, 0, 0] } } } } },
});
add("move_diagonal_normalized", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [1, 1] }] },
  expect: { requirement: "R4", description: "move [1,1] dài √2 > 1 phải chuẩn hóa: mỗi trục 6/√2 = 4.243 m sau 60 tick", seed: 1, ticks: 60, expect: { snapshots: { 60: { player: { pos: [r3(6 / Math.SQRT2), 0, r3(6 / Math.SQRT2)] } } } } },
});
add("input_fields_persist", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 30, cam_yaw_deg: 180 }, { tick: 60, move: [0, 0] }] },
  expect: { requirement: "R3", description: "Trường vắng giữ giá trị cũ: tick 30 chỉ đổi yaw 180° nên move [0,1] vẫn giữ -> đi ngược về gốc; tick 60 dừng", seed: 1, ticks: 90,
    expect: { snapshots: { 30: { player: { pos: [0, 0, 3] } }, 60: { player: { pos: [0, 0, 0] } }, 90: { player: { pos: [0, 0, 0] } } } } },
});
add("jump_arc", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, jump: true }] },
  expect: {
    requirement: "R17/C1", description: "Nhảy 7.0 m/s, trọng lực 20 m/s²: y_n = (7n - n(n+1)/6)/60 -> tick 10: 0.861; tick 20: 1.167 (đỉnh); tick 41 chạm đất (y = 0 đúng); giữ nút không nhảy lại; vy tick 10 = 7 - 10·20/60 = 3.667",
    seed: 1, ticks: 60, snapshot_every: 1,
    expect: { snapshots: {
      10: { player: { pos: [0, r3(jumpY(7, 10)), 0], vel: [0, r3(7 - 10 / 3), 0], grounded: false } },
      20: { player: { pos: [0, r3(jumpY(7, 20)), 0] } },
      40: { player: { pos: [0, r3(jumpY(7, 40)), 0], grounded: false } },
      41: { player: { pos: [0, 0, 0], grounded: true } },
      60: { player: { pos: [0, 0, 0], grounded: true } },
    } },
  },
});
add("pickup_radius_boundary", {
  scenario: withBase({ motes: [[0, 0, 1.0], [1.001, 0, 0]] }),
  expect: {
    requirement: "R6/C1", description: "Nhặt khi XZ ≤ 1.0: đom đóm cách đúng 1.0 m được nhặt; cách 1.001 m thì không. Nhặt KHÔNG cộng điểm (Ticket-02: +10 khi NẠP)",
    seed: 1, ticks: 5, snapshot_every: 1,
    expect: { events: [{ tick: 1, name: "mote_picked", data: { carried: 1 } }], event_counts: { mote_picked: 1 }, snapshots: { 0: { motes_active: 2, score: 0 }, 1: { motes_active: 1, score: 0, player: { carried: 1 } }, 5: { motes_active: 1 } }, end: { score: 0 } },
  },
});
add("pickup_height_ok", {
  scenario: withBase({ player: { pos: [0, 1.4, 0] }, motes: [[0, 0, 0.5]] }),
  expect: { requirement: "C1", description: "Nhặt cần chênh cao chân Mây - mặt đất nơi đặt ≤ 1.5: Mây ở y=1.4 (đang rơi, tick 1 còn 1.394) nhặt ngay tick 1", seed: 1, ticks: 3, expect: { events: [{ tick: 1, name: "mote_picked", data: { carried: 1 } }] } },
});
add("pickup_height_too_high", {
  scenario: withBase({ player: { pos: [0, 1.6, 0] }, motes: [[0, 0, 0.5]] }),
  expect: {
    requirement: "C1", description: "Mây ở y=1.6 rơi tự do y_k = 1.6 - k(k+1)/360: k=5 -> 1.5167 (> 1.5, chưa nhặt), k=6 -> 1.4833 (≤ 1.5) nhặt đúng tick 6",
    seed: 1, ticks: 8, snapshot_every: 1,
    expect: { events: [{ tick: 6, name: "mote_picked", data: { carried: 1 } }], event_counts: { mote_picked: 1 }, snapshots: { 5: { motes_active: 1, player: { pos: [0, r3(1.6 - fallDrop(5)), 0] } }, 6: { motes_active: 0 } } },
  },
});
add("pickup_tier_mismatch", {
  night: 3, scenario: withBase({ player: { pos: [0, 0, -8.1] }, motes: [[0, 6, -7.5]] }),
  expect: { requirement: "C1/C4", description: "Đêm 3: đom đóm trên tầng 2 (y=6) cách Mây 0.6 m theo XZ nhưng chân Mây ở tầng 0 (chênh 6 m > 1.5) -> không nhặt", seed: 1, ticks: 20, expect: { absent_events: ["mote_picked"], snapshots: { 20: { motes_active: 1 } } } },
});
add("carry_capacity_full", {
  scenario: withBase({ player: { carried: 10 }, motes: [[0, 0, 0.5]] }),
  expect: { requirement: "R6", description: "Đang mang đủ carry_capacity (10) thì không nhặt thêm; đom đóm vẫn nằm đó", seed: 1, ticks: 5, snapshot_every: 5,
    expect: { absent_events: ["mote_picked"], snapshots: { 5: { motes_active: 1, player: { carried: 10 } } }, end: { score: 0 } } },
});
add("mote_cap_30", {
  scenario: { random_shades: false, random_drifters: false, wind_enabled: false, shades: [], drifters: [], charms: [], motes: Array.from({ length: 29 }, (_, i) => [35, 0, -7 + i * 0.5]) },
  expect: { requirement: "C1", description: "Trần 30 đom đóm: có 29, tick 240 sinh thêm 1 (=30); tick 480 và 720 không sinh nữa", seed: 3, ticks: 740, snapshot_every: 10,
    expect: { snapshots: { 230: { motes_active: 29 }, 240: { motes_active: 30 }, 480: { motes_active: 30 }, 720: { motes_active: 30 } } } },
});
add("deposit_and_light", {
  scenario: withBase({ player: { pos: [0, 0, 23.5], carried: 10 } }), inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
  expect: {
    requirement: "R7/C2", description: "Mang 10, cách L1 1.5 m (≤ 2.0), nhấn interact -> nạp 10 (lantern_cost 10), L1 sáng. Điểm = 10·10 (mỗi đom đóm NẠP) + 100 (đèn) = 200",
    seed: 1, ticks: 10, snapshot_every: 1,
    expect: {
      events: [{ tick: 1, name: "deposit", data: { lantern_id: "L1", amount: 10, deposited: 10 } }, { tick: 1, name: "lantern_lit", data: { lantern_id: "L1" } }],
      event_counts: { deposit: 1, lantern_lit: 1 },
      snapshots: { 0: { lanterns: lanternsExpect(N1_LANTERNS) }, 1: { score: 200, player: { carried: 0 }, lanterns: [{ id: "L1", lit: true, deposited: 10 }, { lit: false }, { lit: false }, { lit: false }, { lit: false }] } },
      end: { ticks: 10, state: "playing", score: 200 },
    },
  },
});
add("deposit_partial_remembered", {
  scenario: withBase({ player: { pos: [0, 0, 23], carried: 4 }, lanterns: [{ id: "L1", deposited: 3 }] }),
  inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 5, interact: true }] },
  expect: { requirement: "R7", description: "Đèn nhớ tiến độ: L1 đã có 3/10, nạp 4 -> 7/10 chưa sáng, +40 điểm (đúng biên 2.0 m). Lần bấm thứ hai không còn gì để nạp", seed: 1, ticks: 10,
    expect: { events: [{ tick: 1, name: "deposit", data: { lantern_id: "L1", amount: 4, deposited: 7 } }], event_counts: { deposit: 1 }, absent_events: ["lantern_lit"], end: { score: 40 } } },
});
add("deposit_overflow", {
  scenario: withBase({ player: { pos: [0, 0, 23], carried: 5 }, lanterns: [{ id: "L1", deposited: 8 }] }), inputs: { frames: [{ tick: 0, interact: true }] },
  expect: { requirement: "R7", description: "L1 đã 8/10, mang 5 -> chỉ nạp 2 (min(đang mang, còn thiếu)), còn giữ 3. Điểm = 2·10 + 100 = 120", seed: 1, ticks: 10,
    expect: { events: [{ tick: 1, name: "deposit", data: { lantern_id: "L1", amount: 2, deposited: 10 } }, { tick: 1, name: "lantern_lit", data: { lantern_id: "L1" } }], snapshots: { 10: { player: { carried: 3 }, score: 120 } } } },
});
add("deposit_out_of_range", {
  scenario: withBase({ player: { pos: [0, 0, 22.999], carried: 5 } }), inputs: { frames: [{ tick: 0, interact: true }] },
  expect: { requirement: "R7", description: "Cách L1 2.001 m (> interact_radius 2.0) thì nhấn interact không có tác dụng", seed: 1, ticks: 5,
    expect: { absent_events: ["deposit", "lantern_lit"], snapshots: { 0: { player: { carried: 5 } } }, end: { score: 0 } } },
});
add("interact_nearest_tiebreak", {
  scenario: withBase({ player: { pos: [0, 0, 23], carried: 10 }, lanterns: [{ id: "L2", pos: [0, 0, 21] }] }), inputs: { frames: [{ tick: 0, interact: true }] },
  expect: { requirement: "R5", description: "L1 (z=25) và L2 (z=21) cùng cách 2.0 m: chọn đèn id nhỏ hơn (L1); L2 không bị đụng tới", seed: 1, ticks: 10,
    expect: { events: [{ tick: 1, name: "deposit", data: { lantern_id: "L1", amount: 10, deposited: 10 } }, { tick: 1, name: "lantern_lit", data: { lantern_id: "L1" } }], event_counts: { deposit: 1 }, end: { score: 200 } } },
});

// ======================= Tỏa sáng =======================
add("pulse_stun_push", {
  scenario: withBase({ player: { carried: 5 }, shades: [{ id: "A", pos: [4, 0, 0] }, { id: "B", pos: [12, 0, 0] }] }),
  inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
  expect: {
    requirement: "R8/C1/C5", description: "Tỏa sáng (3 đom đóm, 5 m 3D, cd 3 s): A cách 4 m (3D=4.005) choáng 120 tick + bị đẩy 4 m trong 15 tick đầu (4/15 mỗi tick: x = 4 + 0.267 t, đủ x=8 ở tick 15); B cách 12 m (không trúng) đuổi 4 m/s (x = 12 - t/15). +5 điểm. Choáng hết ở tick 121 -> chase",
    seed: 1, ticks: 125, snapshot_every: 1,
    expect: {
      events: [{ tick: 1, name: "pulse", data: { stunned_ids: ["A"] } }], event_counts: { pulse: 1 }, absent_events: ["player_hit"],
      snapshots: {
        1: { score: 5, player: { carried: 2, pulse_cd_s: 3 }, shades: [{ id: "A", pos: [r3(4 + 4 / 15), 1, 0], state: "stunned" }, { id: "B", pos: [r3(12 - 1 / 15), 1, 0], state: "chase" }] },
        15: { shades: [{ id: "A", pos: [8, 1, 0], state: "stunned" }, { id: "B", pos: [r3(12 - 15 / 15), 1, 0], state: "chase" }] },
        16: { shades: [{ id: "A", pos: [8, 1, 0], state: "stunned" }, { id: "B" }] },
        61: { player: { pulse_cd_s: 2 } },
        120: { shades: [{ id: "A", pos: [8, 1, 0], state: "stunned" }, { id: "B", pos: [4, 1, 0] }] },
        121: { shades: [{ id: "A", state: "chase", pos: [r3(8 - 1 / 15), 1, 0] }, { id: "B" }] },
        125: { shades: [{ id: "A", pos: [r3(8 - 5 / 15), 1, 0] }, { id: "B", pos: [r3(12 - 125 / 15), 1, 0] }] },
      },
    },
  },
});
add("pulse_cooldown_edge", {
  scenario: withBase({ player: { carried: 10 } }),
  inputs: { frames: [{ tick: 0, pulse: true }, { tick: 50, pulse: false }, { tick: 60, pulse: true }, { tick: 190, pulse: false }, { tick: 200, pulse: true }] },
  expect: {
    requirement: "R5/R8", description: "Cạnh lên + hồi chiêu 3 s = 180 tick: pulse tick 1; bấm ở tick 61 (còn hồi chiêu 120) bị bỏ; giữ nút qua tick 181 không kích hoạt lại (không có cạnh lên); bấm lại ở tick 201 -> pulse thứ hai. Mang 10 - 3 - 3 = 4",
    seed: 1, ticks: 220, snapshot_every: 1,
    expect: { events: [{ tick: 1, name: "pulse", data: { stunned_ids: [] } }, { tick: 201, name: "pulse", data: { stunned_ids: [] } }], event_counts: { pulse: 2 },
      snapshots: { 1: { player: { carried: 7, pulse_cd_s: 3 } }, 181: { player: { carried: 7, pulse_cd_s: 0 } }, 201: { player: { carried: 4, pulse_cd_s: 3 } } } },
  },
});
add("pulse_insufficient_light", {
  scenario: withBase({ player: { carried: 2 }, shades: [{ id: "A", pos: [3, 0, 0] }] }), inputs: { frames: [{ tick: 0, pulse: true }] },
  expect: { requirement: "R8", description: "Mang 2 < pulse_cost 3 -> không kích hoạt: không event, không hồi chiêu, Bóng Mực không choáng", seed: 1, ticks: 1, snapshot_every: 1,
    expect: { absent_events: ["pulse"], snapshots: { 1: { player: { carried: 2, pulse_cd_s: 0 }, shades: [{ id: "A", state: "chase" }] } } } },
});

// ======================= Bóng Mực =======================
add("shade_hit_invuln_lose", {
  scenario: withBase({ player: { carried: 5 }, shades: [{ id: "S1", pos: [0.5, 0, 0] }] }),
  expect: {
    requirement: "R9/R12/C5", description: "Bóng Mực áp sát: hit ở tick 1 (rơi floor(5/2)=2); lùi 2 m trong 60 tick (x: 0.433 -> 2.433, hết lùi ở tick 61 -> chase); bất tử 90 tick nên hit tiếp ở tick 91 (rơi floor(3/2)=1) và tick 181 (rơi floor(2/2)=1, hết lửa) -> thua no_flames",
    seed: 1, ticks: 300, snapshot_every: 1,
    expect: {
      events: [
        { tick: 1, name: "player_hit", data: { by: "shade", flames: 2, dropped: 2 } },
        { tick: 91, name: "player_hit", data: { by: "shade", flames: 1, dropped: 1 } },
        { tick: 181, name: "player_hit", data: { by: "shade", flames: 0, dropped: 1 } },
        { tick: 181, name: "game_over", data: { result: "lost", reason: "no_flames" } },
      ],
      event_counts: { player_hit: 3, game_over: 1 },
      snapshots: {
        1: { player: { invuln: true, flames: 2, carried: 3 }, shades: [{ id: "S1", state: "recoil", pos: [r3(0.5 - 1 / 15), 1, 0] }] },
        60: { shades: [{ state: "recoil", pos: [r3(0.5 - 1 / 15 + 59 / 30), 1, 0] }] },
        61: { shades: [{ state: "chase", pos: [r3(0.5 - 1 / 15 + 2), 1, 0] }] },
        90: { player: { invuln: true } },
        91: { player: { flames: 1 } },
      },
      end: { ticks: 181, state: "lost", score: 0 },
    },
  },
});
add("shade_spawning_harmless", {
  scenario: withBase({ shades: [{ id: "S1", pos: [0.5, 0, 0], state: "spawning", state_ticks_left: 20 }] }),
  expect: { requirement: "C5", description: "Bóng Mực spawning (còn 20 tick) đứng yên, không gây sát thương; hết spawning ở tick 20 thì chase và chạm ngay trong tick đó", seed: 1, ticks: 30, snapshot_every: 10,
    expect: { events: [{ tick: 20, name: "player_hit", data: { by: "shade", flames: 2, dropped: 0 } }], event_counts: { player_hit: 1 }, snapshots: { 10: { shades: [{ id: "S1", state: "spawning", pos: [0.5, 1, 0] }] } } } },
});
add("shade_detect_giveup", {
  scenario: withBase({ shades: [{ id: "A", pos: [12, 0, 0] }, { id: "B", pos: [12.001, 0, 0] }, { id: "C", pos: [18, 0, 0], state: "chase" }, { id: "D", pos: [18.001, 0, 0], state: "chase" }] }),
  expect: { requirement: "C5", description: "Phát hiện ≤ 12 m (XZ): A (12.0) chase, B (12.001) vẫn wander. Bỏ đuổi > 18 m: C (18.0) vẫn chase, D (18.001) về wander", seed: 1, ticks: 1, snapshot_every: 1,
    expect: { snapshots: { 1: { shades: [{ id: "A", state: "chase", pos: [r3(12 - 1 / 15), 1, 0] }, { id: "B", state: "wander" }, { id: "C", state: "chase", pos: [r3(18 - 1 / 15), 1, 0] }, { id: "D", state: "wander" }] } } } },
});
add("unlit_lantern_no_protection", {
  scenario: withBase({ player: { pos: [0, 0, 25] }, shades: [{ id: "A", pos: [0, 0, 30.5] }] }),
  expect: { requirement: "R10", description: "Đèn CHƯA sáng không bảo vệ: Bóng Mực cách 5.5 m, 4 m/s: khoảng cách = 5.5 - t/15 ≤ 1.0 lần đầu ở t = 68 (0.967) -> hit tick 68", seed: 1, ticks: 70,
    expect: { events: [{ tick: 68, name: "player_hit", data: { by: "shade", flames: 2, dropped: 0 } }], event_counts: { player_hit: 1 } } },
});
add("safe_radius_blocks", {
  scenario: withBase({ player: { pos: [0, 0, 25] }, shades: [{ id: "A", pos: [0, 0, 36] }], lanterns: [{ id: "L1", lit: true }] }),
  expect: { requirement: "R10", description: "Đứng tại L1 đã sáng: Bóng Mực (11 m, chase) bị chặn ở mép 6 m quanh đèn -> dừng ở z = 25 + 6 = 31, không bao giờ chạm người chơi", seed: 1, ticks: 600,
    expect: { absent_events: ["player_hit"], snapshots: { 600: { shades: [{ id: "A", pos: [0, 1, 31], state: "chase" }] } }, invariants: ["shades_outside_lit_safe_radius"] } },
});
add("safe_zone_expels_inside", {
  scenario: withBase({ player: { pos: [0, 0, 25] }, shades: [{ id: "S1", pos: [0, 0, 25.8] }], lanterns: [{ id: "L1", lit: true }] }),
  expect: { requirement: "C1/C5", description: "Bóng Mực đang trong vùng an toàn (cách người chơi 0.8 m): bị đẩy đều ra mép 6 m trong đúng 30 tick (mỗi tick (31-25.8)/30 = 0.173 m), trạng thái recoil, KHÔNG gây sát thương; xong thì chase và bị chặn ở z=31", seed: 1, ticks: 60, snapshot_every: 10,
    expect: { absent_events: ["player_hit"], snapshots: { 10: { shades: [{ id: "S1", pos: [0, 1, r3(25.8 + (10 * 5.2) / 30)], state: "recoil" }] }, 30: { shades: [{ pos: [0, 1, 31], state: "chase" }] }, 60: { shades: [{ pos: [0, 1, 31], state: "chase" }] } }, invariants: [] } },
});
add("lantern_lit_expels_shade", {
  scenario: withBase({ player: { pos: [0, 0, 23], carried: 10 }, shades: [{ id: "S1", pos: [0, 0, 28] }] }), inputs: { frames: [{ tick: 0, interact: true }] },
  expect: { requirement: "C1/C5", description: "Đèn vừa sáng ở tick 1: Bóng Mực cách đèn 3 m bị đẩy ra mép 6 m trong 30 tick (0.1 m/tick: z = 28 + 0.1 t), không chạm người chơi", seed: 1, ticks: 40, snapshot_every: 10,
    expect: { events: [{ tick: 1, name: "lantern_lit", data: { lantern_id: "L1" } }], absent_events: ["player_hit"], snapshots: { 10: { shades: [{ pos: [0, 1, 29], state: "recoil" }] }, 30: { shades: [{ pos: [0, 1, 31], state: "chase" }] } } } },
});
add("win_all_lit", {
  scenario: withBase({ time_left_s: 300, player: { pos: [0, 0, -8], carried: 10 }, lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", pos: [0, 0, -10] }] }),
  inputs: { frames: [{ tick: 0, interact: true }] },
  expect: { requirement: "R11/C2", description: "Thắp đèn cuối -> thắng all_lit ở tick 1. Điểm = 10·10 (nạp) + 100 (đèn) + floor(299.983)·2 = 598 + 3 lửa·50 = 150 -> 948", seed: 1, ticks: 100,
    expect: { events: [{ tick: 1, name: "deposit", data: { lantern_id: "L5", amount: 10, deposited: 10 } }, { tick: 1, name: "lantern_lit", data: { lantern_id: "L5" } }, { tick: 1, name: "game_over", data: { result: "won", reason: "all_lit" } }], end: { ticks: 1, state: "won", score: 948 } } },
});
add("win_at_last_tick", {
  scenario: withBase({ time_left_s: 1, player: { pos: [0, 0, -8], carried: 10 }, lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", pos: [0, 0, -10] }] }),
  inputs: { frames: [{ tick: 59, interact: true }] },
  expect: { requirement: "C2", description: "Thắp đèn cuối đúng tick hết giờ (tick 60, time_left = 0) vẫn THẮNG; điểm = 100 + 100 + floor(0)·2 + 150 = 350", seed: 1, ticks: 100,
    expect: { events: [{ tick: 60, name: "game_over", data: { result: "won", reason: "all_lit" } }], end: { ticks: 60, state: "won", score: 350 } } },
});
add("lose_dawn", {
  scenario: withBase({ time_left_s: 1 }),
  expect: { requirement: "R12", description: "time_left_s 1 -> hết giờ sau 60 bước: game_over lost/dawn ở tick 60, dừng sớm dù --ticks 200", seed: 1, ticks: 200,
    expect: { events: [{ tick: 60, name: "game_over", data: { result: "lost", reason: "dawn" } }], snapshots: { 60: { state: "lost", time_left_s: 0 } }, end: { ticks: 60, state: "lost", score: 0 } } },
});
add("scenario_setup_no_events", {
  scenario: withBase({ player: { carried: 3, flames: 2 }, lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", deposited: 2 }] }),
  expect: { requirement: "R13", description: "Dựng scenario (4 đèn lit:true, player carried/flames) không phát sự kiện (trừ night_start ở tick 1), không cộng điểm", seed: 1, ticks: 10,
    expect: { absent_events: ALL_EVENTS, snapshots: { 0: { score: 0, player: { carried: 3, flames: 2 }, lanterns: [{ lit: true }, { lit: true }, { lit: true }, { lit: true }, { id: "L5", lit: false, deposited: 2 }] } }, end: { ticks: 10, state: "playing", score: 0 } } },
});

// ======================= Rơi khỏi đảo =======================
const FALL_TICK = 21 + 60; // rời mép ở tick 21, rơi 60 tick (y_k = -k(k+1)/360 < -10 lần đầu ở k = 60)
add("island_edge_fall", {
  scenario: withBase({ player: { pos: [38, 0, 0], carried: 4 } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] },
  expect: {
    requirement: "C3", description: "Rơi khỏi đảo (thay island_boundary_no_fall): chạy +X từ x=38, x=40 ở tick 20 (còn đứng được), tick 21 ra hư không; rơi y_k = -k(k+1)/360 < -10 lần đầu ở k=60 -> tick 81: player_hit by fall {flames 2, dropped 0, lost 4}; chờ 60 tick (không nhặt, bị đóng băng); tick 141 hồi sinh tại (0,0,0) bất tử 90 tick (còn ở tick 230, hết ở tick 231)",
    seed: 1, ticks: 235, snapshot_every: 1,
    expect: {
      events: [{ tick: FALL_TICK, name: "player_hit", data: { by: "fall", flames: 2, dropped: 0, lost: 4 } }], event_counts: { player_hit: 1 },
      snapshots: {
        20: { player: { pos: [40, 0, 0], grounded: true } }, 21: { player: { pos: [40.1, 0, 0], grounded: false } },
        22: { player: { pos: [40.2, r3(-fallDrop(1)), 0] } },
        80: { player: { pos: [r3(38 + 8), r3(-fallDrop(59)), 0], flames: 3, carried: 4 } },
        81: { player: { pos: [r3(38 + 8.1), r3(-fallDrop(60)), 0], flames: 2, carried: 0, vel: [0, 0, 0] } },
        140: { player: { flames: 2, invuln: false } },
        141: { player: { pos: [0, 0, 0], grounded: true, invuln: true, vel: [0, 0, 0] } },
        150: { player: { pos: [0.9, 0, 0], invuln: true } },
        230: { player: { invuln: true } },
        231: { player: { invuln: false } },
      },
    },
  },
});
add("fall_last_flame_lose", {
  scenario: withBase({ player: { pos: [38, 0, 0], flames: 1 } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] },
  expect: { requirement: "C3", description: "Rơi khi chỉ còn 1 lửa: thua ngay no_flames ở tick 81, không hồi sinh", seed: 1, ticks: 150,
    expect: { events: [{ tick: FALL_TICK, name: "player_hit", data: { by: "fall", flames: 0, dropped: 0, lost: 0 } }, { tick: FALL_TICK, name: "game_over", data: { result: "lost", reason: "no_flames" } }], end: { ticks: FALL_TICK, state: "lost", score: 0 } } },
});
add("bridge_no_rails_fall", {
  night: 2, scenario: withBase({ player: { pos: [35, 0, 0] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] },
  expect: { requirement: "C4", description: "Đêm 2: cầu tre rộng |z| ≤ 2, không lan can: đi +Z từ giữa cầu, z=2.0 ở tick 20 còn đứng được, tick 21 ra khỏi cầu -> rơi, player_hit by fall ở tick 81", seed: 1, ticks: 100, snapshot_every: 1,
    expect: { events: [{ tick: FALL_TICK, name: "player_hit", data: { by: "fall", flames: 2, dropped: 0, lost: 0 } }], snapshots: { 20: { player: { pos: [35, 0, 2], grounded: true } }, 21: { player: { grounded: false } } } } },
});

// ======================= Lướt =======================
add("dash_cooldown", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, dash: true }, { tick: 11, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 100, dash: true }, { tick: 101, dash: false }] },
  expect: {
    requirement: "C6/Lướt", description: "Lướt 14 m/s × 12 tick (0.2333 m/tick, giữ độ cao), hồi chiêu 90 tick từ lúc bắt đầu: bấm ở tick 11 -> dash; z = 1.0 + 0.2333·t; tick 22 z=3.8 cd 79 tick (1.317 s); bấm ở tick 31 (còn hồi chiêu) bị bỏ; hết hồi chiêu đúng tick 101 -> dash thứ hai",
    seed: 1, ticks: 120, snapshot_every: 1,
    expect: { events: [{ tick: 11, name: "dash", data: {} }, { tick: 101, name: "dash", data: {} }], event_counts: { dash: 2 },
      snapshots: {
        10: { player: { pos: [0, 0, 1], vel: [0, 0, 6] } },
        11: { player: { pos: [0, 0, r3(1 + 14 / 60)], vel: [0, 0, 14], dash_cd_s: 1.5 } },
        22: { player: { pos: [0, 0, r3(1 + 12 * 14 / 60)], vel: [0, 0, 14], dash_cd_s: r3(79 / 60) } },
        23: { player: { pos: [0, 0, r3(1 + 12 * 14 / 60 + 0.1)], vel: [0, 0, 6] } },
        100: { player: { pos: [0, 0, 11.6], dash_cd_s: 0.017 } },
        101: { player: { dash_cd_s: 1.5, vel: [0, 0, 14] } },
        112: { player: { pos: [0, 0, r3(11.6 + 12 * 14 / 60)] } },
      } },
  },
});
add("dash_air_altitude", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, jump: true }, { tick: 10, dash: true }, { tick: 11, dash: false }] },
  expect: {
    requirement: "Lướt", description: "Lướt trên không giữ nguyên độ cao: nhảy tick 1; tick 10 y = 0.861; lướt tick 11..22 y đứng yên 0.861 (hướng mặt +Z, đi 2.8 m); sau lướt rơi từ nghỉ: y_k = 0.861 - k(k+1)/360, chạm đất ở k=18 -> tick 40",
    seed: 1, ticks: 45, snapshot_every: 1,
    expect: { snapshots: {
      10: { player: { pos: [0, r3(jumpY(7, 10)), 0], grounded: false } },
      11: { player: { pos: [0, r3(jumpY(7, 10)), r3(14 / 60)], vel: [0, 0, 14] } },
      22: { player: { pos: [0, r3(jumpY(7, 10)), r3(12 * 14 / 60)], grounded: false } },
      39: { player: { pos: [0, r3(jumpY(7, 10) - fallDrop(17)), 2.8], grounded: false } },
      40: { player: { pos: [0, 0, 2.8], grounded: true } },
    } },
  },
});

// ======================= Bùa Gió =======================
add("charm_pickup_speed", {
  scenario: withBase({ charms: [{ id: "C1", pos: [0, 0, 3] }] }), inputs: { frames: [{ tick: 0, move: [0, 1] }] },
  expect: {
    requirement: "Bùa Gió", description: "Nhặt bùa ở XZ ≤ 1.0 (z=2.0 ở tick 20): charm_picked {C1, 600}; bùa biến mất, hồi sau 2700 tick (45 s); từ tick 21 chạy 7.2 m/s (z = 2.0 + 0.12·t); charm_s đếm ngược từ 10 s",
    seed: 1, ticks: 40, snapshot_every: 1,
    expect: { events: [{ tick: 20, name: "charm_picked", data: { charm_id: "C1", charm_ticks: 600 } }], event_counts: { charm_picked: 1 },
      snapshots: {
        19: { player: { charm_s: 0 }, charms: [{ id: "C1", available: true }] },
        20: { player: { pos: [0, 0, 2], charm_s: 10, vel: [0, 0, 6] }, charms: [{ id: "C1", available: false, respawn_s: 45 }] },
        21: { player: { pos: [0, 0, 2.12], vel: [0, 0, 7.2], charm_s: r3(599 / 60) }, charms: [{ respawn_s: r3(2699 / 60) }] },
        30: { player: { pos: [0, 0, 3.2], charm_s: r3(590 / 60) }, charms: [{ respawn_s: r3(2690 / 60) }] },
      } },
  },
});
add("charm_expiry", {
  scenario: withBase({ player: { charm_ticks: 5 } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] },
  expect: { requirement: "Bùa Gió", description: "Còn 5 tick bùa: tick 1..4 chạy 7.2 m/s (0.12 m/tick, z=0.48 ở tick 4), tick 5 bùa hết (charm_s 0) quay về 6.0 m/s", seed: 1, ticks: 10, snapshot_every: 1,
    expect: { snapshots: { 4: { player: { pos: [0, 0, 0.48], vel: [0, 0, 7.2], charm_s: r3(1 / 60) } }, 5: { player: { pos: [0, 0, 0.58], vel: [0, 0, 6], charm_s: 0 } } } } },
});
add("charm_dash_no_cooldown", {
  scenario: withBase({ player: { charm_ticks: 600 } }), inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 14, dash: true }, { tick: 15, dash: false }] },
  expect: { requirement: "Bùa Gió", description: "Còn bùa: lướt không hồi chiêu (dash_cd_s luôn 0). Lướt tick 1..12 (z=2.8); bấm lúc đang lướt (tick 6) bị bỏ; bấm tick 15 lướt ngay lần hai (không chờ hồi chiêu) -> z = 5.6 ở tick 26", seed: 1, ticks: 30, snapshot_every: 1,
    expect: { events: [{ tick: 1, name: "dash", data: {} }, { tick: 15, name: "dash", data: {} }], event_counts: { dash: 2 }, snapshots: { 12: { player: { pos: [0, 0, 2.8], dash_cd_s: 0 } }, 26: { player: { pos: [0, 0, 5.6], dash_cd_s: 0 } } } } },
});
add("charm_respawn", {
  scenario: withBase({ charms: [{ id: "C1", pos: [10, 0, 0], available: false, respawn_ticks: 10 }] }),
  expect: { requirement: "Bùa Gió", description: "Bùa đang hồi (còn 10 tick) xuất hiện lại đúng tick 10", seed: 1, ticks: 15, snapshot_every: 1,
    expect: { snapshots: { 9: { charms: [{ id: "C1", available: false, respawn_s: r3(1 / 60) }] }, 10: { charms: [{ id: "C1", available: true, respawn_s: 0 }] } } } },
});

// ======================= Gió Lạc =======================
add("drifter_steal", {
  night: 2, scenario: withBase({ player: { carried: 6 }, drifters: [{ id: "D1", pos: [10, 0, 0], state: "idle" }] }),
  expect: {
    requirement: "Gió Lạc", description: "Mang 6 ≥ 5 và cách 10 m ≤ 15: idle -> chase (7 m/s, x = 10 - 0.1167 t); chạm ≤ 1.2 m lần đầu ở t=76 (x=1.133) -> drifter_steal {amount 3, carried 3}, flee 240 tick rồi biến mất (tick 316)",
    seed: 1, ticks: 330, snapshot_every: 10,
    expect: { events: [{ tick: 76, name: "drifter_steal", data: { drifter_id: "D1", amount: 3, carried: 3 } }], event_counts: { drifter_steal: 1 }, absent_events: ["player_hit"],
      snapshots: { 70: { player: { carried: 6 }, drifters: [{ id: "D1", state: "chase", stolen: 0 }] }, 80: { player: { carried: 3 }, drifters: [{ id: "D1", state: "flee", stolen: 3 }] }, 310: { drifters: [{ id: "D1", state: "flee", stolen: 3 }] }, 320: { drifters: [] } } },
  },
});
add("drifter_pulse_chase", {
  night: 2, scenario: withBase({ player: { carried: 6 }, drifters: [{ id: "D1", pos: [4, 0, 0], state: "chase" }] }), inputs: { frames: [{ tick: 0, pulse: true }] },
  expect: { requirement: "Gió Lạc", description: "Tỏa sáng trúng Gió Lạc đang chase (3D 4.005 ≤ 5) -> flee, KHÔNG cướp (stolen 0); không cộng điểm (chỉ Bóng Mực được +5)", seed: 1, ticks: 5, snapshot_every: 1,
    expect: { events: [{ tick: 1, name: "pulse", data: { stunned_ids: [] } }], absent_events: ["drifter_steal", "drifter_drop"], snapshots: { 1: { score: 0, player: { carried: 3 }, drifters: [{ id: "D1", state: "flee", stolen: 0 }] } } } },
});
add("drifter_pulse_drop", {
  night: 2, scenario: withBase({ player: { carried: 3 }, drifters: [{ id: "D1", pos: [3, 0, 0], state: "flee", stolen: 3, state_ticks_left: 200 }] }), inputs: { frames: [{ tick: 0, pulse: true }] },
  expect: {
    requirement: "Gió Lạc", description: "Tỏa sáng trúng Gió Lạc đang flee có đồ: thả lại 3 đom đóm tại chỗ (kind dropped, TTL 480 tick: ở tick 10 còn 471 = 7.85 s, hết ở tick 481), Gió Lạc biến mất sau tối đa 120 tick (tick 120)",
    seed: 1, ticks: 500, snapshot_every: 10,
    expect: { events: [{ tick: 1, name: "pulse", data: { stunned_ids: [] } }, { tick: 1, name: "drifter_drop", data: { drifter_id: "D1", amount: 3 } }], event_counts: { drifter_drop: 1 },
      snapshots: {
        10: { motes_active: 3, motes: [{ id: "M1", pos: [3, 0, 0], kind: "dropped", ttl_s: 7.85 }, { id: "M2", kind: "dropped" }, { id: "M3", kind: "dropped" }], drifters: [{ id: "D1", state: "flee", stolen: 0 }], player: { carried: 0 } },
        110: { drifters: [{ id: "D1", state: "flee", stolen: 0 }] }, 120: { drifters: [] },
        480: { motes_active: 3, motes: [{ ttl_s: r3(1 / 60) }, { ttl_s: r3(1 / 60) }, { ttl_s: r3(1 / 60) }] }, 490: { motes_active: 0, motes: [] },
      } },
  },
});
add("drifter_spawn_schedule", {
  night: 2, scenario: { random_motes: false, random_shades: false, wind_enabled: false, motes: [], shades: [], charms: [] },
  expect: { requirement: "Gió Lạc", description: "Gió Lạc sinh ở tick 1200 (D1) và 2400 (D2), tối đa 2 con: tick 3600 không sinh thêm. Người chơi không mang đom đóm nên chúng luôn idle", seed: 3, ticks: 3700, snapshot_every: 100,
    expect: { snapshots: { 1100: { drifters: [] }, 1200: { drifters: [{ id: "D1", state: "idle", stolen: 0 }] }, 2300: { drifters: [{ id: "D1" }] }, 2400: { drifters: [{ id: "D1" }, { id: "D2", state: "idle" }] }, 3600: { drifters: [{ id: "D1" }, { id: "D2" }] } } } },
});

// ======================= Lịch sinh Bóng Mực =======================
const spawnEvents = (ticks) => ticks.map((t, i) => ({ tick: t, name: "shade_spawned", data: { id: `S${i + 1}` } }));
add("shade_spawn_schedule_n1", {
  scenario: { random_motes: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [], player: { flames: 1000 } },
  expect: { requirement: "C5", description: "Đêm 1: 2 con ở tick 300 rồi 1 con mỗi 8 s (480 tick): 780, 1260, 1740, 2220; tối đa 6 nên tick 2700 không sinh thêm", seed: 5, ticks: 3000,
    expect: { events: spawnEvents([300, 300, 780, 1260, 1740, 2220]), event_counts: { shade_spawned: 6 }, end: { ticks: 3000, state: "playing" } } },
});
add("shade_spawn_schedule_n3", {
  night: 3, scenario: { random_motes: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [], player: { flames: 1000 } },
  expect: { requirement: "C5", description: "Đêm 3: 2 con ở tick 300 rồi 1 con mỗi 6 s (360 tick) đến 10 con (tick 3180); tick 3540 không sinh thêm", seed: 5, ticks: 3600,
    expect: { events: spawnEvents([300, 300, 660, 1020, 1380, 1740, 2100, 2460, 2820, 3180]), event_counts: { shade_spawned: 10 } } },
});

// ======================= Bản đồ, bục nhảy, địa hình =======================
add("night2_defaults", {
  night: 2, expect: { requirement: "C4", description: "Đêm 2 mặc định: 330 s, xuất phát (0,0,0), 6 đèn tọa độ chuẩn, 20 đom đóm, bùa C1 sẵn sàng, chưa có Bóng Mực/Gió Lạc", seed: 7, ticks: 20,
    expect: { snapshots: { 0: { night: 2, time_left_s: 330, player: { pos: [0, 0, 0], flames: 3 }, lanterns: lanternsExpect(N2_LANTERNS), motes_active: 20, shades: [], drifters: [], charms: [{ id: "C1", available: true, respawn_s: 0 }] } } } },
});
add("night3_defaults", {
  night: 3, expect: { requirement: "C4", description: "Đêm 3 mặc định: 360 s, xuất phát (0,0,-20), 7 đèn tọa độ chuẩn (y=6, 3, 3, 0...), 20 đom đóm, hai bùa C1 C2, gió chưa thổi", seed: 7, ticks: 20,
    expect: { snapshots: { 0: { night: 3, time_left_s: 360, player: { pos: [0, 0, -20], grounded: true }, lanterns: lanternsExpect(N3_LANTERNS), motes_active: 20, charms: [{ id: "C1", available: true }, { id: "C2", available: true }], wind: { active: false, dir_deg: 0 } } } } },
});
{
  const L = Math.hypot(50, -18);
  const hv = [(24 * 50) / L, (24 * -18) / L];
  const start = [20, 17.3]; // đứng ở (20,17.2) rồi đi 0.1 m ở tick 1 (đã trong bán kính 1.0 m của bục (20,18))
  const at = (k) => [start[0] + (k / 60) * hv[0], start[1] + (k / 60) * hv[1]];
  const k83 = at(83);
  add("jump_pad_night2", {
    night: 2, scenario: withBase({ player: { pos: [20, 0, 17.2] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    expect: {
      requirement: "C4/Bục nhảy", description: "Đêm 2: chân Mây chạm bục (20,0,18) ở tick 1 -> bắn lên vy 14 và 24 m/s về tâm đảo B (70,0,0). Bay k tick: y = (14k - k(k+1)/6)/60 (đúng 0 ở k=83), ngang = (24·(50,-18)/53.14)/60 mỗi tick; phím đi không ghi đè; chạm đất ở tick 84 trên đảo B",
      seed: 1, ticks: 90, snapshot_every: 1,
      expect: { snapshots: {
        1: { player: { grounded: false, vel: [r3(hv[0]), 14, r3(hv[1])] } },
        40: { player: { pos: [r3(at(39)[0]), r3(jumpY(14, 39)), r3(at(39)[1])], vel: [r3(hv[0]), r3(14 - 39 / 3), r3(hv[1])], grounded: false } },
        83: { player: { grounded: false } },
        84: { player: { pos: [r3(k83[0]), 0, r3(k83[1])], grounded: true } },
      } },
    },
  });
}
{
  const at = (k) => [0, 12.5 - (8 * k) / 60];
  const yAt = (k) => 3 + jumpY(12, k);
  add("jump_pad_night3", {
    night: 3, scenario: withBase({ player: { pos: [0, 3, 12.5] } }),
    expect: {
      requirement: "C4/Bục nhảy", description: "Đêm 3: đứng trên tầng 1 (y=3) trong bán kính 1.0 m của bục (0,3,13) -> bắn vy 12 và 8 m/s hướng -Z. y = 3 + (12k - k(k+1)/6)/60, z = 12.5 - 8k/60; hạ cánh lên tầng 2 (y=6) ở k=49 (tick 50) tại z=5.967",
      seed: 1, ticks: 60, snapshot_every: 1,
      expect: { snapshots: {
        1: { player: { grounded: false } },
        20: { player: { pos: [0, r3(yAt(19)), r3(at(19)[1])], vel: [0, r3(12 - 19 / 3), -8], grounded: false } },
        49: { player: { grounded: false } },
        50: { player: { pos: [0, 6, r3(at(49)[1])], grounded: true } },
      } },
    },
  });
}
{
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const dir = [-c, -s];
  const start = [25.981, 15.0];
  const pos = (n) => [start[0] + 0.1 * n * dir[0], start[1] + 0.1 * n * dir[1]];
  add("ramp_climb", {
    night: 3, scenario: withBase({ player: { pos: [25.981, 0, 15.0] } }), inputs: { frames: [{ tick: 0, move: [dir[0], dir[1]] }] },
    expect: { requirement: "C4", description: "Đêm 3: dốc 30° dài 6 m từ chân (r=30, Y=0) lên đỉnh (r=24, Y=3), độ cao tuyến tính 0.5 m mỗi mét. Đi dọc trục dốc 6 m/s: tick 30 y=1.5, tick 60 y=3.0 (lên tầng 1)", seed: 1, ticks: 60, snapshot_every: 30,
      expect: { snapshots: { 30: { player: { pos: [r3(pos(30)[0]), 1.5, r3(pos(30)[1])], grounded: true } }, 60: { player: { pos: [r3(pos(60)[0]), 3, r3(pos(60)[1])], grounded: true } } } } },
  });
}
add("cliff_blocks", {
  night: 3, scenario: withBase({ player: { pos: [0, 0, -9] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] },
  expect: { requirement: "C4", description: "Đêm 3: vách tầng 2 (r ≤ 8) là vách đứng, không đi lên được: đi +Z từ z=-9 dừng ở z=-8.1 (bước kế tiếp r=8.0 đã thuộc tầng 2)", seed: 1, ticks: 30, snapshot_every: 10,
    expect: { snapshots: { 10: { player: { pos: [0, 0, -8.1], grounded: true } }, 30: { player: { pos: [0, 0, -8.1], grounded: true } } } } },
});
add("step_off_tier", {
  night: 3, scenario: withBase({ player: { pos: [12.55, 3, 0.5] } }), inputs: { frames: [{ tick: 0, move: [-1, 0] }] },
  expect: {
    requirement: "C4", description: "Đêm 3: bước ra khỏi mép tầng 1 (r < 12) thì rơi xuống tầng 0 (không phạt): đi -X từ x=12.55, x=11.95 ở tick 6 ra khỏi mép; rơi y_k = 3 - k(k+1)/360 chạm đất ở k=33 -> tick 39",
    seed: 1, ticks: 45, snapshot_every: 1,
    expect: { absent_events: ["player_hit"], snapshots: { 5: { player: { pos: [12.05, 3, 0.5], grounded: true } }, 6: { player: { pos: [11.95, 3, 0.5], grounded: false } }, 38: { player: { pos: [r3(12.55 - 3.8), r3(3 - fallDrop(32)), 0.5], grounded: false } }, 39: { player: { pos: [r3(12.55 - 3.9), 0, 0.5], grounded: true } } } },
  },
});
add("tower_blocks", {
  night: 3, scenario: withBase({ player: { pos: [0, 6, 6] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }] },
  expect: { requirement: "C4", description: "Đêm 3: tháp chuông (trụ r=2 ở tâm tầng 2) không đi xuyên được: đi -Z từ z=6 dừng ở z=2.1", seed: 1, ticks: 60, snapshot_every: 30,
    expect: { snapshots: { 30: { player: { pos: [0, 6, 3], grounded: true } }, 60: { player: { pos: [0, 6, 2.1], grounded: true } } } } },
});
add("wind_gust", {
  night: 3, scenario: withBase({ wind_enabled: true }),
  expect: { requirement: "C6/Gió mạnh", description: "Đêm 3: cơn gió thổi tick 1800..2099 (5 s), dir_deg nguyên [0,360), đẩy người chơi đứng yên đúng 2 m/s × 5 s = 10 m theo dir_deg; trước 1800 và từ 2100 không gió", seed: 4, ticks: 2200, snapshot_every: 100,
    expect: { snapshots: { 1700: { wind: { active: false, dir_deg: 0 }, player: { pos: [0, 0, -20] } }, 1800: { wind: { active: true } }, 2000: { wind: { active: true } }, 2100: { wind: { active: false, dir_deg: 0 } } }, invariants: ["wind_pushes_2mps"], end: { ticks: 2200, state: "playing" } } },
});

// ======================= Tạm dừng =======================
add("pause_resume", {
  scenario: withBase(), inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 30, pause: true }, { tick: 31, pause: false }] },
  expect: {
    requirement: "C6/Tạm dừng", description: "Tạm dừng: bấm ở tick 11 -> event paused, state paused, tick vẫn tăng nhưng sim_tick/thời gian/vị trí đứng yên (sim 10, z=1.0, 299.833 s); bấm lại ở tick 31 -> resumed và bước đó chạy luôn (sim 11, z=1.1); tick 40: sim 20, z=2.0",
    seed: 1, ticks: 60, snapshot_every: 1,
    expect: {
      events: [{ tick: 1, name: "night_start", data: { night: 1 } }, { tick: 11, name: "paused", data: {} }, { tick: 31, name: "resumed", data: {} }], event_counts: { paused: 1, resumed: 1 },
      snapshots: {
        10: { state: "playing", sim_tick: 10, player: { pos: [0, 0, 1] } },
        11: { state: "paused", tick: 11, sim_tick: 10, player: { pos: [0, 0, 1] } },
        20: { state: "paused", tick: 20, sim_tick: 10, time_left_s: r3(300 - 10 / 60), player: { pos: [0, 0, 1] } },
        30: { state: "paused", sim_tick: 10 },
        31: { state: "playing", sim_tick: 11, player: { pos: [0, 0, 1.1] } },
        40: { state: "playing", sim_tick: 20, time_left_s: r3(300 - 20 / 60), player: { pos: [0, 0, 2] } },
        60: { sim_tick: 40, player: { pos: [0, 0, 4] } },
      },
      end: { ticks: 60, state: "playing" },
    },
  },
});

// ======================= Lộ trình chơi được (kiểm bằng kết quả, không tính từng tick) =======================
{
  // Đêm 3: lên dốc 30° -> đi trên tầng 1 -> bục nhảy (0,3,13) -> hạ cánh tầng 2 -> thắp L1 (0,6,6): đèn khó tới nhất
  const unit = (x, z) => {
    const l = Math.hypot(x, z);
    return [r3(x / l), r3(z / l)];
  };
  const c = Math.cos(Math.PI / 6);
  const sn = Math.sin(Math.PI / 6);
  const A = unit(34.64, 22); // (0,-20) -> (34.64, 2): đi vòng ngoài tầng 1 (r > 24)
  const D = unit(15.59 - 0, 9 - 13); // tầng 1 (15.59, 9) -> bục (0, 13)
  const frames = [
    { tick: 0, move: A },
    { tick: 410, move: [0, 1] }, // dọc x=34.64 lên z=20 (trục dốc 30° ở r=40)
    { tick: 590, move: [r3(-c), r3(-sn)] }, // dọc trục dốc: chân dốc r=30, đỉnh r=24, vào tầng 1 tới r=18
    { tick: 810, move: [-D[0], -D[1]] }, // về phía bục nhảy
    { tick: 1020, move: [0, 0] },
  ];
  for (let t = 1025; t <= 1105; t += 10) frames.push({ tick: t, interact: true }, { tick: t + 5, interact: false });
  add("night3_route_to_L1", {
    night: 3, scenario: withBase({ player: { carried: 10 } }), inputs: { frames },
    expect: {
      requirement: "C4/Chơi được", description: "Đêm 3: đèn L1 ở tầng 2 chỉ tới được bằng: đi vòng ngoài tầng 0 -> leo dốc 30° (r 30 -> 24) -> đi trên tầng 1 -> bục nhảy (0,3,13) -> hạ cánh tầng 2 -> nạp 10 đom đóm. Kiểm kết quả: L1 sáng, điểm 10·10 + 100 = 200, Mây đứng trên tầng 2 (y=6), không bị rơi/chạm",
      seed: 1, ticks: 1150, snapshot_every: 10,
      expect: { absent_events: ["player_hit"], events: [{ name: "deposit", data: { lantern_id: "L1", amount: 10, deposited: 10 } }, { name: "lantern_lit", data: { lantern_id: "L1" } }], event_counts: { lantern_lit: 1 },
        snapshots: { 1150: { score: 200, player: { carried: 0, grounded: true, flames: 3, } } }, invariants: ["player_on_tier2_at_end"] },
    },
  });
}
{
  // Đêm 2: đi bộ qua cầu tre (x 26..44, không lan can) từ đảo A sang đảo B rồi thắp L4 (70,0,20)
  add("night2_route_cross_bridge", {
    night: 2, scenario: withBase({ player: { carried: 10 } }),
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 700, move: [0, 1] }, { tick: 890, move: [0, 0] }, ...[900, 910, 920, 930].flatMap((t) => [{ tick: t, interact: true }, { tick: t + 5, interact: false }])] },
    expect: {
      requirement: "C4/Chơi được", description: "Đêm 2: đi thẳng +X từ (0,0,0) qua cầu tre sang đảo B (x=70 ở tick 700, không rơi vì |z| = 0), rồi +Z tới (70,0,19) (tick 890) và thắp L4 (70,0,20). Kiểm: không rơi, L4 sáng, điểm 200",
      seed: 1, ticks: 1000, snapshot_every: 10,
      expect: { absent_events: ["player_hit"], events: [{ name: "lantern_lit", data: { lantern_id: "L4" } }], snapshots: { 700: { player: { pos: [70, 0, 0], grounded: true } }, 1000: { score: 200, lanterns: [{ lit: false }, { lit: false }, { lit: false }, { id: "L4", lit: true }, { lit: false }, { lit: false }] } } },
    },
  });
}

// ======================= Định dạng sai =======================
add("bad_inputs_tick_order", { scenario: withBase(), inputs: { frames: [{ tick: 5, move: [0, 1] }, { tick: 5, move: [0, 0] }] }, expect: { requirement: "R2", description: "inputs có tick không tăng nghiêm ngặt -> exit 2 + stderr", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_inputs_move_range", { inputs: { frames: [{ tick: 0, move: [2, 0] }] }, expect: { requirement: "R2", description: "move ngoài [-1,1] -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_inputs_pause_type", { inputs: { frames: [{ tick: 0, pause: "yes" }] }, expect: { requirement: "R2/C7", description: "pause không phải boolean -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_scenario_lantern_id", { scenario: { lanterns: [{ id: "L9", lit: true }] }, expect: { requirement: "R2", description: "scenario tham chiếu đèn không tồn tại L9 -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_scenario_lantern_wrong_night", { night: 1, scenario: { lanterns: [{ id: "L6", lit: true }] }, expect: { requirement: "R2/C7", description: "L6 chỉ có từ Đêm 2: ở Đêm 1 -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_scenario_shade_state", { scenario: { shades: [{ pos: [1, 0, 0], state: "dead" }] }, expect: { requirement: "R2/C7", description: "state Bóng Mực ngoài {spawning,wander,chase,recoil,stunned} -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_scenario_json", { raw: { "scenario.json": '{ "player": { "pos": [0, 0, 0] ' }, expect: { requirement: "R2", description: "scenario.json không phải JSON hợp lệ -> exit 2", seed: 1, ticks: 10, exit_code: 2 } });
add("bad_night_argument", { expect: { requirement: "C7", description: "--night 4 không hợp lệ -> exit 1 (lỗi tham số) + stderr", night: 4, seed: 1, ticks: 10, exit_code: 1 } });

for (const [name, s] of Object.entries(S)) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const spec = { ...s.expect };
  if (s.night !== undefined && spec.night === undefined) spec.night = s.night;
  const files = { scenario: s.scenario, inputs: s.inputs, expect: spec };
  for (const [f, v] of Object.entries(files)) if (v) fs.writeFileSync(path.join(dir, `${f}.json`), JSON.stringify(v, null, 2) + "\n");
  for (const [f, txt] of Object.entries(s.raw || {})) fs.writeFileSync(path.join(dir, f), txt);
}
console.log(Object.keys(S).length, "scenarios");
