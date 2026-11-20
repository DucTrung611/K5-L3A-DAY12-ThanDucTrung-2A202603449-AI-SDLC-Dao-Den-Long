// [Sáng tạo] "Đảo sáng dần": mỗi đèn được thắp làm sương tan bớt và ánh trời ấm lên.
// Chỉ đọc trạng thái game, chỉ chạy ở client, không ảnh hưởng headless.
import * as THREE from "three";

const NIGHT_BG = new THREE.Color(0x0b0c1d);
const DAWN_BG = new THREE.Color(0x3a2a4a);
const FOG_NIGHT = new THREE.Color(0x1a1236);
const FOG_WARM = new THREE.Color(0x4a3040);

export function createAmbience(view) {
  let k = 0;
  return {
    update(g, dt) {
      const target = g.lanterns.filter((L) => L.lit).length / g.lanterns.length;
      k += (target - k) * Math.min(1, dt * 0.8);
      view.scene.fog.density = 0.03 - 0.016 * k;
      view.scene.fog.color.copy(FOG_NIGHT).lerp(FOG_WARM, k);
      view.scene.background.copy(NIGHT_BG).lerp(DAWN_BG, k * 0.8);
      view.hemi.intensity = 0.55 + 0.6 * k;
    },
  };
}
