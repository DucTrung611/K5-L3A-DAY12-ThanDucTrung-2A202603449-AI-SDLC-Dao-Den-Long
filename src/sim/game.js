// Lõi mô phỏng Đảo Đèn Lồng (Ticket-02, Contract v1.1) – thuần logic, không phụ thuộc render/DOM.
// Dùng chung cho headless (src/headless/cli.js) và client (src/client/main.js).
//
// Thứ tự xử lý MỘT tick (bắt buộc theo ticket):
//  1 input (pause trước)  2 giảm bộ đếm  3 di chuyển Mây + kiểm tra rơi  4 nhặt đom đóm/bùa
//  5 tương tác đèn  6 vùng an toàn  7 tỏa sáng  8 di chuyển Bóng Mực + Gió Lạc
//  9 chạm (Gió Lạc cướp trước, rồi Bóng Mực theo id)  10 sinh theo lịch  11 thắng/thua  12 snapshot (ở run.js)

import { TUNING, RULES as R, TICK_RATE, secToTicks } from "./tuning.js";
import { createRng } from "./rng.js";
import { createInputState, consumePresses, worldMoveDir } from "./input.js";
import { MAPS } from "./maps.js";

const DT = 1 / TICK_RATE;
const EPS = R.eps;
const rad = (d) => (d * Math.PI) / 180;
const dXZ = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const isGround = (h) => Number.isFinite(h);

function splitId(id) {
  const m = /^(\D*)(\d+)$/.exec(id);
  return m ? [m[1], Number(m[2])] : [id, 0];
}
/** So sánh id tự nhiên: S2 < S10. */
export function compareIds(a, b) {
  const [pa, na] = splitId(a);
  const [pb, nb] = splitId(b);
  if (pa !== pb) return pa < pb ? -1 : 1;
  return na - nb;
}

const heightAt = (g, x, z) => g.map.height(x, z);

/**
 * Tạo game mới cho một đêm. `scenario` (đã validate) có thể undefined.
 * Dựng scenario KHÔNG phát sự kiện và KHÔNG cộng điểm.
 */
export function createGame({ seed = 1, night = 1, scenario = undefined, tuning = TUNING } = {}) {
  const map = MAPS[night];
  if (!map) throw new Error(`night không hợp lệ: ${night}`);
  const sc = scenario || {};
  const g = {
    tuning,
    night,
    map,
    rng: createRng(seed),
    tick: 0, // số bước đã yêu cầu (kể cả lúc tạm dừng)
    simTick: 0, // số bước gameplay đã chạy
    state: "playing",
    result: null,
    reason: null,
    score: 0,
    baseTime: sc.time_left_s !== undefined ? sc.time_left_s : map.duration_s,
    timeLeft: 0,
    started: false,
    player: {
      pos: [...map.start],
      vel: [0, 0, 0],
      grounded: true,
      flames: tuning.flames,
      carried: 0,
      invuln: 0,
      dashCd: 0,
      pulseCd: 0,
      charm: 0,
      dashLeft: 0,
      dashDir: [0, 1],
      facing: [0, 1],
      launch: null,
      fallWait: 0,
    },
    lanterns: map.lanterns.map(([id, pos]) => ({ id, pos: [...pos], lit: false, deposited: 0 })),
    motes: [],
    shades: [],
    drifters: [],
    charms: [],
    wind: { left: 0, dirDeg: 0, applied: false },
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    randomDrifters: sc.random_drifters !== false && map.drifters,
    windEnabled: sc.wind_enabled !== false && map.wind,
    nextMote: 1,
    nextShade: 1,
    nextDrifter: 1,
    input: createInputState(),
    stats: { picked: 0, deposited: 0, stunned: 0, hits: 0, pulses: 0, stolen: 0, bonusTime: 0, bonusFlames: 0 },
  };
  g.timeLeft = g.baseTime;
  const P = g.player;

  if (sc.player) {
    const p = sc.player;
    if (p.pos) P.pos = [...p.pos];
    if (p.carried !== undefined) P.carried = p.carried;
    if (p.flames !== undefined) P.flames = p.flames;
    if (p.invuln_ticks !== undefined) P.invuln = p.invuln_ticks;
    if (p.dash_cd_ticks !== undefined) P.dashCd = p.dash_cd_ticks;
    if (p.pulse_cd_ticks !== undefined) P.pulseCd = p.pulse_cd_ticks;
    if (p.charm_ticks !== undefined) P.charm = p.charm_ticks;
  }
  const h0 = heightAt(g, P.pos[0], P.pos[2]);
  P.grounded = isGround(h0) && P.pos[1] <= h0 + EPS;

  if (sc.lanterns) {
    for (const l of sc.lanterns) {
      const L = g.lanterns.find((x) => x.id === l.id);
      if (!L) continue;
      if (l.pos) L.pos = [...l.pos];
      if (l.deposited !== undefined) L.deposited = l.deposited;
      if (l.lit !== undefined) L.lit = l.lit;
    }
  }

  // đom đóm
  if (sc.motes) {
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m.pos;
      const id = !Array.isArray(m) && m.id ? m.id : newMoteId(g);
      g.motes.push({ id, pos: [...pos], kind: "random", ttl: null });
    }
  } else if (g.randomMotes) {
    const idx = map.motePoints.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng.next() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx.slice(0, R.mote_start)) g.motes.push({ id: newMoteId(g), pos: [...map.motePoints[i]], kind: "random", ttl: null });
  }

  if (sc.shades) {
    for (const s of sc.shades) {
      const id = s.id || newShadeId(g);
      g.shades.push(makeShade(g, id, s.pos, s.state || "wander", s.state_ticks_left));
    }
  }

  if (sc.drifters) {
    for (const d of sc.drifters) {
      const id = d.id || newDrifterId(g);
      g.drifters.push(makeDrifter(g, id, d.pos, d.state || "idle", d.stolen || 0, d.state_ticks_left));
    }
  }

  const defaultCharms = map.charms.map(([id, pos]) => ({ id, pos: [...pos], available: true, respawn: 0 }));
  if (sc.charms) {
    for (const c of sc.charms) {
      const def = map.charms.find(([id]) => id === c.id);
      g.charms.push({
        id: c.id,
        pos: c.pos ? [...c.pos] : [...def[1]],
        available: c.available !== false,
        respawn: c.respawn_ticks || 0,
      });
    }
  } else g.charms = defaultCharms;
  return g;
}

// ---------- tạo thực thể ----------
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
function newDrifterId(g) {
  const used = new Set(g.drifters.map((d) => d.id));
  while (used.has("D" + g.nextDrifter)) g.nextDrifter++;
  return "D" + g.nextDrifter++;
}

function makeShade(g, id, pos, state, left) {
  const h = heightAt(g, pos[0], pos[2]);
  const y = isGround(h) ? h + R.shade_center_y : pos[1];
  const s = { id, pos: [pos[0], y, pos[2]], state, left: 0, pushLeft: 0, pushDir: [1, 0], recoilLeft: 0, recoilDir: [1, 0], expelLeft: 0, expelTo: null, heading: null, turn: 0 };
  if (state === "spawning" || state === "stunned") s.left = left !== undefined ? left : state === "spawning" ? R.shade_spawning_ticks : 0;
  if (state === "recoil") s.recoilLeft = left !== undefined ? left : R.shade_recoil_ticks;
  return s;
}
function makeDrifter(g, id, pos, state, stolen, left) {
  const h = heightAt(g, pos[0], pos[2]);
  const y = isGround(h) ? h + R.drifter_center_y : pos[1];
  return { id, pos: [pos[0], y, pos[2]], state, stolen, left: state === "flee" ? (left !== undefined ? left : R.drifter_flee_ticks) : 0, heading: null, turn: 0 };
}

const engageState = (g, s) => (dXZ(s.pos[0], s.pos[2], g.player.pos[0], g.player.pos[2]) <= R.shade_detect + EPS ? "chase" : "wander");
const litZone = (g, x, z) => g.lanterns.some((L) => L.lit && dXZ(x, z, L.pos[0], L.pos[2]) < g.tuning.safe_radius - EPS);

// ---------- bước chính ----------
export function stepGame(g, applyInput) {
  if (g.state === "won" || g.state === "lost") return [];
  const T = g.tuning;
  const S = T.score;
  const P = g.player;
  const events = [];
  const t = g.tick + 1;
  const emit = (name, data) => events.push({ tick: t, name, data });

  // 1. input (pause trước)
  if (applyInput) applyInput(g.input);
  const pr = consumePresses(g.input);
  if (!g.started) {
    g.started = true;
    emit("night_start", { night: g.night });
  }
  g.tick = t;
  if (pr.pause) {
    if (g.state === "playing") {
      g.state = "paused";
      emit("paused", {});
      return events;
    }
    g.state = "playing";
    emit("resumed", {});
  } else if (g.state === "paused") return events;

  // 2. giảm bộ đếm
  g.simTick++;
  g.timeLeft = g.baseTime - g.simTick / TICK_RATE;
  if (P.dashCd > 0) P.dashCd--;
  if (P.pulseCd > 0) P.pulseCd--;
  if (P.invuln > 0) P.invuln--;
  if (P.charm > 0) P.charm--;
  for (const s of g.shades) {
    if (s.state === "stunned" || s.state === "spawning") {
      s.left--;
      if (s.left <= 0) {
        s.left = 0;
        s.state = engageState(g, s);
      }
    }
  }
  for (let i = g.motes.length - 1; i >= 0; i--) {
    const m = g.motes[i];
    if (m.kind === "dropped" && --m.ttl <= 0) g.motes.splice(i, 1);
  }
  for (const c of g.charms) {
    if (!c.available && --c.respawn <= 0) {
      c.respawn = 0;
      c.available = true;
    }
  }

  // 3. di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi
  movePlayer(g, pr, emit);
  const frozen = P.fallWait > 0;

  // 4. nhặt đom đóm và bùa
  if (!frozen) {
    for (let i = 0; i < g.motes.length; ) {
      const m = g.motes[i];
      if (P.carried < T.carry_capacity && inReach(P, m.pos, T.pickup_radius)) {
        g.motes.splice(i, 1);
        P.carried++;
        g.stats.picked++;
        emit("mote_picked", { carried: P.carried });
      } else i++;
    }
    for (const c of g.charms) {
      if (c.available && inReach(P, c.pos, T.pickup_radius)) {
        c.available = false;
        c.respawn = R.charm_respawn_ticks;
        P.charm = R.charm_ticks;
        emit("charm_picked", { charm_id: c.id, charm_ticks: R.charm_ticks });
      }
    }
  }

  // 5. tương tác với đèn
  if (!frozen && pr.interact && P.carried > 0) {
    let best = null;
    let bestD = Infinity;
    for (const L of g.lanterns) {
      if (L.lit) continue;
      const d = dXZ(P.pos[0], P.pos[2], L.pos[0], L.pos[2]);
      if (d <= T.interact_radius + EPS && d < bestD - EPS) {
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
        g.score += amount * S.per_mote;
        emit("deposit", { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= T.lantern_cost) {
          best.lit = true;
          g.score += S.per_lantern;
          emit("lantern_lit", { lantern_id: best.id });
        }
      }
    }
  }

  // 6. cập nhật vùng an toàn: Bóng Mực đang ở trong vùng của đèn đã sáng bị đẩy ra mép trong 30 tick
  updateSafeZones(g);

  // 7. tỏa sáng
  if (!frozen && pr.pulse && P.pulseCd === 0 && P.carried >= T.pulse_cost) doPulse(g, emit);

  // 8. di chuyển Bóng Mực và Gió Lạc
  moveShades(g);
  moveDrifters(g);

  // 9. chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (theo id tăng dần)
  if (!frozen) {
    for (const d of g.drifters) {
      if (d.state === "chase" && dXZ(d.pos[0], d.pos[2], P.pos[0], P.pos[2]) <= R.drifter_touch + EPS) {
        const amount = Math.min(R.drifter_steal, P.carried);
        P.carried -= amount;
        d.state = "flee";
        d.stolen = amount;
        d.left = R.drifter_flee_ticks;
        g.stats.stolen += amount;
        emit("drifter_steal", { drifter_id: d.id, amount, carried: P.carried });
      }
    }
    if (P.invuln === 0) {
      const order = [...g.shades].sort((a, b) => compareIds(a.id, b.id));
      for (const s of order) {
        if ((s.state !== "wander" && s.state !== "chase") || s.expelLeft > 0) continue;
        const feet = s.pos[1] - R.shade_center_y;
        if (dXZ(s.pos[0], s.pos[2], P.pos[0], P.pos[2]) <= T.shade_hit_radius + EPS && Math.abs(P.pos[1] - feet) <= R.shade_hit_dz + EPS) {
          hitPlayer(g, s, emit);
          break; // tối đa 1 lần mất Ngọn Lửa mỗi tick
        }
      }
    }
  }

  // 10. sinh theo lịch (thực thể mới chỉ tương tác được từ tick sau)
  spawnScheduled(g, emit);

  // 11. thắng/thua
  if (P.flames <= 0) finish(g, "lost", "no_flames", emit);
  else if (g.lanterns.every((L) => L.lit)) {
    g.stats.bonusTime = Math.floor(Math.max(0, g.timeLeft) + 1e-7) * S.per_second_left;
    g.stats.bonusFlames = P.flames * S.per_flame_left;
    g.score += g.stats.bonusTime + g.stats.bonusFlames;
    finish(g, "won", "all_lit", emit);
  } else if (g.timeLeft <= EPS) finish(g, "lost", "dawn", emit);
  return events;
}

function finish(g, result, reason, emit) {
  g.state = result;
  g.result = result;
  g.reason = reason;
  emit("game_over", { result, reason });
}

/** Chân Mây trong tầm nhặt: XZ ≤ r và chênh cao so với mặt đất nơi đặt vật ≤ 1.5 m. */
function inReach(P, pos, r) {
  return dXZ(P.pos[0], P.pos[2], pos[0], pos[2]) <= r + EPS && Math.abs(P.pos[1] - pos[1]) <= R.pickup_height + EPS;
}

// ---------- di chuyển Mây ----------
function respawn(g) {
  const P = g.player;
  P.pos = [...g.map.start];
  P.vel = [0, 0, 0];
  P.grounded = true;
  P.invuln = R.respawn_invuln_ticks;
  P.launch = null;
  P.dashLeft = 0;
  P.facing = [0, 1];
}

/** Thử đi tới (nx,nz); bị vật cản/vách chặn thì trượt dọc trục; trả về [x,z] cuối. */
function tryMove(g, pos, nx, nz) {
  const ok = (x, z) => {
    const h = heightAt(g, x, z);
    return h !== Infinity && (h === -Infinity || h - pos[1] <= R.step_height + EPS);
  };
  if (ok(nx, nz)) return [nx, nz];
  if (ok(nx, pos[2])) return [nx, pos[2]];
  if (ok(pos[0], nz)) return [pos[0], nz];
  return [pos[0], pos[2]];
}

function movePlayer(g, pr, emit) {
  const T = g.tuning;
  const P = g.player;
  // gió mạnh (Đêm 3): cơn đầu tiên tại tick 1800, mỗi cơn 300 tick
  if (g.windEnabled && g.simTick > 0 && g.simTick % R.wind_every_ticks === 0) {
    g.wind.left = R.wind_ticks;
    g.wind.dirDeg = Math.floor(g.rng.next() * 360);
  }
  const windOn = g.wind.left > 0;
  g.wind.applied = windOn;
  if (windOn) g.wind.left--;

  if (P.fallWait > 0) {
    P.fallWait--;
    if (P.fallWait === 0) respawn(g);
    return;
  }

  const [mx, mz] = worldMoveDir(g.input.move, g.input.cam_yaw_deg);
  const mlen = Math.hypot(mx, mz);
  const moving = mlen > 0;
  if (moving) P.facing = [mx / mlen, mz / mlen];

  // lướt
  if (pr.dash && P.dashLeft === 0 && (P.dashCd === 0 || P.charm > 0)) {
    P.dashDir = moving ? [mx / mlen, mz / mlen] : [...P.facing];
    P.dashLeft = secToTicks(T.dash_duration_s);
    if (P.charm <= 0) P.dashCd = secToTicks(T.dash_cooldown_s);
    emit("dash", {});
  }
  const dashing = P.dashLeft > 0;

  // nhảy
  let jumped = false;
  if (pr.jump && P.grounded && !dashing) {
    P.vel[1] = R.jump_velocity;
    P.grounded = false;
    jumped = true;
  }

  // vận tốc ngang
  let hv;
  if (dashing) hv = [P.dashDir[0] * T.dash_speed, P.dashDir[1] * T.dash_speed];
  else if (P.launch) hv = [P.launch[0], P.launch[1]];
  else {
    const sp = P.charm > 0 ? R.charm_speed : T.player_speed;
    hv = [mx * sp, mz * sp];
  }
  if (windOn) {
    hv[0] += Math.cos(rad(g.wind.dirDeg)) * R.wind_push;
    hv[1] += Math.sin(rad(g.wind.dirDeg)) * R.wind_push;
  }

  const [px, pz] = tryMove(g, P.pos, P.pos[0] + hv[0] * DT, P.pos[2] + hv[1] * DT);
  P.pos[0] = px;
  P.pos[2] = pz;

  // dọc
  let y = P.pos[1];
  let vy = P.vel[1];
  if (dashing) vy = 0; // lướt giữ nguyên độ cao
  else if (!P.grounded) {
    vy -= R.gravity * DT;
    y += vy * DT;
  } else vy = 0;
  const gh = heightAt(g, px, pz);
  if (isGround(gh) && y <= gh + EPS && vy <= 0) {
    y = gh;
    vy = 0;
    P.grounded = true;
    P.launch = null;
  } else if (isGround(gh) && P.grounded && !jumped && y > gh && y - gh <= R.step_height + EPS) {
    y = gh; // đi xuống dốc/bậc thấp: dính mặt đất
    vy = 0;
  } else P.grounded = false;
  P.pos[1] = y;
  P.vel = [hv[0], vy, hv[1]];

  // bục nhảy
  if (P.grounded && !P.launch) {
    for (const pad of g.map.pads) {
      if (dXZ(P.pos[0], P.pos[2], pad.pos[0], pad.pos[2]) <= R.pad_radius + EPS && Math.abs(P.pos[1] - pad.pos[1]) <= R.pad_height_tol + EPS) {
        let dir = pad.dir;
        if (pad.toward) {
          const vx = pad.toward[0] - pad.pos[0];
          const vz = pad.toward[1] - pad.pos[2];
          const l = Math.hypot(vx, vz);
          dir = [vx / l, vz / l];
        }
        P.launch = [dir[0] * pad.speed, dir[1] * pad.speed];
        P.vel = [P.launch[0], pad.vy, P.launch[1]]; // vận tốc phóng có hiệu lực ngay từ tick này
        P.grounded = false;
        break;
      }
    }
  }

  if (dashing) P.dashLeft--;

  // rơi khỏi đảo
  if (P.pos[1] < R.fall_y) {
    P.flames = Math.max(0, P.flames - 1);
    const lost = P.carried;
    P.carried = 0;
    P.fallWait = R.fall_wait_ticks;
    P.vel = [0, 0, 0];
    P.dashLeft = 0;
    P.launch = null;
    emit("player_hit", { by: "fall", flames: P.flames, dropped: 0, lost });
  }
}

// ---------- vùng an toàn ----------
function updateSafeZones(g) {
  const Rz = g.tuning.safe_radius;
  for (const s of g.shades) {
    if (s.expelLeft === 0) {
      let hit = null;
      let hitD = Infinity;
      for (const L of g.lanterns) {
        if (!L.lit) continue;
        const d = dXZ(s.pos[0], s.pos[2], L.pos[0], L.pos[2]);
        if (d < Rz - EPS && d < hitD) {
          hit = L;
          hitD = d;
        }
      }
      if (!hit) continue;
      let vx = s.pos[0] - hit.pos[0];
      let vz = s.pos[2] - hit.pos[2];
      let l = Math.hypot(vx, vz);
      if (l < 1e-9) {
        vx = 1;
        vz = 0;
        l = 1;
      }
      s.expelTo = [hit.pos[0] + (vx / l) * Rz, hit.pos[2] + (vz / l) * Rz];
      s.expelLeft = R.safe_expel_ticks;
      if (s.state !== "stunned") s.state = "recoil";
      s.recoilLeft = 0;
    }
    const k = 1 / s.expelLeft;
    s.pos[0] = s.expelLeft === 1 ? s.expelTo[0] : s.pos[0] + (s.expelTo[0] - s.pos[0]) * k;
    s.pos[2] = s.expelLeft === 1 ? s.expelTo[1] : s.pos[2] + (s.expelTo[1] - s.pos[2]) * k;
    const h = heightAt(g, s.pos[0], s.pos[2]);
    if (isGround(h)) s.pos[1] = h + R.shade_center_y;
    s.expelLeft--;
    if (s.expelLeft === 0 && s.state === "recoil") s.state = engageState(g, s);
  }
}

// ---------- tỏa sáng ----------
function doPulse(g, emit) {
  const T = g.tuning;
  const P = g.player;
  P.carried -= T.pulse_cost;
  P.pulseCd = secToTicks(T.pulse_cooldown_s);
  g.stats.pulses++;
  const cx = P.pos[0];
  const cy = P.pos[1] + R.pulse_center_y;
  const cz = P.pos[2];
  const ids = [];
  for (const s of g.shades) {
    if (Math.hypot(s.pos[0] - cx, s.pos[1] - cy, s.pos[2] - cz) > T.pulse_radius + EPS) continue;
    let vx = s.pos[0] - P.pos[0];
    let vz = s.pos[2] - P.pos[2];
    const l = Math.hypot(vx, vz);
    if (l < 1e-9) {
      vx = 1;
      vz = 0;
    } else {
      vx /= l;
      vz /= l;
    }
    s.state = "stunned";
    s.left = secToTicks(T.pulse_stun_s);
    s.pushLeft = R.stun_push_ticks;
    s.pushDir = [vx, vz];
    s.recoilLeft = 0;
    ids.push(s.id);
  }
  g.score += ids.length * T.score.per_stun;
  g.stats.stunned += ids.length;
  emit("pulse", { stunned_ids: ids });
  for (const d of g.drifters) {
    if (Math.hypot(d.pos[0] - cx, d.pos[1] - cy, d.pos[2] - cz) > T.pulse_radius + EPS) continue;
    if (d.state === "chase") {
      d.state = "flee";
      d.stolen = 0;
      d.left = R.drifter_flee_ticks;
    } else if (d.state === "flee" && d.stolen > 0) {
      const amount = d.stolen;
      const h = heightAt(g, d.pos[0], d.pos[2]);
      const y = isGround(h) ? h : 0;
      for (let i = 0; i < amount; i++) g.motes.push({ id: newMoteId(g), pos: [d.pos[0], y, d.pos[2]], kind: "dropped", ttl: R.dropped_ttl_ticks });
      d.stolen = 0;
      d.left = Math.min(d.left, R.drifter_drop_vanish_ticks);
      emit("drifter_drop", { drifter_id: d.id, amount });
    }
  }
}

// ---------- Bóng Mực ----------
/** Đi tới (nx,nz) nếu mặt đất hợp lệ (không hư không/vật cản/vách); trượt dọc trục; không vào vùng an toàn. */
function shadeMove(g, s, nx, nz) {
  const Rz = g.tuning.safe_radius;
  const gh0 = s.pos[1] - R.shade_center_y;
  const clampZone = (x, z) => {
    for (const L of g.lanterns) {
      if (!L.lit) continue;
      const d = dXZ(x, z, L.pos[0], L.pos[2]);
      if (d < Rz - EPS) {
        if (d < 1e-9) return [s.pos[0], s.pos[2]];
        x = L.pos[0] + ((x - L.pos[0]) / d) * Rz;
        z = L.pos[2] + ((z - L.pos[2]) / d) * Rz;
      }
    }
    return [x, z];
  };
  const ok = (x, z) => {
    const h = heightAt(g, x, z);
    return isGround(h) && Math.abs(h - gh0) <= R.step_height + EPS;
  };
  const tries = [
    [nx, nz],
    [nx, s.pos[2]],
    [s.pos[0], nz],
  ];
  for (const [tx, tz] of tries) {
    const [cx, cz] = clampZone(tx, tz);
    if (ok(cx, cz)) {
      s.pos[0] = cx;
      s.pos[2] = cz;
      s.pos[1] = heightAt(g, cx, cz) + R.shade_center_y;
      return true;
    }
  }
  return false;
}

function moveShades(g) {
  const P = g.player;
  for (const s of g.shades) {
    if (s.expelLeft > 0 || s.state === "spawning") continue;
    const d = dXZ(s.pos[0], s.pos[2], P.pos[0], P.pos[2]);
    if (s.state === "wander" || s.state === "chase") {
      if (d <= R.shade_detect + EPS) s.state = "chase";
      else if (s.state === "chase" && d > R.shade_giveup + EPS) s.state = "wander";
    }
    if (s.state === "stunned") {
      if (s.pushLeft > 0) {
        const step = g.tuning.pulse_push_m / R.stun_push_ticks;
        shadeMove(g, s, s.pos[0] + s.pushDir[0] * step, s.pos[2] + s.pushDir[1] * step);
        s.pushLeft--;
      }
    } else if (s.state === "recoil") {
      if (s.recoilLeft > 0) {
        const step = R.shade_recoil_m / R.shade_recoil_ticks;
        shadeMove(g, s, s.pos[0] + s.recoilDir[0] * step, s.pos[2] + s.recoilDir[1] * step);
        if (--s.recoilLeft === 0) s.state = engageState(g, s);
      } else s.state = engageState(g, s);
    } else if (s.state === "chase") {
      if (d > 1e-9) {
        const sp = g.map.shade.speed * DT;
        const k = Math.min(sp, d) / d;
        shadeMove(g, s, s.pos[0] + (P.pos[0] - s.pos[0]) * k, s.pos[2] + (P.pos[2] - s.pos[2]) * k);
      }
    } else if (s.state === "wander") {
      if (s.heading === null || --s.turn <= 0) {
        s.heading = g.rng.next() * 2 * Math.PI;
        s.turn = R.shade_wander_turn_ticks;
      }
      const sp = R.shade_wander_speed * DT;
      if (!shadeMove(g, s, s.pos[0] + Math.cos(s.heading) * sp, s.pos[2] + Math.sin(s.heading) * sp)) s.turn = 0;
    }
  }
}

function hitPlayer(g, s, emit) {
  const T = g.tuning;
  const P = g.player;
  P.flames = Math.max(0, P.flames - 1);
  const dropped = Math.floor(P.carried * T.hit_drop_ratio + 1e-9);
  P.carried -= dropped;
  P.invuln = secToTicks(T.invuln_s);
  g.stats.hits++;
  dropMotes(g, dropped);
  let vx = s.pos[0] - P.pos[0];
  let vz = s.pos[2] - P.pos[2];
  const l = Math.hypot(vx, vz);
  s.recoilDir = l < 1e-9 ? [1, 0] : [vx / l, vz / l];
  s.state = "recoil";
  s.recoilLeft = R.shade_recoil_ticks;
  emit("player_hit", { by: "shade", flames: P.flames, dropped });
}

/** Rải `n` đom đóm rơi trên vành 1.5–2.5 m quanh Mây (TTL 480 tick, nhặt lại được từ tick sau). */
function dropMotes(g, n) {
  const P = g.player;
  for (let i = 0; i < n; i++) {
    let pos = null;
    for (let tries = 0; tries < 8 && !pos; tries++) {
      const a = g.rng.next() * 2 * Math.PI;
      const r = R.drop_ring_min + g.rng.next() * (R.drop_ring_max - R.drop_ring_min);
      const x = P.pos[0] + Math.cos(a) * r;
      const z = P.pos[2] + Math.sin(a) * r;
      const h = heightAt(g, x, z);
      if (isGround(h) && Math.abs(h - P.pos[1]) <= R.step_height + EPS + (P.grounded ? 0 : 3)) pos = [x, h, z];
    }
    if (!pos) pos = [P.pos[0], isGround(heightAt(g, P.pos[0], P.pos[2])) ? heightAt(g, P.pos[0], P.pos[2]) : 0, P.pos[2]];
    g.motes.push({ id: newMoteId(g), pos, kind: "dropped", ttl: R.dropped_ttl_ticks });
  }
}

// ---------- Gió Lạc ----------
function moveDrifters(g) {
  const P = g.player;
  for (const d of g.drifters) {
    const dist = dXZ(d.pos[0], d.pos[2], P.pos[0], P.pos[2]);
    if (d.state === "idle" || d.state === "chase") {
      const cond = P.carried >= R.drifter_detect_carried && dist <= R.drifter_detect_dist + EPS && P.fallWait === 0;
      d.state = cond ? "chase" : "idle";
    }
    let nx = d.pos[0];
    let nz = d.pos[2];
    if (d.state === "idle") {
      if (d.heading === null || --d.turn <= 0) {
        d.heading = g.rng.next() * 2 * Math.PI;
        d.turn = R.drifter_turn_ticks;
      }
      const sp = R.drifter_idle_speed * DT;
      nx += Math.cos(d.heading) * sp;
      nz += Math.sin(d.heading) * sp;
      if (!isGround(heightAt(g, nx, nz))) {
        nx = d.pos[0];
        nz = d.pos[2];
        d.turn = 0;
      }
    } else if (d.state === "chase") {
      if (dist > 1e-9) {
        const k = Math.min(R.drifter_speed * DT, dist) / dist;
        nx += (P.pos[0] - d.pos[0]) * k;
        nz += (P.pos[2] - d.pos[2]) * k;
      }
    } else if (d.state === "flee") {
      let vx = d.pos[0] - P.pos[0];
      let vz = d.pos[2] - P.pos[2];
      const l = Math.hypot(vx, vz);
      if (l < 1e-9) {
        vx = 1;
        vz = 0;
      } else {
        vx /= l;
        vz /= l;
      }
      nx += vx * R.drifter_speed * DT;
      nz += vz * R.drifter_speed * DT;
      if (--d.left <= 0) d.state = "removed";
    }
    d.pos[0] = nx;
    d.pos[2] = nz;
    const h = heightAt(g, nx, nz);
    if (isGround(h)) d.pos[1] = h + R.drifter_center_y;
  }
  g.drifters = g.drifters.filter((d) => d.state !== "removed");
}

// ---------- sinh theo lịch ----------
function spawnScheduled(g, emit) {
  const P = g.player;
  const st = g.simTick;
  if (g.randomMotes && st % R.mote_every_ticks === 0 && g.motes.length < R.mote_cap) {
    const free = g.map.motePoints.filter((p) => !g.motes.some((m) => m.kind === "random" && dXZ(m.pos[0], m.pos[2], p[0], p[2]) < 1e-3));
    if (free.length) {
      const p = free[Math.floor(g.rng.next() * free.length)];
      g.motes.push({ id: newMoteId(g), pos: [...p], kind: "random", ttl: null });
    }
  }
  if (g.randomShades) {
    const first = R.shade_first_spawn_tick;
    const every = secToTicks(g.map.shade.every_s);
    let n = 0;
    if (st === first) n = R.shade_first_spawn_count;
    else if (st > first && (st - first) % every === 0) n = 1;
    for (let i = 0; i < n && g.shades.length < g.map.shade.max; i++) {
      const cand = g.map.shadePoints.filter((p) => dXZ(p[0], p[2], P.pos[0], P.pos[2]) >= 15 - EPS && !litZone(g, p[0], p[2]));
      if (!cand.length) continue;
      const p = cand[Math.floor(g.rng.next() * cand.length)];
      const s = makeShade(g, newShadeId(g), p, "spawning", R.shade_spawning_ticks);
      g.shades.push(s);
      emit("shade_spawned", { id: s.id });
    }
  }
  if (g.randomDrifters && st % R.drifter_every_ticks === 0 && g.drifters.length < R.drifter_max) {
    const cand = g.map.shadePoints.filter((p) => dXZ(p[0], p[2], P.pos[0], P.pos[2]) >= 15 - EPS);
    if (cand.length) {
      const p = cand[Math.floor(g.rng.next() * cand.length)];
      g.drifters.push(makeDrifter(g, newDrifterId(g), p, "idle", 0));
    }
  }
}

/** Snapshot theo Test Contract v1.1 (chưa làm tròn – xem output.js). */
export function snapshotOf(g) {
  const P = g.player;
  const tps = TICK_RATE;
  return {
    type: "snapshot",
    tick: g.tick,
    sim_tick: g.simTick,
    state: g.state,
    night: g.night,
    time_left_s: g.timeLeft,
    score: g.score,
    wind: { active: g.wind.applied, dir_deg: g.wind.applied ? g.wind.dirDeg : 0 },
    player: {
      pos: P.pos,
      vel: P.vel,
      grounded: P.grounded,
      flames: P.flames,
      carried: P.carried,
      invuln: P.invuln > 0,
      dash_cd_s: P.dashCd / tps,
      pulse_cd_s: P.pulseCd / tps,
      charm_s: P.charm / tps,
    },
    lanterns: g.lanterns.map((L) => ({ id: L.id, pos: L.pos, lit: L.lit, deposited: L.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: s.pos, state: s.state })),
    motes_active: g.motes.length,
    motes: g.motes.map((m) => ({ id: m.id, pos: m.pos, kind: m.kind, ttl_s: m.ttl === null ? null : m.ttl / tps })),
    drifters: g.drifters.map((d) => ({ id: d.id, pos: d.pos, state: d.state, stolen: d.stolen })),
    charms: g.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: c.respawn / tps })),
  };
}
