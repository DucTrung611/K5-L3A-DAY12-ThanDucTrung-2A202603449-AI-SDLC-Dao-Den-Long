// Nguồn sự thật DUY NHẤT cho các con số gameplay (Ticket-02: số liệu chuẩn, thay mọi giá trị tự chọn của Phase 1).
// game.contract.json phải khớp TUNING (kiểm tra bởi scripts/check-contract.js + tests/unit/contract.test.js).

export const TICK_RATE = 60;
export const secToTicks = (s) => Math.round(s * TICK_RATE);

export const TUNING = Object.freeze({
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 240,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  night2_duration_s: 270,
  night3_duration_s: 300,
  // --- Ticket-03 (Contract v1.2): nhiên liệu đèn ---
  fuel_max: 100,
  fuel_decay_per_s: 1.0,
  fuel_per_mote: 10,
  relight_cost: 5,
  win_ratio: 0.6,
  drain_per_s: 5,
  low_fuel_threshold: 30,
  capacity_max: 20,
  // Điểm Ticket-03 (thay toàn bộ công thức cũ; không còn thưởng thời gian)
  score: Object.freeze({
    per_mote: 5, // mỗi đom đóm nạp vào đèn (thắp mới, thắp lại, châm dầu)
    per_lantern: 100, // thắp lần đầu
    per_relight: 40, // thắp lại
    per_stun: 5, // Bóng Mực trúng Tỏa Sáng
    per_stun_drain: 15, // tổng nếu ngay trước đó đang `drain`
    per_dawn_lantern: 50, // bình minh (thắng): mỗi đèn sáng +50 + floor(fuel)
    per_flame_left: 50, // bình minh (thắng): mỗi Ngọn Lửa còn lại
  }),
});

// Số chuẩn của ticket không có khóa trong contract (ghi trong README / docs/notes/phase-2.md).
export const RULES = Object.freeze({
  jump_velocity: 7.0,
  gravity: 20.0,
  pickup_height: 1.5, // chênh cao tối đa giữa chân Mây và mặt đất nơi đặt vật phẩm
  fall_y: -10, // Y < -10 là rơi khỏi đảo
  fall_wait_ticks: 60,
  respawn_invuln_ticks: 90,
  step_height: 0.35, // bước lên cao hơn mức này là bị chặn; bước xuống tới mức này thì dính mặt đất
  mote_start: 20,
  mote_cap: 30,
  mote_every_ticks: 240,
  dropped_ttl_ticks: 480,
  drop_ring_min: 1.5,
  drop_ring_max: 2.5,
  safe_expel_ticks: 30,
  shade_center_y: 1.0,
  shade_detect: 12,
  shade_giveup: 18,
  shade_hit_dz: 1.5,
  shade_recoil_m: 2,
  shade_recoil_ticks: 60,
  shade_first_spawn_tick: 300,
  shade_first_spawn_count: 2,
  shade_spawning_ticks: 60,
  shade_wander_speed: 2.0,
  shade_wander_turn_ticks: 180,
  stun_push_ticks: 15,
  pulse_center_y: 0.8,
  shade_speed_night3: 4.5,
  drifter_speed: 7,
  drifter_idle_speed: 2,
  drifter_turn_ticks: 120,
  drifter_max: 2,
  drifter_every_ticks: 1200,
  drifter_detect_carried: 5,
  drifter_detect_dist: 15,
  drifter_touch: 1.2,
  drifter_steal: 3,
  drifter_flee_ticks: 240,
  drifter_drop_vanish_ticks: 120,
  drifter_center_y: 1.0,
  charm_ticks: 600,
  charm_respawn_ticks: 2700,
  charm_speed: 7.2,
  wind_every_ticks: 1800,
  wind_ticks: 300,
  wind_push: 2.0,
  pad_radius: 1.0,
  pad_height_tol: 0.5,
  capacity_step: 2, // Ticket-03: sức chứa = min(capacity_max, carry_capacity + 2 × successful_lights)
  drain_radius: 2, // Bóng Mực cách đèn mục tiêu <= 2 m (XZ) thì chuyển sang drain
  drain_chase_radius: 6, // drain -> chase khi Mây trong 6 m
  drain_event_every_ticks: 60, // fuel_drain chỉ ghi mỗi 60 tick
  eps: 1e-9,
});
