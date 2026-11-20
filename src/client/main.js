// Client có giao diện: chạy CÙNG lõi mô phỏng src/sim ở 60 tick/giây cố định, vẽ bằng Three.js.
// Luồng: menu -> giới thiệu Đêm (tên đảo, lời Ông Đăng) -> chơi -> kết quả -> Đêm kế -> Bình Minh (thắng Đêm 3).
// Ticket-03: thắng = sống tới bình minh với đủ đèn sáng. Thua thì chơi lại đúng Đêm đó. Tạm dừng (Esc/P) dừng hẳn logic bằng cơ chế pause của sim.
import { createGame, stepGame } from "../sim/game.js";
import { TUNING, TICK_RATE, RULES } from "../sim/tuning.js";
import { MAPS, NIGHTS } from "../sim/maps.js";
import { createView } from "./scene.js";
import { createHud } from "./hud.js";
import { createControls } from "./input.js";
import { createAudio } from "./audio.js";
import { loadSettings, saveSettings } from "./settings.js";

const $ = (id) => document.getElementById(id);
const DT = 1 / TICK_RATE;
const OVERLAYS = ["menu", "intro", "pause", "settings", "result", "dawn"];

const settings = loadSettings();
const view = createView($("app"));
const hud = createHud(TUNING);
const controls = createControls(view.renderer.domElement, { sensitivity: settings.sensitivity });
const audio = createAudio(settings.volume);
// Ticket-03: bảng màu dễ phân biệt (lưu trạng thái cài đặt)
const applyAccessible = () => {
  document.body.classList.toggle("cb", settings.accessible);
  view.setAccessible(settings.accessible);
};
applyAccessible();

const needLights = (n) => Math.ceil(TUNING.win_ratio * MAPS[n].lanterns.length - 1e-9);
const INTRO = {
  1: `Mây à, sương đen đã nuốt hết ánh sáng của Đảo Bến. Đèn thắp rồi vẫn cạn dầu, con phải châm đom đóm cho đèn. Giữ ít nhất ${needLights(1)}/5 ngọn sáng tới bình minh nhé. Bóng Mực sợ ánh đèn, nhưng đèn yếu thì nó hút dầu đấy.`,
  2: `Đảo Cầu có hai bờ và một nhịp cầu tre không lan can. Đừng lo, bục nhảy sẽ đưa con sang bờ bên kia. Giữ ít nhất ${needLights(2)}/6 đèn sáng tới bình minh. Coi chừng Gió Lạc, nó mê đom đóm lắm.`,
  3: `Đảo Chuông cao ba tầng, gió thổi mạnh lắm. Leo dốc, nhảy lên tháp chuông, giữ ít nhất ${needLights(3)}/7 đèn sáng tới bình minh. Đèn dưới 30 dầu sẽ mất vùng an toàn, đừng để chúng cạn!`,
};
const REASON = {
  dawn_survived: "Bình minh đã tới – đảo vẫn sáng!",
  no_flames: "Mây đã hết Ngọn Lửa.",
  dawn: "Trời sáng mà đảo chưa đủ đèn sáng.",
};

let ui = "menu"; // menu | intro | playing | paused | result | dawn | settings
let settingsFrom = "menu";
let night = 1;
let total = 0;
const wonScores = [];
let game = createGame({ seed: 1, night: 1 });
let acc = 0;
let last = performance.now();
let time = 0;
let lastCountdown = 99;
let windWasOn = false;

view.buildNight(1);

function show(name) {
  for (const id of OVERLAYS) $(id).hidden = id !== name;
}
const randomSeed = () => (Math.random() * 1e6) >>> 0; // chỉ client dùng (sim không bao giờ gọi Math.random)

function beginNight(n, seed = randomSeed(), scenario) {
  night = n;
  game = createGame({ seed, night: n, scenario });
  view.buildNight(n);
  controls.reset();
  hud.show(true);
  show(null);
  acc = 0;
  lastCountdown = 99;
  windWasOn = false;
  ui = "playing";
  audio.unlock();
}
function showIntro(n) {
  night = n;
  ui = "intro";
  hud.show(false);
  view.buildNight(n);
  $("introKicker").textContent = `Đêm ${n} · ${n} / ${NIGHTS.length}`;
  $("introTitle").textContent = MAPS[n].name;
  $("introQuote").textContent = `Ông Đăng: "${INTRO[n]}"`;
  show("intro");
}
function goMenu() {
  ui = "menu";
  hud.show(false);
  total = 0;
  wonScores.length = 0;
  view.buildNight(1);
  game = createGame({ seed: 1, night: 1 });
  show("menu");
}
function rows(el, list) {
  el.textContent = "";
  list.forEach(([a, b, cls], i) => {
    const x = document.createElement("span");
    const y = document.createElement("span");
    x.textContent = a;
    y.textContent = b;
    if (cls) x.className = y.className = cls;
    el.append(x, y);
  });
}
function showResult() {
  const won = game.state === "won";
  const s = game.stats;
  ui = "result";
  hud.show(false);
  if (won) {
    total += game.score;
    wonScores.push(game.score);
  }
  $("resKicker").textContent = `Đêm ${night} · ${MAPS[night].name}`;
  $("resTitle").textContent = won ? "Đảo đã sáng!" : "Sương đen thắng";
  const litNow = game.lanterns.filter((L) => L.lit).length;
  const list = [["Kết quả", REASON[game.reason] || game.reason], ["Đèn sáng lúc bình minh", `${litNow}/${game.lanterns.length} (cần ${needLights(night)})`], ["Đom đóm đã nạp", String(s.deposited)], ["Bóng Mực bị xua", String(s.stunned)]];
  if (s.relit) list.push(["Lần thắp lại", String(s.relit)]);
  if (s.out) list.push(["Đèn đã cạn dầu", String(s.out)]);
  if (s.stolen) list.push(["Bị Gió Lạc cướp", String(s.stolen)]);
  if (won) list.push(["Thưởng đèn bình minh", `+${s.bonusLanterns}`], ["Thưởng Ngọn Lửa", `+${s.bonusFlames}`]);
  list.push(["Điểm đêm này", String(won ? game.score : 0)], ["Tổng điểm", String(total), "total"]);
  rows($("resStats"), list);
  $("btnNext").hidden = !won;
  $("btnNext").textContent = night >= NIGHTS.length ? "Đón bình minh (Enter)" : "Đêm kế tiếp (Enter)";
  show("result");
  audio.play(won ? "won" : "lost");
  (won ? $("btnNext") : $("btnAgain")).focus();
}
function showDawn() {
  ui = "dawn";
  rows($("dawnStats"), [...wonScores.map((s, i) => [`Đêm ${i + 1} · ${MAPS[i + 1].name}`, String(s)]), ["Tổng điểm", String(total), "total"]]);
  show("dawn");
  $("btnDawnMenu").focus();
}
function nextNight() {
  if (night >= NIGHTS.length) showDawn();
  else showIntro(night + 1);
}
function togglePause() {
  if (ui === "playing") {
    stepGame(game, (inp) => (inp.pause = true)); // sim chuyển sang "paused": logic dừng hẳn
    ui = "paused";
    show("pause");
  } else if (ui === "paused") {
    stepGame(game, (inp) => (inp.pause = false)); // nhả nút (đang dừng nên bước bị bỏ)
    handleEvents(stepGame(game, (inp) => (inp.pause = true))); // cạnh lên -> resumed
    ui = "playing";
    show(null);
  }
}
controls.onPause(togglePause);

function handleEvents(events) {
  for (const e of events) {
    audio.play(e.name);
    if (e.name === "pulse") view.pulse();
    else if (e.name === "lantern_lit") hud.toast(e.data.relight ? `Đèn ${e.data.lantern_id} đã thắp lại!` : `Đèn ${e.data.lantern_id} đã sáng!`);
    else if (e.name === "refuel") hud.toast(`Châm dầu đèn ${e.data.lantern_id}: ${Math.floor(e.data.fuel)}/${TUNING.fuel_max}`, 1400);
    else if (e.name === "lantern_out") hud.toast(`Đèn ${e.data.lantern_id} đã cạn dầu! Nạp ${TUNING.relight_cost} đom đóm để thắp lại`, 2400);
    else if (e.name === "fuel_drain") hud.toast(`Bóng Mực đang hút dầu đèn ${e.data.lantern_id} (${Math.floor(e.data.fuel)})!`, 1800);
    else if (e.name === "player_hit") {
      hud.flash();
      if (e.data.by === "fall") hud.toast(`Mây rơi khỏi đảo! (mất ${e.data.lost} đom đóm)`, 2200);
    } else if (e.name === "shade_spawned") hud.toast("Một Bóng Mực trồi lên từ sương…", 1400);
    else if (e.name === "charm_picked") hud.toast("Bùa Gió: chạy 7.2 m/s, lướt không hồi chiêu!", 2200);
    else if (e.name === "drifter_steal") {
      hud.flash();
      hud.toast(`Gió Lạc cướp ${e.data.amount} đom đóm! Tỏa sáng để đòi lại`, 2200);
    } else if (e.name === "drifter_drop") hud.toast(`Gió Lạc làm rơi ${e.data.amount} đom đóm – nhặt lại đi!`, 2000);
  }
}

// ---- nút bấm ----
$("btnPlay").addEventListener("click", () => {
  audio.unlock();
  total = 0;
  wonScores.length = 0;
  showIntro(1);
});
$("btnGo").addEventListener("click", () => beginNight(night));
$("btnResume").addEventListener("click", togglePause);
$("btnRetry").addEventListener("click", () => beginNight(night));
$("btnToMenu").addEventListener("click", goMenu);
$("btnAgain").addEventListener("click", () => beginNight(night));
$("btnNext").addEventListener("click", nextNight);
$("btnDawnMenu").addEventListener("click", goMenu);
const openSettings = (from) => {
  settingsFrom = from;
  ui = "settings";
  show("settings");
};
$("btnSettings").addEventListener("click", () => openSettings("menu"));
$("btnPauseSettings").addEventListener("click", () => openSettings("pause"));
$("cb").addEventListener("change", () => {
  settings.accessible = $("cb").checked;
  saveSettings(settings);
  applyAccessible();
  $("cbVal").textContent = settings.accessible ? "Bật" : "Tắt";
});
$("cb").checked = settings.accessible;
$("cbVal").textContent = settings.accessible ? "Bật" : "Tắt";
$("btnBack").addEventListener("click", () => {
  if (settingsFrom === "pause") {
    ui = "paused";
    show("pause");
  } else {
    ui = "menu";
    show("menu");
  }
});
{
  const vol = $("volume");
  const sens = $("sens");
  vol.value = settings.volume;
  sens.value = settings.sensitivity;
  const refresh = () => {
    $("volumeVal").textContent = `${Math.round(settings.volume * 100)}%`;
    $("sensVal").textContent = `×${settings.sensitivity.toFixed(1)}`;
  };
  refresh();
  vol.addEventListener("input", () => {
    settings.volume = Number(vol.value);
    audio.setVolume(settings.volume);
    saveSettings(settings);
    refresh();
  });
  sens.addEventListener("input", () => {
    settings.sensitivity = Number(sens.value);
    controls.setSensitivity(settings.sensitivity);
    saveSettings(settings);
    refresh();
  });
}
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Enter") {
    if (ui === "menu") $("btnPlay").click();
    else if (ui === "intro") $("btnGo").click();
    else if (ui === "result" && game.state === "won") $("btnNext").click();
    else if (ui === "dawn") goMenu();
  } else if (e.code === "KeyR" && ui === "result") $("btnAgain").click();
});

// ---- vòng lặp ----
const fpsSamples = [];
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  fpsSamples.push(dt);
  if (fpsSamples.length > 120) fpsSamples.shift();
  window.__fps = fpsSamples.length / fpsSamples.reduce((a, b) => a + b, 0);

  if (ui === "playing") {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 8) {
      const P = game.player;
      const wasGrounded = P.grounded;
      handleEvents(stepGame(game, controls.tick(DT)));
      if (wasGrounded && !P.grounded && P.vel[1] > 0) audio.play(P.launch ? "dash" : "jump");
      acc -= DT;
      n++;
      if (game.state === "won" || game.state === "lost") {
        showResult();
        break;
      }
    }
    // đếm ngược 10 s cuối, gió
    const sec = Math.ceil(game.timeLeft - 1e-9);
    if (sec <= 10 && sec > 0 && sec !== lastCountdown) {
      audio.play("countdown");
      lastCountdown = sec;
    }
    if (game.wind.applied && !windWasOn) audio.play("wind");
    windWasOn = game.wind.applied;
    hud.update(game, view, time);
    const warn = game.windEnabled && !game.wind.applied && game.simTick > 0 && RULES.wind_every_ticks - (game.simTick % RULES.wind_every_ticks) <= 120;
    $("windWarn").hidden = !warn;
    $("windWarn").textContent = game.wind.applied ? "Gió mạnh đang thổi!" : "Gió sắp nổi – bám chắc!";
    if (game.wind.applied) $("windWarn").hidden = false;
  }
  const yaw = ui === "playing" || ui === "paused" ? controls.camYawDeg : (time * 8) % 360;
  view.render(game, yaw, dt, time);
  requestAnimationFrame(frame);
}
show("menu");
requestAnimationFrame(frame);

// Móc phục vụ kiểm chứng tự động (Playwright: chụp ảnh, đo FPS). Không ảnh hưởng gameplay.
window.__ddl = {
  beginNight,
  showIntro,
  togglePause,
  get ui() {
    return ui;
  },
  get game() {
    return game;
  },
  get total() {
    return total;
  },
  step(n = 1, apply) {
    for (let i = 0; i < n && game.state !== "won" && game.state !== "lost"; i++) handleEvents(stepGame(game, apply));
    if (ui === "playing") hud.update(game, view, time);
    if ((game.state === "won" || game.state === "lost") && ui === "playing") showResult();
  },
};
