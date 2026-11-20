// Phần hiển thị 3D. Chỉ ĐỌC trạng thái game (src/sim), không bao giờ thay đổi nó.
// Bảng màu chuẩn của Ticket-02 (sai lệch tối đa 10% mỗi kênh RGB).
// Ticket-03: chế độ "Bảng màu dễ phân biệt" đổi viền/mắt Bóng Mực #7A3CFF -> #00B3FF và màu cảnh báo #FF5A5F -> #FFFFFF.
import * as THREE from "three";
import { MAPS } from "../sim/maps.js";
import { RULES } from "../sim/tuning.js";

export const PAL = {
  sky: 0x0e1430, fog: 0x1b2350,
  grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lampLit: 0xffb347, lampCore: 0xffe9b0, lampOff: 0x5b5f6e,
  moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450,
  robe: 0xe8e2d0, scarf: 0xc8102e,
  yellow: 0xf2c14e, drifter: 0x8fa3b8, danger: 0xff5a5f, text: 0xf5f1e6,
};
export const PAL_ACCESSIBLE = { shadeRim: 0x00b3ff, danger: 0xffffff };
const rad = (d) => (d * Math.PI) / 180;

function glowTexture(inner = "rgba(255,240,170,1)", outer = "rgba(255,180,70,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.5)"));
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function decoRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });

export function createView(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.FogExp2(PAL.fog, 0.014);
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
  const ambient = new THREE.AmbientLight(0xb8c4ff, 0.15);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0x9fb2ff, 0.35);
  moon.position.set(-30, 50, -20);
  scene.add(moon);

  const texLamp = glowTexture();
  const texMote = glowTexture("rgba(255,246,194,1)", "rgba(255,229,138,0)");
  const texShade = glowTexture("rgba(122,60,255,0.9)", "rgba(60,20,120,0)");
  const texShadeA = glowTexture("rgba(0,179,255,0.9)", "rgba(0,60,120,0)"); // bảng màu dễ phân biệt
  let accessible = false;
  const rimColor = () => (accessible ? PAL_ACCESSIBLE.shadeRim : PAL.shadeRim);
  const warnColor = () => (accessible ? PAL_ACCESSIBLE.danger : PAL.danger);
  const texDrift = glowTexture("rgba(143,163,184,0.9)", "rgba(100,120,150,0)");
  const spriteMat = (map, opacity = 1) => new THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity });

  // ---------- thế giới tĩnh theo đêm ----------
  let world = null;
  let current = null;
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  function buildWorld(map) {
    const w = new THREE.Group();
    const grass = std(PAL.grass);
    const sand = std(PAL.sand);
    const wood = std(PAL.wood);
    const rock = std(0x59607e);
    const rnd = decoRng(12 + map.id);

    const island = (cx, cz, r) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 8, 72, 1), [rock, grass, rock]);
      m.position.set(cx, -4, cz);
      w.add(m);
      const shore = new THREE.Mesh(new THREE.RingGeometry(r - 1.4, r, 72), sand);
      shore.rotation.x = -Math.PI / 2;
      shore.position.set(cx, 0.02, cz);
      w.add(shore);
    };
    for (const i of map.islands) island(i.c[0], i.c[1], i.r);

    if (map.id === 2) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), wood);
      bridge.position.set(35, -0.15, 0);
      w.add(bridge);
      for (let x = 26.5; x < 44; x += 1.5) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 4), std(0x4a321f));
        plank.position.set(x, 0.02, 0);
        w.add(plank);
      }
    }
    if (map.id === 3) {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, 0, Math.PI, false);
      shape.absarc(0, 0, 12, Math.PI, 0, true);
      const tier1 = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 40 }), [std(PAL.grass, { side: THREE.DoubleSide }), std(0x3a3f55, { side: THREE.DoubleSide })]);
      tier1.rotation.x = Math.PI / 2;
      tier1.position.y = 3;
      w.add(tier1);
      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), [rock, grass, rock]);
      tier2.position.y = 3;
      w.add(tier2);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 8, 24), std(0x7a6a58));
      tower.position.y = 10;
      w.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 24), std(0x3b2318));
      roof.position.y = 15.1;
      w.add(roof);
      const bell = new THREE.Sprite(spriteMat(texLamp, 0.9));
      bell.scale.set(3.2, 3.2, 1);
      bell.position.y = 13;
      w.add(bell);
      for (const a of [30, 150]) {
        const ramp = new THREE.Group();
        ramp.position.set(27 * Math.cos(rad(a)), 1.5, 27 * Math.sin(rad(a)));
        ramp.rotation.y = -rad(a);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(6, 3), 0.25, 3), wood);
        slab.rotation.z = -Math.atan(0.5);
        slab.position.y = -0.12;
        ramp.add(slab);
        w.add(ramp);
      }
    }
    // bục nhảy
    for (const p of map.pads) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: PAL.lampLit, transparent: true, opacity: 0.75 }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(p.pos[0], p.pos[1] + 0.05, p.pos[2]);
      w.add(disc);
      const halo = new THREE.Sprite(spriteMat(texLamp, 0.7));
      halo.scale.set(3.6, 3.6, 1);
      halo.position.set(p.pos[0], p.pos[1] + 0.6, p.pos[2]);
      w.add(halo);
    }
    // cây và đá ở vành đảo (trang trí, không nằm trên đường chơi)
    const treeGeo = new THREE.ConeGeometry(0.9, 3.2, 7);
    treeGeo.translate(0, 1.6, 0);
    const trees = new THREE.InstancedMesh(treeGeo, std(0x1f3d2c), 110);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (const isl of map.islands) {
      const count = Math.round(110 / map.islands.length);
      for (let i = 0; i < count && n < 110; i++) {
        const a = rnd() * Math.PI * 2;
        const r = isl.r - 5 + rnd() * 3;
        const s = 0.7 + rnd() * 0.8;
        const x = isl.c[0] + Math.cos(a) * r;
        const z = isl.c[1] + Math.sin(a) * r;
        if (map.height(x, z) !== 0) continue;
        m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
        trees.setMatrixAt(n++, m4);
      }
    }
    trees.count = n;
    w.add(trees);
    // biển mây
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: PAL.sea }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -9;
    w.add(sea);
    const cloudMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(120,140,200,0.35)", "rgba(80,100,160,0)"), transparent: true, depthWrite: false });
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Sprite(cloudMat);
      const a = rnd() * Math.PI * 2;
      const r = 70 + rnd() * 120;
      c.position.set(Math.cos(a) * r + (map.id === 2 ? 35 : 0), -6 + rnd() * 3, Math.sin(a) * r);
      c.scale.set(50 + rnd() * 50, 14 + rnd() * 10, 1);
      w.add(c);
    }
    return w;
  }

  // ---------- thực thể động ----------
  const player = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 12), std(PAL.robe, { roughness: 0.8 }));
    body.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), std(0xe8c39b, { roughness: 0.7 }));
    head.position.y = 1.4;
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 16), std(PAL.scarf));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.16;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.36, 24), std(0xd9bf7a));
    hat.position.y = 1.72;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    string.position.set(0.55, 1.42, 0.1);
    const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), new THREE.MeshStandardMaterial({ color: PAL.lampLit, emissive: PAL.lampLit, emissiveIntensity: 2 }));
    mini.position.set(0.55, 1.2, 0.1);
    mini.name = "mini";
    const glow = new THREE.Sprite(spriteMat(texLamp, 1));
    glow.scale.set(1.3, 1.3, 1);
    glow.position.copy(mini.position);
    const light = new THREE.PointLight(PAL.lampLit, 14, 14, 1.6);
    light.position.copy(mini.position);
    light.name = "light";
    player.add(body, head, scarf, hat, string, mini, glow, light);
    scene.add(player);
  }
  // [Sáng tạo] vệt sáng theo chân Mây
  const trail = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(spriteMat(texLamp, 0));
    s.scale.set(0.5, 0.5, 1);
    scene.add(s);
    trail.push(s);
  }
  const trailPos = [];

  const lanternViews = new Map();
  const moteViews = new Map();
  const shadeViews = new Map();
  const drifterViews = new Map();
  const charmViews = new Map();
  const moteMat = spriteMat(texMote, 0.95);
  const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const shadeGeo = new THREE.SphereGeometry(0.75, 18, 14);
  shadeGeo.scale(1, 1.35, 1);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0.45);
  leafShape.quadraticCurveTo(0.4, 0.1, 0, -0.45);
  leafShape.quadraticCurveTo(-0.4, 0.1, 0, 0.45);
  const leafGeo = new THREE.ShapeGeometry(leafShape);

  function makeLantern(L, safeR, cost) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 4, 8), std(PAL.wood));
    post.position.y = 2;
    const paperMat = new THREE.MeshStandardMaterial({ color: PAL.lampOff, emissive: PAL.lampLit, emissiveIntensity: 0, roughness: 0.8 });
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16), paperMat);
    paper.position.y = 4.4;
    // [Ticket-03] đèn tắt: giấy xẹp 20% và có vết rách (phân biệt bằng hình học, không phụ thuộc màu)
    const tearShape = new THREE.Shape();
    tearShape.moveTo(-0.12, 0.38);
    tearShape.lineTo(0.02, 0.2);
    tearShape.lineTo(-0.06, 0.08);
    tearShape.lineTo(0.1, -0.08);
    tearShape.lineTo(0.0, -0.38);
    tearShape.lineTo(0.16, -0.1);
    tearShape.lineTo(0.06, 0.06);
    tearShape.lineTo(0.14, 0.22);
    tearShape.closePath();
    const tears = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.ShapeGeometry(tearShape), new THREE.MeshBasicMaterial({ color: 0x0b0914, side: THREE.DoubleSide }));
      t.position.set(Math.sin((k * Math.PI * 2) / 3) * 0.56, 0, Math.cos((k * Math.PI * 2) / 3) * 0.56);
      t.rotation.y = (k * Math.PI * 2) / 3;
      tears.add(t);
    }
    tears.position.y = 4.4;
    // [Ticket-03] thanh dầu trên đèn đang sáng (luôn quay về phía camera)
    const bar = new THREE.Group();
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.22), new THREE.MeshBasicMaterial({ color: 0x120e22, transparent: true, opacity: 0.85, depthWrite: false }));
    const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), new THREE.MeshBasicMaterial({ color: PAL.lampLit, depthWrite: false }));
    barFill.position.z = 0.005;
    bar.add(barBg, barFill);
    bar.position.y = 5.75;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 16), std(0x3b2318));
    cap.position.y = 5.0;
    const glow = new THREE.Sprite(spriteMat(texLamp, 0));
    glow.scale.set(4.5, 4.5, 1);
    glow.position.y = 4.4;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(safeR, 48), new THREE.MeshBasicMaterial({ map: texLamp, color: PAL.lampLit, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.04;
    const edge = new THREE.Mesh(new THREE.RingGeometry(safeR - 0.12, safeR, 64), new THREE.MeshBasicMaterial({ color: PAL.lampLit, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.05;
    const base = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40), new THREE.MeshBasicMaterial({ color: 0x3a3150, side: THREE.DoubleSide }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.05;
    const progress = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40, 1, Math.PI / 2, 0.0001), new THREE.MeshBasicMaterial({ color: PAL.lampLit, side: THREE.DoubleSide }));
    progress.rotation.x = -Math.PI / 2;
    progress.position.y = 0.06;
    g.add(post, paper, tears, bar, cap, glow, ground, edge, base, progress);
    scene.add(g);
    return { g, paper, tears, bar, barFill, paperMat, glow, ground, edge, base, progress, shown: "", litT: 0, cost };
  }
  function makeShade() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: PAL.shade, emissive: PAL.shadeRim, emissiveIntensity: 0.35, transparent: true, opacity: 0.92, roughness: 0.4 });
    const body = new THREE.Mesh(shadeGeo, mat);
    const eyeMat = new THREE.MeshBasicMaterial({ color: PAL.shadeRim });
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(-0.22, 0.3, 0.65);
    e2.position.set(0.22, 0.3, 0.65);
    const aura = new THREE.Sprite(spriteMat(texShade, 0.6));
    aura.scale.set(3, 3.6, 1);
    g.add(aura, body, e1, e2);
    scene.add(g);
    // [Ticket-03] tia hút dầu nối Bóng Mực (drain) với đèn mục tiêu
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: PAL.shadeRim, transparent: true, opacity: 0.85 }));
    beam.frustumCulled = false;
    beam.visible = false;
    scene.add(beam);
    return { g, mat, eyeMat, aura, beam, cbShown: false, phase: Math.random() * 6 };
  }
  function makeDrifter() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshBasicMaterial({ color: PAL.drifter, transparent: true, opacity: 0.85 }));
    const halo = new THREE.Sprite(spriteMat(texDrift, 0.9));
    halo.scale.set(2.2, 2.2, 1);
    const tail = new THREE.Sprite(spriteMat(texDrift, 0.5));
    tail.scale.set(1.4, 1.4, 1);
    tail.position.z = -0.9;
    g.add(core, halo, tail);
    scene.add(g);
    return { g, core };
  }
  function makeCharm() {
    const g = new THREE.Group();
    const border = new THREE.Mesh(leafGeo, new THREE.MeshBasicMaterial({ color: PAL.yellow, side: THREE.DoubleSide }));
    border.scale.set(1.25, 1.25, 1);
    border.position.z = -0.01;
    const leaf = new THREE.Mesh(leafGeo, new THREE.MeshBasicMaterial({ color: PAL.scarf, side: THREE.DoubleSide }));
    const halo = new THREE.Sprite(spriteMat(texLamp, 0.6));
    halo.scale.set(2.2, 2.2, 1);
    g.add(border, leaf, halo);
    scene.add(g);
    return { g };
  }

  // gió: lá bay
  const leaves = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(90), 3)), new THREE.PointsMaterial({ color: PAL.moteCore, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false }));
  leaves.frustumCulled = false;
  leaves.visible = false;
  scene.add(leaves);
  const leafSeed = Array.from({ length: 30 }, (_, i) => [((i * 37) % 17) / 17, ((i * 53) % 13) / 13, ((i * 29) % 11) / 11]);

  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: PAL.lampCore, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  pulseRing.rotation.x = -Math.PI / 2;
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
  const removeG = (v) => {
    scene.remove(v.g || v);
    if (v.beam) scene.remove(v.beam);
  };

  const tmp = new THREE.Vector3();
  return {
    scene,
    renderer,
    camera,
    /** Dựng thế giới tĩnh cho một đêm (gọi khi bắt đầu đêm). */
    buildNight(night) {
      if (world) {
        scene.remove(world);
        disposeGroup(world);
      }
      for (const m of [lanternViews, moteViews, shadeViews, drifterViews, charmViews]) {
        for (const v of m.values()) removeG(v);
        m.clear();
      }
      current = MAPS[night];
      world = buildWorld(current);
      scene.add(world);
      pulseT = -1;
      trailPos.length = 0;
      cam.yaw = 0;
    },
    pulse() {
      pulseT = 0;
    },
    /** Bảng màu dễ phân biệt (Ticket-03): viền/mắt Bóng Mực #00B3FF, màu cảnh báo #FFFFFF. */
    setAccessible(on) {
      accessible = !!on;
    },
    /** Chiếu một điểm thế giới lên màn hình: {x,y} tính bằng px, visible = nằm trong khung nhìn. */
    project(pos) {
      tmp.set(pos[0], pos[1] + 4, pos[2]).project(camera);
      const behind = tmp.z > 1;
      return { x: ((tmp.x + 1) / 2) * innerWidth, y: ((1 - tmp.y) / 2) * innerHeight, nx: tmp.x, ny: tmp.y, behind, visible: !behind && Math.abs(tmp.x) <= 1 && Math.abs(tmp.y) <= 1 };
    },
    render(g, camYawDeg, dt, time) {
      const P = g.player;
      const T = g.tuning;
      const lit = g.lanterns.filter((L) => L.lit).length;
      ambient.intensity = 0.15 + 0.55 * (lit / g.lanterns.length); // công thức chuẩn của ticket
      const prog = lit / g.lanterns.length;
      scene.fog.density = 0.014 - 0.006 * prog;

      player.position.set(P.pos[0], P.pos[1], P.pos[2]);
      player.rotation.y = Math.atan2(P.facing[0], P.facing[1]);
      player.visible = !(P.fallWait > 0) && !(P.invuln > 0 && Math.floor(time * 12) % 2 === 0);
      player.getObjectByName("mini").material.emissiveIntensity = 1.2 + 0.4 * Math.sin(time * 6) + P.carried * 0.12;
      player.getObjectByName("light").intensity = 8 + P.carried * 1.4;
      // vệt sáng
      trailPos.unshift([P.pos[0], P.pos[1] + 0.6, P.pos[2]]);
      if (trailPos.length > trail.length * 2) trailPos.pop();
      trail.forEach((s, i) => {
        const p = trailPos[Math.min(trailPos.length - 1, i * 2)];
        if (!p || P.fallWait > 0) return void (s.material.opacity = 0);
        s.position.set(p[0], p[1], p[2]);
        s.material.opacity = (P.charm > 0 ? 0.55 : 0.2) * (1 - i / trail.length);
        s.scale.setScalar(0.25 + 0.5 * (1 - i / trail.length));
      });

      syncMap(lanternViews, g.lanterns, (L) => makeLantern(L, T.safe_radius, T.lantern_cost), removeG);
      for (const L of g.lanterns) {
        const v = lanternViews.get(L.id);
        v.g.position.set(L.pos[0], L.pos[1], L.pos[2]);
        v.litT = L.lit ? Math.min(1, v.litT + dt * 1.5) : 0;
        const low = L.lit && L.fuelU < g.fu.low; // fuel < 30: mất vùng an toàn, đèn và thanh dầu nhấp nháy chậm 1 Hz
        const on = !low || Math.floor(time * 2) % 2 === 0;
        const blink = on ? 1 : 0.2;
        const fl = 1 + 0.05 * Math.sin(time * 7 + L.pos[0]);
        v.paperMat.emissiveIntensity = 2.4 * v.litT * fl * blink;
        v.paperMat.color.setHex(L.lit ? PAL.lampCore : PAL.lampOff);
        v.glow.material.opacity = 0.9 * v.litT * blink;
        const zone = L.lit && !low ? v.litT : 0; // chỉ đèn còn vùng an toàn mới vẽ vùng sáng
        v.ground.material.opacity = 0.3 * zone;
        v.edge.material.opacity = 0.55 * zone;
        // đèn tắt: xẹp 20% + vết rách
        v.paper.scale.set(1, L.lit ? 1 : 0.8, 1);
        v.paper.position.y = L.lit ? 4.4 : 4.31;
        v.tears.visible = !L.lit;
        v.tears.scale.y = 0.8;
        // thanh dầu
        v.bar.visible = L.lit && on;
        v.bar.quaternion.copy(camera.quaternion);
        const frac = Math.max(0, Math.min(1, L.fuelU / g.fu.max));
        v.barFill.scale.x = Math.max(0.001, frac);
        v.barFill.position.x = -0.8 * (1 - frac);
        v.barFill.material.color.setHex(low ? warnColor() : PAL.lampLit);
        v.progress.visible = v.base.visible = !L.lit;
        const cost = L.everLit ? T.relight_cost : T.lantern_cost; // thắp lại chỉ cần 5
        const key = L.deposited + "/" + cost;
        if (v.shown !== key) {
          v.shown = key;
          v.progress.geometry.dispose();
          v.progress.geometry = new THREE.RingGeometry(1.1, 1.35, 40, 1, Math.PI / 2, Math.max(0.0001, Math.min(1, L.deposited / cost) * Math.PI * 2));
        }
      }

      syncMap(moteViews, g.motes, () => {
        const s = new THREE.Sprite(moteMat);
        s.scale.set(0.7, 0.7, 1);
        scene.add(s);
        return s;
      }, removeG);
      for (const m of g.motes) {
        const s = moteViews.get(m.id);
        const ph = m.pos[0] * 1.7 + m.pos[2];
        s.position.set(m.pos[0] + Math.sin(time * 0.9 + ph) * 0.15, m.pos[1] + 1.1 + Math.sin(time * 2.2 + ph) * 0.25, m.pos[2] + Math.cos(time * 0.8 + ph) * 0.15);
        s.material = moteMat;
        s.visible = m.kind !== "dropped" || m.ttl > 90 || Math.floor(time * 10) % 2 === 0; // sắp hết TTL thì nhấp nháy
      }

      syncMap(shadeViews, g.shades, makeShade, removeG);
      for (const s of g.shades) {
        const v = shadeViews.get(s.id);
        const stunned = s.state === "stunned";
        const spawning = s.state === "spawning";
        const draining = s.state === "drain";
        const rim = rimColor();
        if (v.cbShown !== accessible) {
          v.cbShown = accessible;
          v.aura.material.map = accessible ? texShadeA : texShade;
          v.aura.material.needsUpdate = true;
          v.beam.material.color.setHex(rim);
          v.mat.emissive.setHex(rim);
        }
        v.g.position.set(s.pos[0], s.pos[1] + Math.sin(time * 2 + v.phase) * 0.12, s.pos[2]);
        v.g.lookAt(P.pos[0], v.g.position.y, P.pos[2]);
        v.mat.color.setHex(stunned ? PAL.shadeStun : PAL.shade);
        v.mat.emissiveIntensity = stunned ? 0.1 : draining ? 0.75 + 0.25 * Math.sin(time * 8) : s.state === "chase" ? 0.6 : 0.35;
        v.mat.opacity = spawning ? 0.25 + 0.6 * (1 - s.left / RULES.shade_spawning_ticks) : stunned ? 0.6 : 0.92;
        v.eyeMat.color.setHex(stunned ? 0x6f6f80 : rim);
        const target = draining ? g.lanterns.find((l) => l.id === s.target) : null;
        v.beam.visible = !!target;
        if (target) {
          const a = v.beam.geometry.attributes.position;
          a.setXYZ(0, s.pos[0], s.pos[1] + 0.4, s.pos[2]);
          a.setXYZ(1, target.pos[0], target.pos[1] + 4.4, target.pos[2]);
          a.needsUpdate = true;
        }
        v.aura.material.opacity = stunned ? 0.15 : 0.5;
        v.g.scale.setScalar(stunned ? 0.8 : spawning ? 0.7 + 0.3 * (1 - s.left / RULES.shade_spawning_ticks) : 1);
      }

      syncMap(drifterViews, g.drifters, makeDrifter, removeG);
      for (const d of g.drifters) {
        const v = drifterViews.get(d.id);
        v.g.position.set(d.pos[0], d.pos[1] + Math.sin(time * 3 + d.pos[0]) * 0.2, d.pos[2]);
        v.g.lookAt(P.pos[0], v.g.position.y, P.pos[2]);
        if (d.state === "flee") v.g.rotation.y += Math.PI;
        v.core.material.opacity = d.state === "flee" ? 0.5 + 0.3 * Math.sin(time * 14) : 0.85;
        v.g.scale.setScalar(d.state === "chase" ? 1.3 : 1);
      }

      syncMap(charmViews, g.charms, makeCharm, removeG);
      for (const c of g.charms) {
        const v = charmViews.get(c.id);
        v.g.position.set(c.pos[0], c.pos[1] + 1.2 + Math.sin(time * 2 + c.pos[0]) * 0.15, c.pos[2]);
        v.g.rotation.y = time * 1.5;
        v.g.visible = c.available;
      }

      // gió: lá bay khi đang thổi hoặc báo trước 2 s
      const sim = g.simTick;
      const warn = g.windEnabled && g.wind.left === 0 && !g.wind.applied && RULES.wind_every_ticks - (sim % RULES.wind_every_ticks) <= 120 && sim > 0;
      const wind = g.wind.applied;
      leaves.visible = wind || warn;
      if (leaves.visible) {
        const dir = wind ? rad(g.wind.dirDeg) : 0;
        const pos = leaves.geometry.attributes.position.array;
        leafSeed.forEach((sd, i) => {
          const u = (time * (wind ? 0.5 : 0.15) + sd[0]) % 1;
          const a = wind ? dir : sd[2] * Math.PI * 2;
          pos[i * 3] = P.pos[0] + (u - 0.5) * 40 * Math.cos(a) - (sd[1] - 0.5) * 30 * Math.sin(a);
          pos[i * 3 + 1] = P.pos[1] + 0.5 + sd[2] * 6 + Math.sin(time * 3 + i) * 0.4;
          pos[i * 3 + 2] = P.pos[2] + (u - 0.5) * 40 * Math.sin(a) + (sd[1] - 0.5) * 30 * Math.cos(a);
        });
        leaves.geometry.attributes.position.needsUpdate = true;
      }

      if (pulseT >= 0) {
        pulseT += dt;
        const k = pulseT / 0.45;
        pulseRing.position.set(P.pos[0], P.pos[1] + 0.2, P.pos[2]);
        pulseRing.scale.setScalar(0.5 + k * T.pulse_radius);
        pulseRing.material.opacity = Math.max(0, 1 - k);
        if (k >= 1) pulseT = -1;
      }

      // camera góc nhìn thứ ba
      const th = (camYawDeg * Math.PI) / 180;
      let d = th - cam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 10);
      const fy = P.fallWait > 0 ? Math.max(P.pos[1], -2) : P.pos[1];
      const target = new THREE.Vector3(P.pos[0] - Math.sin(cam.yaw) * 9, fy + 5.2, P.pos[2] - Math.cos(cam.yaw) * 9);
      cam.pos.lerp(target, Math.min(1, dt * 6));
      camera.position.copy(cam.pos);
      camera.lookAt(P.pos[0], fy + 1.4, P.pos[2]);
      renderer.render(scene, camera);
    },
  };
}
