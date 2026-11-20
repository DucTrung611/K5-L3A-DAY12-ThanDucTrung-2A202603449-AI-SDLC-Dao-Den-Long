// So output JSONL với expect.json (viết tay từ yêu cầu, KHÔNG copy từ output chương trình).
//
// expect.json:
// {
//   "requirement": "R7", "description": "...", "night": 1,
//   "seed": 1, "ticks": 60, "snapshot_every": 10, "exit_code": 0,
//   "expect": {
//     "end": { ...khớp một phần },
//     "events": [ {tick, name, data} ... ]      // phải xuất hiện theo thứ tự (dãy con), data khớp một phần
//     "event_counts": { "deposit": 1 },          // đếm chính xác
//     "absent_events": ["player_hit"],
//     "snapshots": { "60": { ...khớp một phần } },
//     "invariants": ["shades_outside_lit_safe_radius", "wind_pushes_2mps"]
//   }
// }

const EPS = 1e-9;

/** Khớp một phần: object -> mọi khóa của expected phải khớp; mảng -> cùng độ dài, khớp từng phần tử. */
export function partialMatch(actual, expected, path = "$") {
  if (expected === null || typeof expected !== "object") {
    if (typeof expected === "number" && typeof actual === "number") {
      return Math.abs(actual - expected) <= EPS ? [] : [`${path}: mong đợi ${expected}, nhận ${actual}`];
    }
    return actual === expected ? [] : [`${path}: mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${path}: mong đợi mảng, nhận ${JSON.stringify(actual)}`];
    if (actual.length !== expected.length) return [`${path}: mong đợi độ dài ${expected.length}, nhận ${actual.length} (${JSON.stringify(actual)})`];
    return expected.flatMap((e, i) => partialMatch(actual[i], e, `${path}[${i}]`));
  }
  if (actual === null || typeof actual !== "object") return [`${path}: mong đợi object, nhận ${JSON.stringify(actual)}`];
  return Object.keys(expected).flatMap((k) => partialMatch(actual[k], expected[k], `${path}.${k}`));
}

const snapshotAt = (objs, tick) => objs.find((o) => o.type === "snapshot" && o.tick === tick);

const INVARIANTS = {
  shades_outside_lit_safe_radius(objs, tuning) {
    const errs = [];
    for (const o of objs) {
      if (o.type !== "snapshot") continue;
      for (const L of o.lanterns.filter((l) => l.lit)) {
        for (const s of o.shades) {
          const d = Math.hypot(s.pos[0] - L.pos[0], s.pos[2] - L.pos[2]);
          if (d < tuning.safe_radius - 1e-3) errs.push(`tick ${o.tick}: ${s.id} cách ${L.id} ${d.toFixed(3)} < safe_radius`);
        }
      }
    }
    return errs;
  },
  /** Mây kết thúc trên tầng 2 (y = 6, r ≤ 8) ở snapshot cuối. */
  player_on_tier2_at_end(objs) {
    const last = [...objs].reverse().find((o) => o.type === "snapshot");
    const p = last.player.pos;
    return p[1] === 6 && Math.hypot(p[0], p[2]) <= 8 ? [] : [`cuối trận Mây không ở tầng 2: ${JSON.stringify(p)}`];
  },
  /** Cơn gió: dịch chuyển giữa snapshot 1700 và 2100 phải đúng 2 m/s × 5 s theo dir_deg đọc ở snapshot 1800. */
  wind_pushes_2mps(objs) {
    const a = snapshotAt(objs, 1700);
    const mid = snapshotAt(objs, 1800);
    const b = snapshotAt(objs, 2100);
    if (!a || !mid || !b) return ["thiếu snapshot 1700/1800/2100 cho kiểm tra gió"];
    if (!mid.wind.active) return ["tick 1800 gió phải đang thổi"];
    const th = (mid.wind.dir_deg * Math.PI) / 180;
    const ex = a.player.pos[0] + 10 * Math.cos(th);
    const ez = a.player.pos[2] + 10 * Math.sin(th);
    const errs = [];
    if (Math.abs(b.player.pos[0] - ex) > 0.002 || Math.abs(b.player.pos[2] - ez) > 0.002)
      errs.push(`gió: mong đợi (${ex.toFixed(3)}, ${ez.toFixed(3)}), nhận (${b.player.pos[0]}, ${b.player.pos[2]}), dir_deg=${mid.wind.dir_deg}`);
    if (!Number.isInteger(mid.wind.dir_deg) || mid.wind.dir_deg < 0 || mid.wind.dir_deg > 359) errs.push(`dir_deg ngoài [0,360): ${mid.wind.dir_deg}`);
    return errs;
  },
};

export function checkExpect(objs, spec, tuning) {
  const ex = spec.expect || {};
  const errs = [];
  const events = objs.filter((o) => o.type === "event");
  const snaps = new Map(objs.filter((o) => o.type === "snapshot").map((o) => [o.tick, o]));
  const end = objs[objs.length - 1];

  if (ex.end) errs.push(...partialMatch(end, ex.end, "end"));

  if (ex.events) {
    let from = 0;
    for (const e of ex.events) {
      let found = -1;
      for (let i = from; i < events.length; i++) {
        if (partialMatch(events[i], e).length === 0) {
          found = i;
          break;
        }
      }
      if (found < 0) {
        const near = events.filter((x) => x.name === e.name).slice(0, 3);
        errs.push(`không tìm thấy event ${JSON.stringify(e)} (theo thứ tự). Event cùng tên: ${JSON.stringify(near)}`);
      } else from = found + 1;
    }
  }
  if (ex.event_counts) {
    for (const [name, n] of Object.entries(ex.event_counts)) {
      const c = events.filter((e) => e.name === name).length;
      if (c !== n) errs.push(`event_counts.${name}: mong đợi ${n}, nhận ${c}`);
    }
  }
  if (ex.absent_events) {
    for (const name of ex.absent_events) {
      const c = events.filter((e) => e.name === name);
      if (c.length) errs.push(`event ${name} không được xuất hiện, nhưng có ${c.length} (đầu tiên: ${JSON.stringify(c[0])})`);
    }
  }
  if (ex.snapshots) {
    for (const [tick, exp] of Object.entries(ex.snapshots)) {
      const s = snaps.get(Number(tick));
      if (!s) errs.push(`không có snapshot tick ${tick}`);
      else errs.push(...partialMatch(s, exp, `snapshot@${tick}`));
    }
  }
  for (const inv of ex.invariants || []) {
    if (!INVARIANTS[inv]) errs.push(`invariant không tồn tại: ${inv}`);
    else errs.push(...INVARIANTS[inv](objs, tuning));
  }
  return errs;
}
