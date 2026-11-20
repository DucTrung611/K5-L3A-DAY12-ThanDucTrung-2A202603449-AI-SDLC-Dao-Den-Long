// Kiểm tra định dạng file scenario / inputs. Sai định dạng -> FormatError (CLI thoát mã 2).

export class FormatError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "FormatError";
  }
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

function fail(where, msg) {
  throw new FormatError(`${where}: ${msg}`);
}

export const LANTERN_IDS = ["L1", "L2", "L3", "L4", "L5"];

export function validateScenario(sc) {
  const W = "scenario";
  if (!isObj(sc)) fail(W, "phải là một object JSON");
  if (sc.player !== undefined) {
    const p = sc.player;
    if (!isObj(p)) fail(W, "player phải là object");
    if (p.pos !== undefined && !isVec3(p.pos)) fail(W, "player.pos phải là [x,y,z] số");
    if (p.carried !== undefined && !(isInt(p.carried) && p.carried >= 0)) fail(W, "player.carried phải là số nguyên >= 0");
    if (p.flames !== undefined && !(isInt(p.flames) && p.flames >= 0)) fail(W, "player.flames phải là số nguyên >= 0");
  }
  for (const k of ["random_motes", "random_shades"]) {
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
    });
  }
  if (sc.lanterns !== undefined) {
    if (!Array.isArray(sc.lanterns)) fail(W, "lanterns phải là mảng");
    sc.lanterns.forEach((l, i) => {
      if (!isObj(l)) fail(W, `lanterns[${i}] phải là object`);
      if (!LANTERN_IDS.includes(l.id)) fail(W, `lanterns[${i}].id không hợp lệ: ${JSON.stringify(l.id)}`);
      if (l.pos !== undefined && !isVec3(l.pos)) fail(W, `lanterns[${i}].pos phải là [x,y,z] số`);
      if (l.deposited !== undefined && !(isInt(l.deposited) && l.deposited >= 0)) fail(W, `lanterns[${i}].deposited phải là số nguyên >= 0`);
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
    for (const b of ["jump", "interact", "pulse", "dash"]) {
      if (f[b] !== undefined && typeof f[b] !== "boolean") fail(W, `frames[${i}].${b} phải là boolean`);
    }
  });
  return inp;
}
