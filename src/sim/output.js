// Ghi dòng JSONL theo Test Contract v1.1 mục E. Tọa độ và số thực làm tròn 3 chữ số thập phân.

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
    night: s.night,
    time_left_s: r3(s.time_left_s),
    score: s.score,
    wind: s.wind,
    player: {
      pos: v3(s.player.pos),
      vel: v3(s.player.vel),
      grounded: s.player.grounded,
      flames: s.player.flames,
      carried: s.player.carried,
      invuln: s.player.invuln,
      dash_cd_s: r3(s.player.dash_cd_s),
      pulse_cd_s: r3(s.player.pulse_cd_s),
      charm_s: r3(s.player.charm_s),
    },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((x) => ({ id: x.id, pos: v3(x.pos), state: x.state })),
    motes_active: s.motes_active,
    motes: s.motes.map((m) => ({ id: m.id, pos: v3(m.pos), kind: m.kind, ttl_s: m.ttl_s === null ? null : r3(m.ttl_s) })),
    drifters: s.drifters.map((d) => ({ id: d.id, pos: v3(d.pos), state: d.state, stolen: d.stolen })),
    charms: s.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: r3(c.respawn_s) })),
  });
}

export function eventLine(e) {
  return JSON.stringify({ type: "event", tick: e.tick, name: e.name, data: e.data });
}

/** Dòng cuối. Đang tạm dừng khi kết thúc thì ghi "playing" (state của dòng end chỉ gồm playing/won/lost). */
export function endLine(g) {
  const state = g.state === "paused" ? "playing" : g.state;
  return JSON.stringify({ type: "end", ticks: g.tick, state, score: g.score });
}
