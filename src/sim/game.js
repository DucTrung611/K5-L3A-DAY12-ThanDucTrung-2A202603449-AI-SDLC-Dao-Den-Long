// Lõi mô phỏng Đảo Đèn Lồng – thuần logic, không phụ thuộc render/DOM.
// Dùng chung cho headless (src/headless/cli.js) và client (src/client/main.js).
// Thứ tự xử lý một bước: xem PLAN.md mục 3.4 và docs/notes/phase-1.md.

import { TUNING, WORLD, TICK_RATE, secToTicks } from "./tuning.js";
import { createRng } from "./rng.js";
import { createInputState, consumePresses, worldMoveDir } from "./input.js";
import { LANTERN_IDS } from "./validate.js";

const DT = 1 / TICK_RATE;
const distXZ = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export function defaultLanternPos(i) {
  const a = (i * 2 * Math.PI) / TUNING.lantern_count_night1;
  return [WORLD.lantern_ring_radius * Math.sin(a), 0, WORLD.lantern_ring_radius * Math.cos(a)];
}

/**
 * Tạo game mới. `scenario` (đã validate) có thể undefined.
 * Dựng scenario KHÔNG phát sự kiện và KHÔNG cộng điểm.
 */
export function createGame({ seed = 1, scenario = undefined, tuning = TUNING } = {}) {
  const sc = scenario || {};
  const rng = createRng(seed);
  const g = {
    tuning,
    rng,
    tick: 0, // số bước đã chạy
    state: "playing",
    result: null,
    reason: null,
    score: 0,
    baseTime: sc.time_left_s !== undefined ? sc.time_left_s : tuning.night1_duration_s,
    timeLeft: 0,
    player: {
      pos: [0, 0, 0],
      vy: 0,
      flames: tuning.flames,
      carried: 0,
      invulnTicks: 0,
      pulseCdTicks: 0,
      facing: 0,
    },
    lanterns: LANTERN_IDS.slice(0, tuning.lantern_count_night1).map((id, i) => ({
      id,
      pos: defaultLanternPos(i),
      lit: false,
      deposited: 0,
    })),
    motes: [],
    shades: [],
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    nextMote: 1,
    nextShade: 1,
    input: createInputState(),
    stats: { picked: 0, deposited: 0, stunned: 0, hits: 0, pulses: 0, bonusTime: 0, bonusFlames: 0 },
  };
  g.timeLeft = g.baseTime;

  if (sc.player) {
    if (sc.player.pos) g.player.pos = [...sc.player.pos];
    if (sc.player.carried !== undefined) g.player.carried = sc.player.carried;
    if (sc.player.flames !== undefined) g.player.flames = sc.player.flames;
  }

  if (sc.lanterns) {
    for (const l of sc.lanterns) {
      const L = g.lanterns.find((x) => x.id === l.id);
      if (!L) continue;
      if (l.pos) L.pos = [...l.pos];
      if (l.deposited !== undefined) L.deposited = l.deposited;
      if (l.lit !== undefined) L.lit = l.lit;
    }
  }

  if (sc.motes) {
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m.pos;
      const id = !Array.isArray(m) && m.id ? m.id : newMoteId(g);
      g.motes.push({ id, pos: [...pos] });
    }
  } else if (g.randomMotes) {
    for (let i = 0; i < WORLD.mote_initial; i++) spawnRandomMote(g);
  }

  if (sc.shades) {
    for (const s of sc.shades) {
      const id = s.id || newShadeId(g);
      g.shades.push(makeShade(id, s.pos));
    }
  }
  return g;
}

function newMoteId(g) {
  const used = new Set(g.motes.map((m) => m.id));
  while (used.has("M" + g.nextMote)) g.nextMote++;
  return "M" + g.nextMote++;
}

function newShadeId(g) {
  const used = new Set(g.shades.map((s) => s.id));
  while (used.has("S" + g.nextShade)) g.nextShade++;
  return "S" + g.nextShade++;
}

function makeShade(id, pos) {
  return { id, pos: [...pos], state: "chase", stunTicks: 0, stunnedThisStep: false };
}

function spawnRandomMote(g) {
  // điểm ngẫu nhiên trong đĩa bán kính mote_spawn_radius, tránh vùng tâm
  for (let tries = 0; tries < 20; tries++) {
    const a = g.rng.next() * 2 * Math.PI;
    const r = Math.sqrt(g.rng.next()) * WORLD.mote_spawn_radius;
    if (r < WORLD.mote_clear_center_r) continue;
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    const m = { id: newMoteId(g), pos: [x, 0, z] };
    g.motes.push(m);
    return m;
  }
  return null;
}

function insideLitSafeZone(g, x, z) {
  const R = g.tuning.safe_radius;
  return g.lanterns.some((L) => L.lit && distXZ(x, z, L.pos[0], L.pos[2]) < R);
}

function spawnRandomShade(g) {
  const T = g.tuning;
  const r = WORLD.island_radius - 2;
  for (let tries = 0; tries < 20; tries++) {
    const a = g.rng.next() * 2 * Math.PI;
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    if (distXZ(x, z, g.player.pos[0], g.player.pos[2]) < WORLD.shade_spawn_min_dist) continue;
    if (T.safe_radius !== null && insideLitSafeZone(g, x, z)) continue;
    const s = makeShade(newShadeId(g), [x, WORLD.shade_center_y, z]);
    g.shades.push(s);
    return s;
  }
  return null;
}

function clampToIsland(pos) {
  const r = Math.hypot(pos[0], pos[2]);
  const R = WORLD.island_radius;
  if (r > R) {
    pos[0] *= R / r;
    pos[2] *= R / r;
  }
}

/** Đẩy một điểm ra mép vòng an toàn của mọi đèn đã thắp. */
function pushOutOfSafeZones(g, pos) {
  const R = g.tuning.safe_radius;
  for (const L of g.lanterns) {
    if (!L.lit) continue;
    let dx = pos[0] - L.pos[0];
    let dz = pos[2] - L.pos[2];
    let d = Math.hypot(dx, dz);
    if (d < R) {
      if (d < 1e-9) {
        dx = 1;
        dz = 0;
        d = 1;
      }
      pos[0] = L.pos[0] + (dx / d) * R;
      pos[2] = L.pos[2] + (dz / d) * R;
    }
  }
}

/**
 * Chạy một bước (1/60 s). `frame` là frame input của tick hiện tại (hoặc undefined).
 * Trả về mảng sự kiện {tick, name, data} của bước này (tick = số bước sau khi chạy).
 */
export function stepGame(g, applyInput) {
  if (g.state !== "playing") return [];
  const T = g.tuning;
  const S = T.score;
  const P = g.player;
  const events = [];
  const t = g.tick + 1;
  const emit = (name, data) => events.push({ tick: t, name, data });

  // 1. input
  if (applyInput) applyInput(g.input);
  const pressed = consumePresses(g.input);
  if (P.pulseCdTicks > 0) P.pulseCdTicks--;

  // 2. di chuyển + nhảy
  const [dx, dz] = worldMoveDir(g.input.move, g.input.cam_yaw_deg);
  const step = T.player_speed * DT;
  P.pos[0] += dx * step;
  P.pos[2] += dz * step;
  if (dx !== 0 || dz !== 0) P.facing = Math.atan2(dx, dz);
  clampToIsland(P.pos);
  if (pressed.jump && P.pos[1] <= 0 && P.vy === 0) P.vy = WORLD.jump_velocity;
  if (P.pos[1] > 0 || P.vy !== 0) {
    P.vy -= WORLD.gravity * DT;
    P.pos[1] += P.vy * DT;
    if (P.pos[1] <= 0) {
      P.pos[1] = 0;
      P.vy = 0;
    }
  }

  // 3. nạp ánh sáng vào đèn chưa thắp gần nhất trong interact_radius
  if (pressed.interact && P.carried > 0) {
    let best = null;
    let bestD = Infinity;
    for (const L of g.lanterns) {
      if (L.lit) continue;
      const d = distXZ(P.pos[0], P.pos[2], L.pos[0], L.pos[2]);
      if (d <= T.interact_radius && d < bestD) {
        best = L;
        bestD = d;
      }
    }
    if (best) {
      const amount = Math.min(P.carried, T.lantern_cost - best.deposited);
      if (amount > 0) {
        P.carried -= amount;
        best.deposited += amount;
        g.stats.deposited += amount;
        emit("deposit", { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= T.lantern_cost) {
          best.lit = true;
          g.score += S.per_lantern;
          emit("lantern_lit", { lantern_id: best.id });
        }
      }
    }
  }

  // 4. tỏa sáng (pulse)
  for (const s of g.shades) s.stunnedThisStep = false;
  if (pressed.pulse && P.pulseCdTicks === 0 && P.carried >= T.pulse_cost) {
    P.carried -= T.pulse_cost;
    P.pulseCdTicks = secToTicks(T.pulse_cooldown_s);
    const ids = [];
    for (const s of g.shades) {
      let vx = s.pos[0] - P.pos[0];
      let vz = s.pos[2] - P.pos[2];
      let d = Math.hypot(vx, vz);
      if (d > T.pulse_radius) continue;
      if (d < 1e-9) {
        vx = 1;
        vz = 0;
        d = 1;
      }
      s.pos[0] += (vx / d) * T.pulse_push_m;
      s.pos[2] += (vz / d) * T.pulse_push_m;
      clampToIsland(s.pos);
      pushOutOfSafeZones(g, s.pos);
      s.state = "stunned";
      s.stunTicks = secToTicks(T.pulse_stun_s);
      s.stunnedThisStep = true;
      ids.push(s.id);
    }
    g.score += ids.length * S.per_stun;
    g.stats.stunned += ids.length;
    g.stats.pulses++;
    emit("pulse", { stunned_ids: ids });
  }

  // 5. nhặt đom đóm (theo thứ tự danh sách)
  for (let i = 0; i < g.motes.length; ) {
    const m = g.motes[i];
    if (P.carried < T.carry_capacity && distXZ(P.pos[0], P.pos[2], m.pos[0], m.pos[2]) <= T.pickup_radius) {
      g.motes.splice(i, 1);
      P.carried++;
      g.score += S.per_mote;
      g.stats.picked++;
      emit("mote_picked", { carried: P.carried });
    } else i++;
  }

  // 6. Bóng Mực: hết choáng -> đuổi; di chuyển; không vào vùng an toàn quanh đèn đã thắp
  const shadeStep = T.shade_speed * DT;
  for (const s of g.shades) {
    if (s.state === "stunned") {
      if (!s.stunnedThisStep) {
        s.stunTicks--;
        if (s.stunTicks <= 0) {
          s.stunTicks = 0;
          s.state = "chase";
        }
      }
      continue;
    }
    const vx = P.pos[0] - s.pos[0];
    const vz = P.pos[2] - s.pos[2];
    const d = Math.hypot(vx, vz);
    if (d > 1e-9) {
      const k = Math.min(shadeStep, d) / d;
      s.pos[0] += vx * k;
      s.pos[2] += vz * k;
    }
    clampToIsland(s.pos);
    pushOutOfSafeZones(g, s.pos);
  }

  // 7. va chạm Bóng Mực -> mất một Ngọn Lửa (tối đa 1 lần / bước), rơi đom đóm, bất tử ngắn
  if (P.invulnTicks > 0) {
    P.invulnTicks--;
  } else {
    const hit = g.shades.some(
      (s) => s.state !== "stunned" && distXZ(P.pos[0], P.pos[2], s.pos[0], s.pos[2]) <= T.shade_hit_radius,
    );
    if (hit) {
      P.flames = Math.max(0, P.flames - 1);
      const dropped = Math.floor(P.carried * T.hit_drop_ratio);
      P.carried -= dropped;
      P.invulnTicks = secToTicks(T.invuln_s);
      g.stats.hits++;
      emit("player_hit", { by: "shade", flames: P.flames, dropped });
    }
  }

  // 8. sinh ngẫu nhiên (tất định theo seed)
  if (g.randomShades) {
    const first = secToTicks(WORLD.shade_first_spawn_s);
    const every = secToTicks(WORLD.shade_spawn_every_s);
    if (t >= first && (t - first) % every === 0 && g.shades.length < WORLD.shade_max) {
      const s = spawnRandomShade(g);
      if (s) emit("shade_spawned", { id: s.id });
    }
  }
  if (g.randomMotes && t % secToTicks(WORLD.mote_respawn_every_s) === 0 && g.motes.length < WORLD.mote_min_active) {
    spawnRandomMote(g);
  }

  // 9. thời gian
  g.tick = t;
  g.timeLeft = g.baseTime - t / TICK_RATE;

  // 10. kết thúc: all_lit -> no_flames -> dawn
  if (g.lanterns.every((L) => L.lit)) {
    g.stats.bonusTime = Math.floor(Math.max(0, g.timeLeft)) * S.per_second_left;
    g.stats.bonusFlames = P.flames * S.per_flame_left;
    g.score += g.stats.bonusTime + g.stats.bonusFlames;
    finish(g, "won", "all_lit", emit);
  } else if (P.flames <= 0) {
    finish(g, "lost", "no_flames", emit);
  } else if (g.timeLeft <= 1e-9) {
    finish(g, "lost", "dawn", emit);
  }
  return events;
}

function finish(g, result, reason, emit) {
  g.state = result;
  g.result = result;
  g.reason = reason;
  emit("game_over", { result, reason });
}

/** Snapshot theo Test Contract v1.0 mục E (chưa làm tròn – xem output.js). */
export function snapshotOf(g) {
  return {
    type: "snapshot",
    tick: g.tick,
    sim_tick: g.tick,
    state: g.state,
    time_left_s: g.timeLeft,
    score: g.score,
    player: { pos: g.player.pos, flames: g.player.flames, carried: g.player.carried },
    lanterns: g.lanterns.map((L) => ({ id: L.id, pos: L.pos, lit: L.lit, deposited: L.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: s.pos, state: s.state })),
    motes_active: g.motes.length,
    motes: g.motes.map((m) => ({ id: m.id, pos: m.pos })),
  };
}
