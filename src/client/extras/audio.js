// [Sáng tạo] Âm thanh tổng hợp bằng WebAudio (không dùng file asset). Chỉ chạy ở client, không ảnh hưởng headless.
export function createAudio() {
  let ctx = null;
  let master = null;
  let on = true;
  const ensure = () => {
    if (ctx) return;
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  };
  const tone = (f, d, type = "sine", v = 0.2, slide = 1, delay = 0) => {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + d + 0.05);
  };
  const SFX = {
    mote_picked: () => tone(880 + Math.random() * 300, 0.18, "sine", 0.12, 1.5),
    deposit: () => tone(523, 0.25, "triangle", 0.16, 1.2),
    lantern_lit: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.7, "triangle", 0.14, 1, i * 0.09)),
    pulse: () => tone(300, 0.5, "sawtooth", 0.08, 3),
    player_hit: () => tone(140, 0.45, "square", 0.12, 0.5),
    shade_spawned: () => tone(90, 0.9, "sine", 0.1, 0.7),
    won: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 1, "triangle", 0.15, 1, i * 0.14)),
    lost: () => [392, 330, 262].forEach((f, i) => tone(f, 0.8, "sine", 0.13, 1, i * 0.2)),
  };
  return {
    unlock() {
      ensure();
      if (ctx?.state === "suspended") ctx.resume();
    },
    toggle() {
      on = !on;
      return on;
    },
    play(name) {
      SFX[name]?.();
    },
  };
}
