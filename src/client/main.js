// Client có giao diện: chạy CÙNG lõi mô phỏng src/sim ở 60 tick/giây cố định, vẽ bằng Three.js.
import { createGame, stepGame } from "../sim/game.js";
import { TUNING, TICK_RATE } from "../sim/tuning.js";
import { createView } from "./scene.js";
import { createHud } from "./hud.js";
import { createControls } from "./input.js";
import { createAudio } from "./extras/audio.js";
import { createAmbience } from "./extras/ambience.js";

const $ = (id) => document.getElementById(id);
const DT = 1 / TICK_RATE;

const view = createView($("app"), TUNING);
const hud = createHud(TUNING);
const controls = createControls(view.renderer.domElement);
const audio = createAudio();
const ambience = createAmbience(view);

let game = createGame({ seed: 1 });
let mode = "title"; // title | playing | ended
let acc = 0;
let last = performance.now();
let time = 0;

const REASON = {
  all_lit: "Năm Đèn Lồng Lớn đã sáng – bình minh trở lại với Đảo Bến!",
  no_flames: "Mây đã hết Ngọn Lửa. Bóng Mực phủ kín đảo.",
  dawn: "Trời đã sáng mà đảo vẫn còn đèn tắt.",
};

function startGame(seed = (Date.now() >>> 0) % 1000000, scenario) {
  game = createGame({ seed, scenario });
  view.reset();
  controls.reset();
  mode = "playing";
  acc = 0;
  $("startScreen").hidden = true;
  $("endScreen").hidden = true;
  hud.show(true);
  audio.unlock();
  hud.toast("Đêm 1 – Đảo Bến: thắp lại 5 Đèn Lồng Lớn!", 2600);
}

function showEnd() {
  mode = "ended";
  const won = game.state === "won";
  $("endKicker").textContent = won ? "Bình minh" : "Đêm vẫn còn dài";
  $("endTitle").textContent = won ? "Đảo đã sáng!" : "Sương đen thắng";
  const s = game.stats;
  const rows = [
    ["Kết quả", REASON[game.reason] || game.reason],
    ["Đèn đã thắp", `${game.lanterns.filter((L) => L.lit).length}/${game.lanterns.length}`],
    ["Đom đóm đã nhặt", String(s.picked)],
    ["Bóng Mực bị xua", String(s.stunned)],
  ];
  if (won) rows.push(["Thưởng thời gian", `+${s.bonusTime}`], ["Thưởng Ngọn Lửa", `+${s.bonusFlames}`]);
  rows.push(["Tổng điểm", String(game.score)]);
  const el = $("endStats");
  el.textContent = "";
  rows.forEach(([a, b], i) => {
    const x = document.createElement("span");
    const y = document.createElement("span");
    x.textContent = a;
    y.textContent = b;
    if (i === rows.length - 1) x.className = y.className = "total";
    el.append(x, y);
  });
  $("endScreen").hidden = false;
  audio.play(won ? "won" : "lost");
  $("btnReplay").focus();
}

function handleEvents(events) {
  for (const e of events) {
    audio.play(e.name);
    if (e.name === "pulse") view.pulse();
    if (e.name === "lantern_lit") hud.toast(`Đèn ${e.data.lantern_id} đã sáng!`);
    if (e.name === "player_hit") hud.flash();
    if (e.name === "shade_spawned") hud.toast("Một Bóng Mực trồi lên từ sương…", 1400);
  }
}

$("btnStart").addEventListener("click", () => startGame());
$("btnReplay").addEventListener("click", () => startGame());
addEventListener("keydown", (e) => {
  if (e.code === "Enter" && mode === "title") startGame();
  else if (e.code === "KeyR" && mode === "ended") startGame();
  else if (e.code === "KeyM") {
    const on = audio.toggle();
    $("soundHint").innerHTML = `Âm thanh: ${on ? "bật" : "tắt"} · <kbd>M</kbd> ${on ? "tắt" : "bật"}`;
  }
});

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  if (mode === "playing") {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 8) {
      handleEvents(stepGame(game, controls.tick(DT)));
      acc -= DT;
      n++;
      if (game.state !== "playing") {
        showEnd();
        break;
      }
    }
    hud.update(game);
  } else if (mode === "title") {
    controls.tick(dt); // cho phép xoay camera ngắm đảo ở màn hình tiêu đề
  }
  ambience.update(game, dt);
  view.render(game, controls.camYawDeg, dt, time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Móc phục vụ kiểm chứng tự động (chụp ảnh HUD/thắng/thua bằng Playwright). Không ảnh hưởng gameplay.
window.__ddl = {
  startGame,
  get game() {
    return game;
  },
  step(n = 1, apply) {
    for (let i = 0; i < n && game.state === "playing"; i++) handleEvents(stepGame(game, apply));
    hud.update(game);
    if (game.state !== "playing" && mode === "playing") showEnd();
  },
};
