// So output JSONL với expect.json (viết tay từ yêu cầu, KHÔNG copy từ output chương trình).
//
// expect.json:
// {
//   "requirement": "R7", "description": "...",
//   "seed": 1, "ticks": 60, "snapshot_every": 10, "exit_code": 0,
//   "expect": {
//     "end": { ...khớp một phần },
//     "events": [ {tick, name, data} ... ]      // phải xuất hiện theo thứ tự (dãy con), data khớp một phần
//     "event_counts": { "deposit": 1 },          // đếm chính xác
//     "absent_events": ["player_hit"],
//     "snapshots": { "60": { ...khớp một phần } },
//     "invariants": ["shades_outside_lit_safe_radius"]
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
  player_inside_island(objs) {
    return objs
      .filter((o) => o.type === "snapshot" && Math.hypot(o.player.pos[0], o.player.pos[2]) > 40 + 1e-3)
      .map((o) => `tick ${o.tick}: người chơi ra ngoài đảo`);
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
