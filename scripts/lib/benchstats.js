// Công thức chỉ số benchmark của Ticket-04 (dt tính bằng ms). Thuần, có unit test.
const round1 = (x) => Math.round(x * 10) / 10;

/** Phân vị p (0..1) theo hạng gần nhất: giá trị thứ ceil(p*N) của danh sách đã sắp xếp tăng dần. */
export function percentile(values, p) {
  const a = [...values].sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1))];
}

export function benchStats(dts) {
  const N = dts.length;
  if (!N) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: null };
  const sum = dts.reduce((a, b) => a + b, 0);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const topK = [...dts].sort((a, b) => b - a).slice(0, k);
  const meanTop = topK.reduce((a, b) => a + b, 0) / k;
  return {
    frames: N,
    avg_fps: round1((1000 * N) / sum),
    p1_low_fps: round1(1000 / meanTop),
    frame_ms_p95: round1(percentile(dts, 0.95)),
  };
}
