// Phần hiển thị 3D. Chỉ ĐỌC trạng thái game (src/sim), không bao giờ thay đổi nó.
import * as THREE from "three";
import { WORLD } from "../sim/tuning.js";

const AMBER = 0xffb347;
const INK = 0x2a1840;

function glowTexture(inner = "rgba(255,240,170,1)", outer = "rgba(255,180,70,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.55)"));
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// PRNG cố định chỉ để rải trang trí (không liên quan mô phỏng)
function decoRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function createView(container, tuning) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c1d);
  scene.fog = new THREE.FogExp2(0x1a1236, 0.03);
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);

  const hemi = new THREE.HemisphereLight(0x5a5fa8, 0x1a1028, 0.55);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb2ff, 0.35);
  moon.position.set(-30, 50, -20);
  scene.add(moon);

  // --- đảo ---
  const R = WORLD.island_radius;
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 1.5, R - 4, 6, 72, 1),
    new THREE.MeshStandardMaterial({ color: 0x2c4a3a, roughness: 1 }),
  );
  island.position.y = -3;
  scene.add(island);
  const shore = new THREE.Mesh(new THREE.RingGeometry(R - 1, R + 1.5, 72), new THREE.MeshStandardMaterial({ color: 0x6b5d45, roughness: 1 }));
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.01;
  scene.add(shore);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ color: 0x23284f, roughness: 0.6, emissive: 0x0a0c22 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -5;
  scene.add(sea);

  // trang trí: cây, đá (cố định, chỉ hiển thị)
  const rnd = decoRng(12);
  const treeGeo = new THREE.ConeGeometry(0.9, 3.2, 7);
  treeGeo.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x1f3d2c, roughness: 1 }), 90);
  const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x4b4a58, roughness: 1, flatShading: true }), 60);
  const m4 = new THREE.Matrix4();
  const place = (mesh, n, rMin, rMax, sMin, sMax) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rMin + rnd() * (rMax - rMin);
      const s = sMin + rnd() * (sMax - sMin);
      m4.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m4);
    }
    scene.add(mesh);
  };
  place(trees, 90, 30, R - 1, 0.7, 1.4);
  place(rocks, 60, 6, R - 2, 0.5, 1.6);

  // --- Mây: áo, đầu, nón lá, đèn lồng nhỏ treo ở vành nón ---
  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x5b7fa6, roughness: 0.8 }));
  body.position.y = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8c39b, roughness: 0.7 }));
  head.position.y = 1.4;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.36, 24), new THREE.MeshStandardMaterial({ color: 0xd9bf7a, roughness: 0.9 }));
  hat.position.y = 1.72;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  string.position.set(0.55, 1.42, 0.1);
  const miniLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: AMBER, emissiveIntensity: 2 }));
  miniLantern.position.set(0.55, 1.2, 0.1);
  const playerLight = new THREE.PointLight(AMBER, 18, 14, 1.6);
  playerLight.position.set(0.55, 1.3, 0.1);
  const playerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  playerGlow.scale.set(1.2, 1.2, 1);
  playerGlow.position.copy(miniLantern.position);
  player.add(body, head, hat, string, miniLantern, playerLight, playerGlow);
  scene.add(player);

  // --- Đèn Lồng Lớn ---
  const lanternViews = new Map();
  const ringMat = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  function makeLantern(L) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
    post.position.y = 2;
    const paperMat = new THREE.MeshStandardMaterial({ color: 0x6d6a80, emissive: AMBER, emissiveIntensity: 0, roughness: 0.8 });
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16), paperMat);
    paper.position.y = 4.4;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 16), new THREE.MeshStandardMaterial({ color: 0x3b2318 }));
    cap.position.y = 5.0;
    const light = new THREE.PointLight(AMBER, 0, 26, 1.4);
    light.position.y = 4.4;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    glow.scale.set(4, 4, 1);
    glow.position.y = 4.4;
    const safe = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.15, tuning.safe_radius, 64), ringMat.clone());
    safe.rotation.x = -Math.PI / 2;
    safe.position.y = 0.03;
    const progress = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40, 1, 0, 0.0001), new THREE.MeshBasicMaterial({ color: AMBER, side: THREE.DoubleSide }));
    progress.rotation.x = -Math.PI / 2;
    progress.position.y = 0.04;
    const base = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40), new THREE.MeshBasicMaterial({ color: 0x3a3150, side: THREE.DoubleSide }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.035;
    g.add(post, paper, cap, light, glow, safe, progress, base);
    scene.add(g);
    return { g, paperMat, light, glow, safe, progress, base, shownDeposited: -1, litT: 0 };
  }

  // --- đom đóm ---
  const moteTex = glowTexture("rgba(240,255,170,1)", "rgba(200,255,120,0)");
  const moteMat = new THREE.SpriteMaterial({ map: moteTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const moteViews = new Map();

  // --- Bóng Mực ---
  const shadeViews = new Map();
  const shadeBodyGeo = new THREE.SphereGeometry(0.75, 18, 14);
  shadeBodyGeo.scale(1, 1.35, 1);
  const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  function makeShade() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: INK, emissive: 0x3b1466, emissiveIntensity: 0.6, transparent: true, opacity: 0.88, roughness: 0.4 });
    const bodyM = new THREE.Mesh(shadeBodyGeo, mat);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b8ff });
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(-0.22, 0.3, 0.65);
    e2.position.set(0.22, 0.3, 0.65);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(120,60,200,0.9)", "rgba(60,20,120,0)"), transparent: true, depthWrite: false, opacity: 0.6 }));
    aura.scale.set(3, 3.6, 1);
    g.add(aura, bodyM, e1, e2);
    scene.add(g);
    return { g, mat, eyeMat, phase: Math.random() * 6 };
  }

  // --- hiệu ứng pulse ---
  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.2;
  scene.add(pulseRing);
  let pulseT = -1;

  const cam = { yaw: 0, pos: new THREE.Vector3(0, 6, -10) };

  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  function syncMap(map, items, make, dispose) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.id);
      if (!map.has(it.id)) map.set(it.id, make(it));
    }
    for (const [id, v] of map) {
      if (!seen.has(id)) {
        dispose(v);
        map.delete(id);
      }
    }
  }

  return {
    scene,
    hemi,
    renderer,
    reset() {
      for (const v of lanternViews.values()) scene.remove(v.g);
      lanternViews.clear();
      for (const v of moteViews.values()) scene.remove(v);
      moteViews.clear();
      for (const v of shadeViews.values()) scene.remove(v.g);
      shadeViews.clear();
      pulseT = -1;
    },
    pulse() {
      pulseT = 0;
    },
    /** Đồng bộ mesh theo trạng thái game rồi vẽ. */
    render(g, camYawDeg, dt, time) {
      const P = g.player;
      player.position.set(P.pos[0], P.pos[1], P.pos[2]);
      player.rotation.y = P.facing;
      player.visible = !(P.invulnTicks > 0 && Math.floor(time * 12) % 2 === 0);
      miniLantern.material.emissiveIntensity = 1.2 + 0.4 * Math.sin(time * 6) + P.carried * 0.12;
      playerLight.intensity = 10 + P.carried * 1.6;

      syncMap(lanternViews, g.lanterns, makeLantern, (v) => scene.remove(v.g));
      for (const L of g.lanterns) {
        const v = lanternViews.get(L.id);
        v.g.position.set(L.pos[0], L.pos[1], L.pos[2]);
        v.litT = L.lit ? Math.min(1, v.litT + dt * 1.5) : 0;
        const fl = 1 + 0.05 * Math.sin(time * 7 + L.pos[0]);
        v.paperMat.emissiveIntensity = 2.4 * v.litT * fl;
        v.paperMat.color.setHex(L.lit ? 0xffe0a0 : 0x6d6a80);
        v.light.intensity = 90 * v.litT * fl;
        v.glow.material.opacity = 0.9 * v.litT;
        v.safe.material.opacity = 0.35 * v.litT;
        v.progress.visible = v.base.visible = !L.lit;
        if (v.shownDeposited !== L.deposited) {
          v.shownDeposited = L.deposited;
          v.progress.geometry.dispose();
          v.progress.geometry = new THREE.RingGeometry(1.1, 1.35, 40, 1, Math.PI / 2, Math.max(0.0001, (L.deposited / g.tuning.lantern_cost) * Math.PI * 2));
        }
      }

      syncMap(moteViews, g.motes, () => {
        const s = new THREE.Sprite(moteMat);
        s.scale.set(0.7, 0.7, 1);
        scene.add(s);
        return s;
      }, (s) => scene.remove(s));
      for (const m of g.motes) {
        const s = moteViews.get(m.id);
        const ph = m.pos[0] * 1.7 + m.pos[2];
        s.position.set(m.pos[0] + Math.sin(time * 0.9 + ph) * 0.15, 1.1 + Math.sin(time * 2.2 + ph) * 0.25, m.pos[2] + Math.cos(time * 0.8 + ph) * 0.15);
      }

      syncMap(shadeViews, g.shades, makeShade, (v) => scene.remove(v.g));
      for (const s of g.shades) {
        const v = shadeViews.get(s.id);
        const stunned = s.state === "stunned";
        v.g.position.set(s.pos[0], Math.max(1.0, s.pos[1]) + Math.sin(time * 2 + v.phase) * 0.15, s.pos[2]);
        v.g.lookAt(P.pos[0], v.g.position.y, P.pos[2]);
        v.mat.color.setHex(stunned ? 0x8f86a8 : INK);
        v.mat.opacity = stunned ? 0.5 : 0.88;
        v.eyeMat.color.setHex(stunned ? 0x6f6f80 : 0xd9b8ff);
        v.g.scale.setScalar(stunned ? 0.8 : 1);
      }

      if (pulseT >= 0) {
        pulseT += dt;
        const k = pulseT / 0.45;
        pulseRing.position.set(P.pos[0], 0.2, P.pos[2]);
        pulseRing.scale.setScalar(0.5 + k * g.tuning.pulse_radius);
        pulseRing.material.opacity = Math.max(0, 1 - k);
        if (k >= 1) pulseT = -1;
      }

      // camera góc nhìn thứ ba phía sau theo cam_yaw
      const th = (camYawDeg * Math.PI) / 180;
      let d = th - cam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 10);
      const target = new THREE.Vector3(P.pos[0] - Math.sin(cam.yaw) * 9, P.pos[1] + 5.2, P.pos[2] - Math.cos(cam.yaw) * 9);
      cam.pos.lerp(target, Math.min(1, dt * 6));
      camera.position.copy(cam.pos);
      camera.lookAt(P.pos[0], P.pos[1] + 1.4, P.pos[2]);

      renderer.render(scene, camera);
    },
  };
}
