// Nguồn sự thật DUY NHẤT cho các con số gameplay.
// game.contract.json phải khớp TUNING (kiểm tra bởi scripts/check-contract.js + tests/unit/contract.test.js).

export const TICK_RATE = 60;

export const TUNING = Object.freeze({
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 5,
  lantern_count_night1: 5,
  pickup_radius: 1.5,
  interact_radius: 3.0,
  pulse_cost: 2,
  pulse_radius: 6.0,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.5,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 1.0,
  safe_radius: 8.0,
  shade_speed: 3.5,
  shade_hit_radius: 1.0,
  fall_enabled: false,
  score: Object.freeze({
    per_mote: 10,
    per_lantern: 100,
    per_stun: 20,
    per_second_left: 2,
    per_flame_left: 50,
  }),
});

// Các số nội bộ không có khóa trong contract (ghi trong README / docs/notes/phase-1.md).
export const WORLD = Object.freeze({
  island_radius: 40, // biên đảo (m); người chơi và Bóng Mực bị kẹp trong biên này
  lantern_ring_radius: 25, // L1 ở (0,0,25), các đèn cách nhau 72°
  jump_velocity: 6, // m/s
  gravity: 20, // m/s^2
  shade_center_y: 1.0, // tâm Bóng Mực tự sinh lơ lửng 1 m
  shade_first_spawn_s: 10,
  shade_spawn_every_s: 15,
  shade_max: 6,
  shade_spawn_min_dist: 15,
  mote_initial: 30,
  mote_min_active: 20,
  mote_respawn_every_s: 3,
  mote_spawn_radius: 36,
  mote_clear_center_r: 3,
});

export const secToTicks = (s) => Math.round(s * TICK_RATE);
