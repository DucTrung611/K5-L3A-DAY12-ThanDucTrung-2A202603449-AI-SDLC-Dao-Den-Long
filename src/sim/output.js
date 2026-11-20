// Ghi dòng JSONL theo Test Contract v1.0 mục E. Tọa độ và số thực làm tròn 3 chữ số thập phân.

export const r3 = (v) => {
  const x = Math.round(v * 1000) / 1000;
  return Object.is(x, -0) ? 0 : x;
};
const v3 = (p) => [r3(p[0]), r3(p[1]), r3(p[2])];

export function snapshotLine(s) {
  return JSON.stringify({
    type: "snapshot",
    tick: s.tick,
    sim_tick: s.sim_tick,
    state: s.state,
    time_left_s: r3(s.time_left_s),
    score: s.score,
    player: { pos: v3(s.player.pos), flames: s.player.flames, carried: s.player.carried },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((x) => ({ id: x.id, pos: v3(x.pos), state: x.state })),
    motes_active: s.motes_active,
    motes: s.motes.map((m) => ({ id: m.id, pos: v3(m.pos) })),
  });
}

export function eventLine(e) {
  return JSON.stringify({ type: "event", tick: e.tick, name: e.name, data: e.data });
}

export function endLine(g) {
  return JSON.stringify({ type: "end", ticks: g.tick, state: g.state, score: g.score });
}
