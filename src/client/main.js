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
import { ACTIONS, DEFAULT_KEYS, keyLabel, findConflict, actionName, RESERVED } from "./keymap.js";
import { loadBoard, saveEntry, boardQualifies, isoWithOffset } from "./leaderboard.js";
import { nameError } from "../sim/leaderboard.js";

const $ = (id) => document.getElementById(id);
const DT = 1 / TICK_RATE;
const OVERLAYS = ["menu", "intro", "pause", "settings", "keys", "board", "result", "dawn"];

const settings = loadSettings();
const view = createView($("app"));
const hud = createHud(TUNING);
const controls = createControls(view.renderer.domElement, { sensitivity: settings.sensitivity, keys: settings.keys });
const audio = createAudio(settings.volume);
// Ticket-03: bảng màu dễ phân biệt (lưu trạng thái cài đặt)
const applyAccessible = () => {
  document.body.classList.toggle("cb", settings.accessible);
  view.setAccessible(settings.accessible);
};
applyAccessible();
// Ticket-04: giảm chuyển động, chữ lớn, phụ đề
const applyA11y = () => {
  document.documentElement.classList.toggle("bigtext", settings.bigText);
  document.documentElement.classList.toggle("calm", settings.reduceMotion);
  hud.setReduceMotion(settings.reduceMotion);
  hud.setSubtitles(settings.subtitles);
};
hud.setKeyLabel((a) => keyLabel(settings.keys[a]));
applyA11y();

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
let lastSeed = 1;
let recentShade = null; // { id, until } – mũi tên chỉ hướng Bóng Mực vừa xuất hiện
let windWarnWas = false;
const lowSeen = new Set();
let windWasOn = false;

view.buildNight(1);

function show(name) {
  for (const id of OVERLAYS) $(id).hidden = id !== name;
}
const randomSeed = () => (Math.random() * 1e6) >>> 0; // chỉ client dùng (sim không bao giờ gọi Math.random)

function beginNight(n, seed = randomSeed(), scenario) {
  night = n;
  lastSeed = seed;
  recentShade = null;
  windWarnWas = false;
  lowSeen.clear();
  hud.clearCues();
  $("shadeArrow").hidden = true;
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
  // Ticket-04: thua ở bất kỳ Đêm nào cũng được nhập tên lưu điểm (thắng Đêm 1–2 thì đợi tới hết lượt chơi)
  prepareNameForm("res", !won);
  (won ? $("btnNext") : $("btnAgain")).focus();
}
function showDawn() {
  ui = "dawn";
  rows($("dawnStats"), [...wonScores.map((s, i) => [`Đêm ${i + 1} · ${MAPS[i + 1].name}`, String(s)]), ["Tổng điểm", String(total), "total"]]);
  show("dawn");
  prepareNameForm("dawn", true);
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
    else if (e.name === "shade_spawned") {
      hud.toast("Một Bóng Mực trồi lên từ sương…", 1400);
      hud.cue("Bóng Mực xuất hiện!", { danger: true, ms: 3500, key: "shade-spawn" });
      recentShade = { id: e.data.id, until: performance.now() + 6000 };
    } else if (e.name === "lantern_lit") hud.toast(e.data.relight ? `Đèn ${e.data.lantern_id} đã thắp lại!` : `Đèn ${e.data.lantern_id} đã sáng!`);
    else if (e.name === "refuel") hud.toast(`Châm dầu đèn ${e.data.lantern_id}: ${Math.floor(e.data.fuel)}/${TUNING.fuel_max}`, 1400);
    else if (e.name === "lantern_out") hud.toast(`Đèn ${e.data.lantern_id} đã cạn dầu! Nạp ${TUNING.relight_cost} đom đóm để thắp lại`, 2400);
    else if (e.name === "fuel_drain") hud.toast(`Bóng Mực đang hút dầu đèn ${e.data.lantern_id} (${Math.floor(e.data.fuel)})!`, 1800);
    else if (e.name === "player_hit") {
      hud.flash();
      if (!settings.reduceMotion) view.shake();
      if (e.data.by === "fall") hud.toast(`Mây rơi khỏi đảo! (mất ${e.data.lost} đom đóm)`, 2200);
    } else if (e.name === "charm_picked") hud.toast("Bùa Gió: chạy 7.2 m/s, lướt không hồi chiêu!", 2200);
    else if (e.name === "drifter_steal") {
      hud.flash();
      hud.toast(`Gió Lạc cướp ${e.data.amount} đom đóm! Tỏa sáng để đòi lại`, 2200);
    } else if (e.name === "drifter_drop") hud.toast(`Gió Lạc làm rơi ${e.data.amount} đom đóm – nhặt lại đi!`, 2000);
  }
}


// ---- Ticket-04: bảng điều khiển ở menu theo phím hiện tại ----
function renderMenuControls() {
  const k = (a) => `<kbd>${keyLabel(settings.keys[a])}</kbd>`;
  $("menuControls").innerHTML = [
    [`${k("up")}${k("left")}${k("down")}${k("right")}`, "Đi lại (theo hướng camera)"],
    [`<kbd>←</kbd><kbd>→</kbd> / kéo chuột`, "Xoay camera"],
    [`${k("jump")} · ${k("dash")}`, "Nhảy · Lướt"],
    [`${k("interact")} · ${k("pulse")}`, "Nạp/châm dầu vào đèn · Tỏa sáng xua Bóng Mực"],
    [k("pause"), "Tạm dừng"],
  ].map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join("");
}
renderMenuControls();

// ---- Ticket-04: đổi phím ----
let listening = null;
let cancelListen = () => {};
function renderKeyRows() {
  const box = $("keyRows");
  box.textContent = "";
  for (const [id, label] of ACTIONS) {
    const name = document.createElement("span");
    name.textContent = label;
    const b = document.createElement("button");
    b.className = "ghost";
    b.dataset.action = id;
    b.textContent = listening === id ? "Bấm phím…" : keyLabel(settings.keys[id]);
    if (listening === id) b.classList.add("listening");
    b.addEventListener("click", () => startListen(id));
    box.append(name, b);
  }
}
function startListen(id) {
  cancelListen();
  listening = id;
  $("keyWarn").textContent = "";
  renderKeyRows();
  cancelListen = controls.captureNextKey((code) => {
    listening = null;
    if (code === "Escape" && id !== "pause") {
      renderKeyRows();
      return;
    }
    if (RESERVED.includes(code)) $("keyWarn").textContent = `Phím ${keyLabel(code)} được dành riêng (xoay camera/xác nhận), hãy chọn phím khác.`;
    else {
      const dup = findConflict(settings.keys, code, id);
      if (dup) {
        $("keyWarn").textContent = `Phím ${keyLabel(code)} đã dùng cho "${actionName(dup)}". Hãy đổi phím đó trước hoặc chọn phím khác.`;
        renderKeyRows();
        $("keyRows").querySelector(`button[data-action="${dup}"]`)?.classList.add("dup");
        return;
      }
      settings.keys = { ...settings.keys, [id]: code };
      saveSettings(settings);
      controls.setBindings(settings.keys);
      renderMenuControls();
    }
    renderKeyRows();
  });
}
$("btnKeys").addEventListener("click", () => {
  ui = "keys";
  listening = null;
  $("keyWarn").textContent = "";
  renderKeyRows();
  show("keys");
});
$("btnKeysReset").addEventListener("click", () => {
  cancelListen();
  listening = null;
  settings.keys = { ...DEFAULT_KEYS };
  saveSettings(settings);
  controls.setBindings(settings.keys);
  renderMenuControls();
  $("keyWarn").textContent = "Đã khôi phục phím mặc định.";
  renderKeyRows();
});
$("btnKeysBack").addEventListener("click", () => {
  cancelListen();
  listening = null;
  ui = "settings";
  show("settings");
});

// ---- Ticket-04: bảng xếp hạng ----
let boardFrom = "menu";
async function openBoard(from) {
  boardFrom = from;
  ui = "board";
  show("board");
  $("boardBody").textContent = "Đang tải…";
  const { entries, source } = await loadBoard();
  renderBoard(entries);
  $("boardSrc").textContent = source === "disk" ? "Lưu trên đĩa: data/leaderboard.json" : "Lưu trong trình duyệt (bản web tĩnh, không có máy chủ lưu đĩa)";
  $("btnBoardBack").focus();
}
function renderBoard(entries) {
  const box = $("boardBody");
  box.textContent = "";
  if (!entries.length) {
    box.textContent = "Chưa có ai trên bảng. Hãy chơi và lưu điểm!";
    return;
  }
  const t = document.createElement("table");
  t.className = "board";
  t.innerHTML = "<thead><tr><th>#</th><th>Tên</th><th class='num'>Điểm</th><th class='num'>Đêm thắng</th><th>Thời điểm</th><th class='num'>Seed</th></tr></thead>";
  const tb = document.createElement("tbody");
  entries.forEach((e, i) => {
    const tr = document.createElement("tr");
    const cells = [[String(i + 1)], [e.name], [String(e.score), "num"], [String(e.nights_won), "num"], [e.achieved_at.replace("T", " ").slice(0, 16)], [String(e.seed), "num"]];
    for (const [text, cls] of cells) {
      const td = document.createElement("td");
      td.textContent = text; // textContent: tên người chơi không bao giờ thành HTML
      if (cls) td.className = cls;
      tr.append(td);
    }
    tb.append(tr);
  });
  t.append(tb);
  box.append(t);
}
$("btnBoard").addEventListener("click", () => openBoard("menu"));
$("btnDawnBoard").addEventListener("click", () => openBoard("dawn"));
$("btnBoardBack").addEventListener("click", () => {
  if (boardFrom === "dawn") showDawn();
  else {
    ui = "menu";
    show("menu");
  }
});

// Nhập tên lưu điểm: dùng chung cho màn kết quả (thua) và Bình Minh
let savedKey = null; // đã lưu cho (tổng điểm, số đêm thắng) hiện tại
function prepareNameForm(p, allowed) {
  const box = $(p + "Name");
  const key = `${total}/${wonScores.length}`;
  box.hidden = !allowed || savedKey === key;
  $(p + "Msg").textContent = "";
  $(p + "Save").disabled = false;
  $(p + "Input").disabled = false;
  if (!box.hidden) {
    loadBoard().then(({ entries }) => {
      if (!boardQualifies(entries, total)) $(p + "Msg").textContent = "Điểm chưa vào top 10, vẫn có thể lưu nhưng sẽ không hiện trên bảng.";
    });
  }
}
async function submitName(p) {
  const name = $(p + "Input").value.trim();
  const err = nameError(name);
  if (err) {
    $(p + "Msg").textContent = err;
    $(p + "Input").focus();
    return;
  }
  $(p + "Save").disabled = true;
  try {
    const r = await saveEntry({ name, score: total, nights_won: wonScores.length, achieved_at: isoWithOffset(new Date()), seed: lastSeed });
    savedKey = `${total}/${wonScores.length}`;
    $(p + "Msg").textContent = r.rank ? `Đã lưu! Hạng #${r.rank}.` : "Đã lưu (chưa vào top 10).";
    $(p + "Input").disabled = true;
  } catch (e) {
    $(p + "Msg").textContent = "Không lưu được: " + (e.message || e);
    $(p + "Save").disabled = false;
  }
}
for (const p of ["res", "dawn"]) {
  $(p + "Save").addEventListener("click", () => submitName(p));
  $(p + "Input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitName(p);
    }
  });
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
for (const [id, key, after] of [["rm", "reduceMotion", applyA11y], ["bt", "bigText", applyA11y], ["sub", "subtitles", applyA11y]]) {
  const sync = () => ($(id + "Val").textContent = settings[key] ? "Bật" : "Tắt");
  $(id).checked = settings[key];
  sync();
  $(id).addEventListener("change", () => {
    settings[key] = $(id).checked;
    saveSettings(settings);
    after();
    sync();
  });
}
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
  if (e.repeat || (e.target && e.target.tagName === "INPUT" && e.target.type === "text")) return;
  if (e.code === "Enter") {
    if (ui === "menu") $("btnPlay").click();
    else if (ui === "intro") $("btnGo").click();
    else if (ui === "result" && game.state === "won") $("btnNext").click();
    else if (ui === "dawn" && document.activeElement?.tagName !== "BUTTON") goMenu();
  } else if (e.code === "KeyR" && ui === "result") $("btnAgain").click();
});

// ---- Ticket-04: phụ đề / chỉ báo hình ảnh ----
function updateCues(sec) {
  // 10 s cuối của Đêm
  hud.bar(sec <= 10 && sec > 0 ? `Còn ${sec} giây tới bình minh!` : "");
  // Gió sắp thổi
  const warn = game.windEnabled && !game.wind.applied && game.simTick > 0 && RULES.wind_every_ticks - (game.simTick % RULES.wind_every_ticks) <= 120;
  if (warn && !windWarnWas) hud.cue("Gió sắp thổi – bám chắc!", { ms: 2600, key: "wind" });
  windWarnWas = warn;
  // Đèn có fuel < 30 (mỗi đèn báo một lần mỗi khi tụt xuống dưới ngưỡng)
  for (const L of game.lanterns) {
    const low = L.lit && L.fuelU < game.fu.low;
    if (low && !lowSeen.has(L.id)) {
      lowSeen.add(L.id);
      hud.cue(`Đèn ${L.id} sắp cạn dầu (dưới ${TUNING.low_fuel_threshold})!`, { danger: true, ms: 3500, key: "low:" + L.id });
    } else if (!low) lowSeen.delete(L.id);
  }
  // Mũi tên ở mép màn hình chỉ hướng Bóng Mực vừa xuất hiện
  const arrow = $("shadeArrow");
  let shown = false;
  if (recentShade && performance.now() < recentShade.until && settings.subtitles) {
    const sh = game.shades.find((x) => x.id === recentShade.id);
    if (sh) {
      const p = view.project([sh.pos[0], sh.pos[1] - 3, sh.pos[2]]);
      if (!p.visible) {
        let nx = p.behind ? -p.nx : p.nx;
        let ny = p.behind ? -p.ny : p.ny;
        const m = Math.max(Math.abs(nx), Math.abs(ny)) || 1;
        nx /= m;
        ny /= m;
        const x = (nx * 0.5 * 0.9 + 0.5) * innerWidth;
        const y = (-ny * 0.5 * 0.84 + 0.5) * innerHeight;
        arrow.style.transform = `translate(${x}px, ${y}px) rotate(${Math.atan2(-ny, nx) + Math.PI / 2}rad)`;
        arrow.querySelector("b").textContent = "Bóng Mực";
        shown = true;
      }
    }
  }
  arrow.hidden = !shown;
}

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
    updateCues(sec);
    const warn = game.windEnabled && !game.wind.applied && game.simTick > 0 && RULES.wind_every_ticks - (game.simTick % RULES.wind_every_ticks) <= 120;
    $("windWarn").hidden = !warn;
    $("windWarn").textContent = game.wind.applied ? "Gió mạnh đang thổi!" : "Gió sắp nổi – bám chắc!";
    if (game.wind.applied) $("windWarn").hidden = false;
  }
  hud.tickCues();
  if (ui !== "playing" && ui !== "paused") $("shadeArrow").hidden = true;
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
