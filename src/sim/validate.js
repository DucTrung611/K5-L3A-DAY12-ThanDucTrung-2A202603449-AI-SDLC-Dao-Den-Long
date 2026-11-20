// Kiểm tra định dạng file scenario / inputs (Test Contract v1.1). Sai định dạng -> FormatError (CLI thoát mã 2).
import { MAPS, lanternIds } from "./maps.js";

export class FormatError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "FormatError";
  }
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isNat = (v) => isInt(v) && v >= 0;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

const fail = (where, msg) => {
  throw new FormatError(`${where}: ${msg}`);
};

export const SHADE_STATES = ["spawning", "wander", "chase", "recoil", "stunned"];
export const DRIFTER_STATES = ["idle", "chase", "flee"];

export function validateScenario(sc, night = 1) {
  const W = "scenario";
  if (!isObj(sc)) fail(W, "phải là một object JSON");
  if (sc.player !== undefined) {
    const p = sc.player;
    if (!isObj(p)) fail(W, "player phải là object");
    if (p.pos !== undefined && !isVec3(p.pos)) fail(W, "player.pos phải là [x,y,z] số");
    for (const k of ["carried", "flames", "invuln_ticks", "dash_cd_ticks", "pulse_cd_ticks", "charm_ticks"]) {
      if (p[k] !== undefined && !isNat(p[k])) fail(W, `player.${k} phải là số nguyên >= 0`);
    }
  }
  for (const k of ["random_motes", "random_shades", "random_drifters", "wind_enabled"]) {
    if (sc[k] !== undefined && typeof sc[k] !== "boolean") fail(W, `${k} phải là boolean`);
  }
  if (sc.motes !== undefined) {
    if (!Array.isArray(sc.motes)) fail(W, "motes phải là mảng");
    sc.motes.forEach((m, i) => {
      const pos = isObj(m) ? m.pos : m;
      if (!isVec3(pos)) fail(W, `motes[${i}] phải là [x,y,z] hoặc {pos:[x,y,z]}`);
      if (isObj(m) && m.id !== undefined && typeof m.id !== "string") fail(W, `motes[${i}].id phải là chuỗi`);
    });
  }
  if (sc.shades !== undefined) {
    if (!Array.isArray(sc.shades)) fail(W, "shades phải là mảng");
    const seen = new Set();
    sc.shades.forEach((s, i) => {
      if (!isObj(s)) fail(W, `shades[${i}] phải là object`);
      if (!isVec3(s.pos)) fail(W, `shades[${i}].pos phải là [x,y,z] số`);
      if (s.id !== undefined) {
        if (typeof s.id !== "string" || s.id === "") fail(W, `shades[${i}].id phải là chuỗi khác rỗng`);
        if (seen.has(s.id)) fail(W, `shades[${i}].id trùng: ${s.id}`);
        seen.add(s.id);
      }
      if (s.state !== undefined && !SHADE_STATES.includes(s.state)) fail(W, `shades[${i}].state không hợp lệ: ${JSON.stringify(s.state)}`);
      if (s.state_ticks_left !== undefined && !isNat(s.state_ticks_left)) fail(W, `shades[${i}].state_ticks_left phải là số nguyên >= 0`);
    });
  }
  if (sc.drifters !== undefined) {
    if (!Array.isArray(sc.drifters)) fail(W, "drifters phải là mảng");
    const seen = new Set();
    sc.drifters.forEach((d, i) => {
      if (!isObj(d)) fail(W, `drifters[${i}] phải là object`);
      if (!isVec3(d.pos)) fail(W, `drifters[${i}].pos phải là [x,y,z] số`);
      if (d.id !== undefined) {
        if (typeof d.id !== "string" || d.id === "") fail(W, `drifters[${i}].id phải là chuỗi khác rỗng`);
        if (seen.has(d.id)) fail(W, `drifters[${i}].id trùng: ${d.id}`);
        seen.add(d.id);
      }
      if (d.state !== undefined && !DRIFTER_STATES.includes(d.state)) fail(W, `drifters[${i}].state không hợp lệ: ${JSON.stringify(d.state)}`);
      if (d.stolen !== undefined && !isNat(d.stolen)) fail(W, `drifters[${i}].stolen phải là số nguyên >= 0`);
      if (d.state_ticks_left !== undefined && !isNat(d.state_ticks_left)) fail(W, `drifters[${i}].state_ticks_left phải là số nguyên >= 0`);
    });
  }
  if (sc.charms !== undefined) {
    if (!Array.isArray(sc.charms)) fail(W, "charms phải là mảng");
    const defaults = new Map((MAPS[night]?.charms || []).map(([id]) => [id, true]));
    sc.charms.forEach((c, i) => {
      if (!isObj(c)) fail(W, `charms[${i}] phải là object`);
      if (typeof c.id !== "string" || c.id === "") fail(W, `charms[${i}].id phải là chuỗi khác rỗng`);
      if (c.pos !== undefined && !isVec3(c.pos)) fail(W, `charms[${i}].pos phải là [x,y,z] số`);
      if (c.pos === undefined && !defaults.has(c.id)) fail(W, `charms[${i}] thiếu pos (id ${c.id} không có sẵn ở Đêm ${night})`);
      if (c.available !== undefined && typeof c.available !== "boolean") fail(W, `charms[${i}].available phải là boolean`);
      if (c.respawn_ticks !== undefined && !isNat(c.respawn_ticks)) fail(W, `charms[${i}].respawn_ticks phải là số nguyên >= 0`);
    });
  }
  if (sc.lanterns !== undefined) {
    if (!Array.isArray(sc.lanterns)) fail(W, "lanterns phải là mảng");
    const ids = lanternIds(night);
    sc.lanterns.forEach((l, i) => {
      if (!isObj(l)) fail(W, `lanterns[${i}] phải là object`);
      if (!ids.includes(l.id)) fail(W, `lanterns[${i}].id không hợp lệ ở Đêm ${night}: ${JSON.stringify(l.id)}`);
      if (l.pos !== undefined && !isVec3(l.pos)) fail(W, `lanterns[${i}].pos phải là [x,y,z] số`);
      if (l.deposited !== undefined && !isNat(l.deposited)) fail(W, `lanterns[${i}].deposited phải là số nguyên >= 0`);
      if (l.lit !== undefined && typeof l.lit !== "boolean") fail(W, `lanterns[${i}].lit phải là boolean`);
    });
  }
  if (sc.time_left_s !== undefined && !(isNum(sc.time_left_s) && sc.time_left_s > 0)) fail(W, "time_left_s phải là số > 0");
  return sc;
}

export function validateInputs(inp) {
  const W = "inputs";
  if (!isObj(inp)) fail(W, "phải là một object JSON");
  if (!Array.isArray(inp.frames)) fail(W, "thiếu mảng frames");
  let last = -1;
  inp.frames.forEach((f, i) => {
    if (!isObj(f)) fail(W, `frames[${i}] phải là object`);
    if (!(isInt(f.tick) && f.tick >= 0)) fail(W, `frames[${i}].tick phải là số nguyên >= 0`);
    if (f.tick <= last) fail(W, `frames[${i}].tick phải tăng nghiêm ngặt (${f.tick} <= ${last})`);
    last = f.tick;
    if (f.move !== undefined) {
      if (!(Array.isArray(f.move) && f.move.length === 2 && f.move.every(isNum))) fail(W, `frames[${i}].move phải là [x,z] số`);
      if (f.move.some((v) => v < -1 || v > 1)) fail(W, `frames[${i}].move: mỗi thành phần phải trong [-1,1]`);
    }
    if (f.cam_yaw_deg !== undefined && !isNum(f.cam_yaw_deg)) fail(W, `frames[${i}].cam_yaw_deg phải là số`);
    for (const b of ["jump", "interact", "pulse", "dash", "pause"]) {
      if (f[b] !== undefined && typeof f[b] !== "boolean") fail(W, `frames[${i}].${b} phải là boolean`);
    }
  });
  return inp;
}
