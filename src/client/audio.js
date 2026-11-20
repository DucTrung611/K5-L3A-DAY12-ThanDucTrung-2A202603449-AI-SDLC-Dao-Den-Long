// Âm thanh tổng hợp bằng WebAudio (không dùng file asset): nhạc nền đêm + hiệu ứng cho
// nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối.
export function createAudio(initialVolume = 0.6) {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let volume = initialVolume;
  let musicNodes = [];

  const ensure = () => {
    if (ctx) return;
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      startMusic();
    } catch {
      ctx = null;
    }
  };
  function startMusic() {
    // hợp âm pad chậm (La thứ) với LFO nhẹ: nền đêm ấm
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.07;
    musicGain.connect(master);
    [110, 164.81, 220, 261.63, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = 0.05 + i * 0.027;
      lg.gain.value = 6;
      l.connect(lg);
      lg.connect(o.detune);
      o.connect(musicGain);
      o.start();
      l.start();
      musicNodes.push(o, l);
    });
  }
  const tone = (f, d, type = "sine", v = 0.2, slide = 1, delay = 0) => {
    if (!ctx || volume <= 0) return;
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
    mote_picked: () => tone(880 + (performance.now() % 7) * 40, 0.18, "sine", 0.12, 1.5),
    deposit: () => tone(523, 0.25, "triangle", 0.16, 1.2),
    lantern_lit: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.7, "triangle", 0.14, 1, i * 0.09)),
    pulse: () => tone(300, 0.5, "sawtooth", 0.08, 3),
    player_hit: () => tone(140, 0.45, "square", 0.12, 0.5),
    shade_spawned: () => tone(90, 0.9, "sine", 0.1, 0.7),
    jump: () => tone(330, 0.16, "sine", 0.1, 1.8),
    dash: () => tone(220, 0.2, "sawtooth", 0.07, 2.4),
    charm_picked: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, 1, i * 0.07)),
    drifter_steal: () => tone(520, 0.4, "square", 0.08, 0.4),
    countdown: () => tone(1000, 0.08, "square", 0.08),
    wind: () => tone(180, 1.2, "sawtooth", 0.04, 1.6),
    won: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 1, "triangle", 0.15, 1, i * 0.14)),
    lost: () => [392, 330, 262].forEach((f, i) => tone(f, 0.8, "sine", 0.13, 1, i * 0.2)),
  };
  return {
    unlock() {
      ensure();
      if (ctx?.state === "suspended") ctx.resume();
    },
    setVolume(v) {
      volume = v;
      if (master) master.gain.value = v;
    },
    play(name) {
      SFX[name]?.();
    },
  };
}
