// Kiểm tra định dạng output JSONL theo Test Contract v1.1 mục E (độc lập với code game).

const EVENT_NAMES = new Set([
  "mote_picked", "deposit", "lantern_lit", "pulse", "player_hit", "shade_spawned", "game_over",
  "dash", "charm_picked", "drifter_steal", "drifter_drop", "night_start", "paused", "resumed",
]);
const STATES = new Set(["playing", "paused", "won", "lost"]);
const END_STATES = new Set(["playing", "won", "lost"]);
const SHADE_STATES = new Set(["spawning", "wander", "chase", "recoil", "stunned"]);
const DRIFTER_STATES = new Set(["idle", "chase", "flee"]);

const has3dp = (v) => typeof v === "number" && Number.isFinite(v) && Math.abs(Math.round(v * 1000) - v * 1000) < 1e-6;
const isVec3 = (p) => Array.isArray(p) && p.length === 3 && p.every(has3dp);

export function parseJsonl(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return lines.map((l, i) => {
    try {
      return JSON.parse(l);
    } catch (e) {
      throw new Error(`dòng ${i + 1} không phải JSON: ${e.message}`);
    }
  });
}

/** Trả về danh sách lỗi định dạng (rỗng = hợp lệ). */
export function validateOutput(objs, { snapshotEvery = 10, ticks, fallEnabled = true, night } = {}) {
  const errs = [];
  const err = (i, m) => errs.push(`dòng ${i + 1}: ${m}`);
  if (objs.length === 0) return ["output rỗng"];
  const first = objs[0];
  if (first.type !== "snapshot" || first.tick !== 0) err(0, "dòng đầu phải là snapshot tick 0");
  const last = objs[objs.length - 1];
  if (last.type !== "end") err(objs.length - 1, "dòng cuối phải là end");
  let lastTick = 0;
  let gameOver = 0;
  objs.forEach((o, i) => {
    if (!["snapshot", "event", "end"].includes(o.type)) return err(i, `type lạ: ${o.type}`);
    if (o.type === "end" && i !== objs.length - 1) err(i, "end phải là dòng cuối");
    const tk = o.type === "end" ? o.ticks : o.tick;
    if (!Number.isInteger(tk) || tk < lastTick) err(i, `tick không hợp lệ/giảm: ${tk}`);
    lastTick = tk;
    if (o.type === "snapshot") {
      if (o.tick % snapshotEvery !== 0) err(i, `snapshot ở tick ${o.tick} không chia hết cho ${snapshotEvery}`);
      if (!Number.isInteger(o.sim_tick) || o.sim_tick > o.tick) err(i, "sim_tick phải là số nguyên <= tick");
      if (!STATES.has(o.state)) err(i, `state lạ: ${o.state}`);
      if (night !== undefined && o.night !== night) err(i, `night=${o.night}, mong đợi ${night}`);
      if (!has3dp(o.time_left_s)) err(i, "time_left_s phải là số làm tròn 3 chữ số");
      if (!Number.isInteger(o.score)) err(i, "score phải là số nguyên");
      if (!o.wind || typeof o.wind.active !== "boolean" || !Number.isInteger(o.wind.dir_deg)) err(i, "wind sai định dạng");
      const p = o.player;
      if (!p || !isVec3(p.pos) || !isVec3(p.vel) || typeof p.grounded !== "boolean" || !Number.isInteger(p.flames) || !Number.isInteger(p.carried) || typeof p.invuln !== "boolean" || !has3dp(p.dash_cd_s) || !has3dp(p.pulse_cd_s) || !has3dp(p.charm_s))
        err(i, "player sai định dạng");
      if (!Array.isArray(o.lanterns) || o.lanterns.some((l) => typeof l.id !== "string" || !isVec3(l.pos) || typeof l.lit !== "boolean" || !Number.isInteger(l.deposited)))
        err(i, "lanterns sai định dạng");
      if (!Array.isArray(o.shades) || o.shades.some((s) => typeof s.id !== "string" || !isVec3(s.pos) || !SHADE_STATES.has(s.state)))
        err(i, "shades sai định dạng (state phải là spawning|wander|chase|recoil|stunned)");
      if (!Number.isInteger(o.motes_active)) err(i, "motes_active phải là số nguyên");
      if (!Array.isArray(o.motes) || o.motes.length !== o.motes_active || o.motes.some((m) => typeof m.id !== "string" || !isVec3(m.pos) || !["random", "dropped"].includes(m.kind) || (m.kind === "dropped" ? !has3dp(m.ttl_s) : m.ttl_s !== null)))
        err(i, "motes sai định dạng / không khớp motes_active");
      if (!Array.isArray(o.drifters) || o.drifters.some((d) => typeof d.id !== "string" || !isVec3(d.pos) || !DRIFTER_STATES.has(d.state) || !Number.isInteger(d.stolen)))
        err(i, "drifters sai định dạng");
      if (!Array.isArray(o.charms) || o.charms.some((c) => typeof c.id !== "string" || typeof c.available !== "boolean" || !has3dp(c.respawn_s)))
        err(i, "charms sai định dạng");
    } else if (o.type === "event") {
      if (!EVENT_NAMES.has(o.name)) err(i, `event lạ: ${o.name}`);
      if (typeof o.data !== "object" || o.data === null) err(i, "event thiếu data");
      if (o.name === "player_hit") {
        if (o.data.by === "fall" && !fallEnabled) err(i, "player_hit by fall khi fall_enabled=false");
        if (o.data.by === "fall" && !Number.isInteger(o.data.lost)) err(i, "player_hit by fall thiếu lost");
      }
      if (o.name === "game_over") gameOver++;
    } else {
      if (!END_STATES.has(o.state)) err(i, `end.state lạ: ${o.state}`);
      if (!Number.isInteger(o.score)) err(i, "end.score phải là số nguyên");
      if (ticks !== undefined && o.state === "playing" && o.ticks !== ticks) err(i, `end.ticks=${o.ticks} khác --ticks=${ticks}`);
      if (o.state !== "playing" && gameOver !== 1) err(i, "game kết thúc nhưng không có đúng 1 event game_over");
    }
  });
  return errs;
}
