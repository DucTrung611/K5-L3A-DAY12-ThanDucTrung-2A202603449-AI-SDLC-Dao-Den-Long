# PLAN.md: Kế hoạch hoàn thành lab "Đảo Đèn Lồng" (Day 12 AI SDLC)

> Nguồn: các file trong repo này (README, GUIDE, CHECKPOINTS, RULES, RUBRIC, SUBMISSION) và **tab Phase 1 trên lab board** (PRD-0 + Test Contract v1.0).
> Phase 2–4 **chưa phát hành**. Phần kế hoạch cho các phase đó là khung quy trình. Khi có ticket thì cập nhật lại file này.
> Ưu tiên: **đúng Test Contract > có bằng chứng > chơi được > đẹp/sáng tạo**.

## Trạng thái (cập nhật 2026-11-20)

| Mục | Trạng thái |
|---|---|
| CP0 chuẩn bị, harness (AGENTS.md, hooks, skill, reviewer, CI) | Xong |
| Phase 1: sim + headless + client + 26 scenario + 28 unit test + proof | Xong, `npm run verify` xanh. Bằng chứng: [docs/proof/phase-1/report.md](docs/proof/phase-1/report.md) |
| Phase 1: commit, `npm run proof -- --phase 1` sau commit, tag `phase-1`, push | **Chưa làm** (người dùng tự commit) |
| Điền token/chi phí vào `docs/notes/phase-1.md` | **Chưa làm** (lấy từ `/cost`) |
| Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1) | Xong phần code, kiểm chứng và tài liệu (xem [docs/proof/phase-2/report.md](docs/proof/phase-2/report.md)). **Chưa làm**: commit, `npm run proof -- --phase 2` sau commit cuối, tag `phase-2`, push, điền token vào `docs/notes/phase-2.md` |
| Phase 3–4 | Chờ ticket phát hành |

Khác với kế hoạch ban đầu: `index.html` đặt ở gốc repo (mặc định của Vite) thay vì `src/`. Có thêm `scripts/bot-playthrough.js` (bot chơi tới thắng + phát lại qua CLI) và `scripts/make-proof.js`.

---

## 0. Tóm tắt mục tiêu & chấm điểm

| Hạng mục | Điểm | Việc phải làm để ăn điểm |
|---|---:|---|
| A. Test tự động ẩn | 30 | Headless **đúng từng chữ** Test Contract, tất định, `tuning` khai đúng số thật trong code |
| B. Bằng chứng | 20 | Bảng truy vết yêu cầu → bằng chứng; unit test + scenario chạy bằng 1 lệnh; CI; hook chặn kết thúc khi test đỏ; reviewer khác người viết |
| C. SDLC & harness | 15 | Giả định + tiêu chí nghiệm thu mỗi phase; AGENTS.md ngắn, cập nhật qua phase; ≥1 skill/hook hữu ích; commit nhỏ; 4 tag + Release |
| D. Evaluation & retro | 10 | Đánh giá từng phase, nhật ký lỗi AI, token/chi phí mỗi phase, retro cuối |
| E. Hiệu năng | 10 | Headless nhanh (không render), game ổn định FPS; đo theo ticket Phase 4 |
| F. Sản phẩm + sáng tạo | 10 | 6đ chơi được đúng PRD; 4đ sáng tạo **nhỏ, tắt trong headless**, có mục "Sáng tạo của tôi" |
| G. Video | 5 | `.mp4` < 5 phút: chơi + chạy test pass + (đo hiệu năng) + lướt harness/git |

**Lịch 4 giờ (hạn tính theo thời điểm tag trên GitHub):**

| Mốc | Việc | Hạn |
|---|---|---|
| 0h–1h | CP0 chuẩn bị (10') + Phase 1 | tag `phase-1` trước 1h |
| 1h–2h | Phase 2 (Ticket-02) | tag `phase-2` trước 2h |
| 2h–2h30 | Phase 3 (Ticket-03, có thể **thay** luật cũ) | tag `phase-3` trước 2h30 |
| 2h30–4h | Phase 4 (Ticket-04, đo đạc + phát hành) | tag `phase-4` + Release `v1.0.0` + video trước 4h |

Hết giờ phase thì **tag và đi tiếp**, phần chưa xong ghi "chưa đạt" kèm lý do.

---

## 1. Quyết định công nghệ (chốt trước giờ lab)

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | **JavaScript (ESM) chạy Node ≥ 20**, không bước biên dịch | Cùng code cho headless và web; chạy được trên macOS/Linux/Windows; không cần GPU |
| Render 3D | **Three.js** (npm), dev server **Vite** | Nhẹ, phổ biến, bản web tĩnh dễ đóng gói Release |
| Test | `node:test` (built-in) | Không cần thêm dependency, 1 lệnh `npm test` |
| Kiến trúc | **Tách lõi mô phỏng thuần (`src/sim/`) khỏi render (`src/client/`)** | Headless chỉ import `src/sim`; client gọi cùng `step()` mỗi tick 1/60s |
| Tất định | PRNG có seed (mulberry32), **không** dùng `Math.random`/`Date` trong `src/sim`, dt cố định = 1/60, mọi timer đếm bằng **tick nguyên** | Contract yêu cầu output giống hệt giữa 2 lần chạy |

Máy đang dùng Windows. Contract yêu cầu chạy được trên macOS/Linux, nên Node + bản web là đủ. Kiểm tra thêm trên Git Bash/WSL hoặc trong CI `ubuntu-latest`. Dockerfile là tùy chọn, để Phase 4 nếu còn thời gian.

**Lệnh khai trong `game.contract.json`:**
- `build_cmd`: `npm ci`
- `run_cmd`: `npm run dev` (Vite, mở `http://localhost:5173`)
- `headless_cmd`: `node src/headless/cli.js`

README: cài đặt và chạy trong 3 lệnh: `git clone …` → `npm ci` → `npm run dev`.

---

## 2. Cấu trúc repo dự kiến

```text
README.md                  (README của game; README lab hiện tại chuyển sang docs/lab/)
PLAN.md                    (file này)
game.contract.json         (BẮT BUỘC, ở gốc repo)
package.json  package-lock.json
LICENSE  CREDITS.md  CHANGELOG.md
AGENTS.md                  (hướng dẫn agent, ngắn) + CLAUDE.md (1 dòng: "xem AGENTS.md")
.claude/
  settings.json            (hooks)
  skills/verify-game/SKILL.md
  agents/reviewer.md       (subagent review, không phải agent viết code)
.github/workflows/ci.yml   (npm test + scenario + determinism mỗi lần push)
src/
  sim/                     (lõi thuần, KHÔNG import three/DOM)
    rng.js  tuning.js  world.js  step.js  output.js
  headless/cli.js          (parse args, đọc scenario/inputs, ghi JSONL)
  client/                  (Three.js, input bàn phím/chuột, HUD, màn thắng/thua, chơi lại)
    main.js  scene.js  hud.js  input.js  extras/   (sáng tạo, chỉ chạy ở client)
index.html                 (gốc repo, entry của Vite)
tests/
  unit/*.test.js
  scenarios/<ten>/scenario.json inputs.json expect.json
scripts/
  run-scenarios.js         (chạy mọi scenario, so với expect, in bảng PASS/FAIL)
  check-determinism.js     (chạy 2 lần, so byte-by-byte)
  check-contract.js        (so tuning trong game.contract.json với tuning.js)
docs/
  lab/                     (các file lab gốc: GUIDE, RUBRIC, ...)
  notes/phase-N.md         (giả định, tiêu chí nghiệm thu, nhật ký AI, token, đánh giá)
  notes/retro.md
  proof/phase-N/           (output JSONL, report.md, ảnh HUD/thắng/thua)
  demo/                    (demo.mp4 nếu không đính kèm Release)
```

**Một nguồn sự thật cho tuning:** `src/sim/tuning.js` export object `TUNING`. `game.contract.json` phải khớp, và `scripts/check-contract.js` + unit test kiểm tra hai bên giống nhau, tránh khai sai làm trượt test ẩn.

---

## 3. Phase 1: PRD-0 (0h → 1h)

### 3.1 Yêu cầu bắt buộc (tóm tắt từ lab board)

**Gameplay:** 1 màn "Đêm 1 – Đảo Bến", đảo tròn, 5 Đèn Lồng Lớn (`L1`…`L5`). Mây đi lại, nhảy, có camera 3D góc nhìn thứ ba. Đom đóm rải rác, nhặt được. Nạp ánh sáng vào đèn để thắp. Bóng Mực xuất hiện và đuổi theo; bị chạm thì mất máu. Tỏa sáng (pulse) xua Bóng Mực và tốn ánh sáng. Bóng Mực sợ đèn. Thắp hết đèn thì thắng, hết máu thì thua. Có điểm, HUD, chơi lại được.
**Phong cách:** đêm, ấm, cổ tích. Vàng cam là an toàn, tím đen là nguy hiểm. Đảo sáng dần khi thắp đèn. Mây đội nón lá treo đèn lồng nhỏ. Không bạo lực.
**Bàn giao:** tag `phase-1`, gồm game chơi được, README (≤3 lệnh, điều khiển, cách tính điểm), `game.contract.json` + headless, bằng chứng + ghi chép (giả định, nhật ký AI), harness AI.

### 3.2 Test Contract v1.0: checklist chính xác (phần quan trọng nhất)

**CLI:** `node src/headless/cli.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json] --ticks <int> --out <f.jsonl> [--snapshot-every <int, mặc định 10>]`
- [ ] 60 tick/giây cố định, không cửa sổ, không GPU, chạy nhanh nhất có thể.
- [ ] Dừng khi đủ `--ticks` bước **hoặc** khi game kết thúc (won/lost). Thoát mã **0**.
- [ ] Lỗi tham số hoặc lỗi chạy: mã ≠ 0 (dùng 1), thông báo ra **stderr**. File scenario/inputs sai định dạng: mã **2**.

**Mô hình tick:**
- [ ] Snapshot tick 0 = trạng thái **sau khi dựng scenario, trước input**.
- [ ] Bước k (k = 0…N−1) đọc input của tick k, tạo trạng thái k+1. Sự kiện trong bước đó ghi `tick = k+1`. `--ticks N` chạy đúng N bước.
- [ ] `time_left_s = thời lượng Đêm − số bước đã chạy / 60` (nếu scenario đặt `time_left_s` thì dùng giá trị đó làm gốc).
- [ ] `sim_tick` = số bước gameplay (Phase 1 bằng `tick`).

**Tọa độ:** mét, Y hướng lên, mặt đất Y = 0, người chơi xuất phát (0,0,0). `player.pos` là chân, `shade.pos` là tâm, `lantern.pos` là chân cột, đom đóm là điểm trên mặt đất. **Khoảng cách đo trên mặt phẳng XZ**, "trong bán kính r" nghĩa là `≤ r`.

**Inputs:** mặc định `move [0,0]`, `cam_yaw_deg 0`, mọi nút `false`. Frame chỉ đổi trường có mặt, trường vắng giữ giá trị cũ. `tick` tăng nghiêm ngặt (vi phạm thì exit 2).
- [ ] Hướng thế giới: θ = rad(cam_yaw_deg); `x' = x·cosθ + z·sinθ`, `z' = −x·sinθ + z·cosθ`. Vector dài hơn 1 thì **chuẩn hóa về 1** (ngắn hơn thì giữ nguyên).
- [ ] `jump`, `interact`, `pulse` (`dash` nếu có) kích hoạt **khi chuyển false → true** (edge detect).
- [ ] Không có file inputs thì người chơi đứng yên.

**Scenario:** `player.{pos,carried,flames}`, `random_motes`, `random_shades`, `motes` (thay toàn bộ), `shades` (thay toàn bộ, có thể kèm `id`, bắt đầu ở trạng thái hoạt động bình thường ngay), `lanterns` (cập nhật **theo id**, có thể đổi `pos`, `deposited`, `lit: true`), `time_left_s`. Trường vắng thì dùng mặc định. **Dựng scenario không phát sự kiện và không cộng điểm.**

**Output JSONL** (mỗi dòng 1 JSON):
- [ ] `snapshot` mỗi `--snapshot-every` tick, bắt đầu từ tick 0, gồm `type, tick, sim_tick, state, time_left_s, score, player{pos,flames,carried}, lanterns[{id,pos,lit,deposited}], shades[{id,pos,state}], motes_active` (khuyến nghị thêm `motes[{id,pos}]`).
- [ ] `event`: `{"type":"event","tick":t,"name":...,"data":{...}}`:
  - `mote_picked {carried}` · `deposit {lantern_id, amount, deposited}` · `lantern_lit {lantern_id}` · `pulse {stunned_ids}` · `player_hit {by:"shade"|"fall", flames, dropped}` · `shade_spawned {id}` · `game_over {result:"won"|"lost", reason:"all_lit"|"dawn"|"no_flames"}`
- [ ] Dòng cuối **bắt buộc**: `{"type":"end","ticks":N,"state":"won|lost|playing","score":S}`.
- [ ] `state` ∈ `playing|won|lost`. Shade state tối thiểu có `"stunned"` (của mình: `chase`, `stunned`, `idle`).
- [ ] Tọa độ làm tròn 3 chữ số thập phân. Id tự sinh (`S1`, `S2`, … / `M1`, …) cũng tất định.
- [ ] Sự kiện không tồn tại trong game (ví dụ `by:"fall"` khi `fall_enabled: false`) thì **không ghi**.

**`game.contract.json`:** `contract_version "1.0"`, `team` (`2A202603449-ThanDucTrung`), `build_cmd`, `run_cmd`, `headless_cmd`, `tuning{…, fall_enabled, score{…}}`. Khái niệm không có thì để `null`/`false` và giải thích trong README.

### 3.3 Giả định & con số tuning (đề xuất, ghi vào `docs/notes/phase-1.md`)

| Khóa tuning | Giá trị | Ý nghĩa / giả định |
|---|---:|---|
| `player_speed` | 6.0 | m/s, chạy theo `move` đã chuẩn hóa |
| `carry_capacity` | 10 | Mang tối đa 10 đom đóm. Đầy thì không nhặt (đom đóm vẫn nằm đó) |
| `lantern_cost` | 5 | Số đom đóm cần nạp để thắp 1 đèn |
| `lantern_count_night1` | 5 | `L1`…`L5` |
| `pickup_radius` | 1.5 | Tự động nhặt khi XZ ≤ 1.5 m |
| `interact_radius` | 3.0 | Nhấn interact gần đèn **chưa thắp gần nhất** trong bán kính thì nạp |
| `pulse_cost` | 2 | Tốn 2 đom đóm đang mang. Không đủ thì pulse không xảy ra, không có event |
| `pulse_radius` | 6.0 | Shade (không stunned) có tâm trong ≤ 6 m bị choáng |
| `night1_duration_s` | 300 | Hết giờ: `game_over lost dawn` |
| `flames` | 3 | Máu ("Ngọn Lửa") |
| `invuln_s` | 1.5 | Bất tử sau khi bị chạm |
| `hit_drop_ratio` | 0.5 | `dropped = floor(carried × 0.5)`, số rơi bị **mất** (không sinh lại tại chỗ) |
| `pulse_stun_s` | 2.5 | Thời gian choáng |
| `pulse_push_m` | 4.0 | Đẩy tức thời ra xa người chơi theo XZ |
| `pulse_cooldown_s` | 1.0 | Hồi chiêu tính từ lần pulse thành công |
| `safe_radius` | 8.0 | Shade không vào được vòng quanh đèn **đã thắp** (đèn chưa thắp không bảo vệ) |
| `shade_speed` | 3.5 | m/s, chậm hơn người chơi |
| `shade_hit_radius` | 1.0 | Shade không stunned có XZ ≤ 1.0 thì chạm |
| `fall_enabled` | false | Đảo có biên tròn bán kính 40 m, người chơi bị chặn ở biên, không rơi |
| `score.per_mote` | 10 | Cộng khi **nhặt** |
| `score.per_lantern` | 100 | Cộng khi đèn thắp (do nạp, không phải do scenario) |
| `score.per_stun` | 20 | Mỗi shade bị choáng bởi 1 pulse |
| `score.per_second_left` | 2 | Chỉ khi **thắng**: `floor(time_left_s) × 2` |
| `score.per_flame_left` | 50 | Chỉ khi **thắng**: `flames × 50` |

Giả định khác cần ghi:
- Đèn mặc định nằm trên vòng bán kính 25 m: `L1 (0,0,25)`, các đèn sau cách nhau 72°. Đảo bán kính 40 m.
- Timer quy ra tick: `round(s × 60)`.
- Shade: khi `random_shades` bật thì shade đầu sinh sau 10 s, sau đó cứ 15 s một con, tối đa 6 con. Điểm sinh ở rìa đảo, cách người chơi ≥ 15 m, ngoài safe zone. Shade sinh xong vào thẳng trạng thái `chase`, kèm event `shade_spawned`.
- Đom đóm: khi `random_motes` bật thì có 30 con ban đầu (rải theo seed, ngoài vùng 3 m quanh tâm). Cứ 3 s sinh thêm 1 con nếu số con < 20.
- Jump: vận tốc 6 m/s, trọng lực 20 m/s², chỉ nhảy khi đang chạm đất. Jump không ảnh hưởng khoảng cách XZ (nên vẫn nhặt và bị chạm khi đang nhảy).
- Không có va chạm với cột đèn hay nhà trong sim. Chỉ có biên đảo và safe zone của shade.
- Khi người chơi đứng trong safe zone thì shade đổi sang `idle` và đứng ở mép vòng.

### 3.4 Thứ tự xử lý trong 1 bước (chốt sớm để tất định và để test)

```
step(k):
 1. Đọc input tick k (áp frame nếu frame.tick == k), tính cạnh lên của jump/interact/pulse
 2. Di chuyển người chơi (xoay theo cam_yaw, chuẩn hóa, speed/60), jump/trọng lực, kẹp trong biên đảo
 3. Interact: nạp vào đèn chưa thắp gần nhất trong interact_radius
    → deposit; nếu đủ cost → lantern_lit (+per_lantern)
 4. Pulse: nếu cooldown xong và carried ≥ pulse_cost → trừ cost, choáng + đẩy shade trong bán kính
    → pulse{stunned_ids} (+per_stun mỗi con)
 5. Nhặt đom đóm (duyệt theo thứ tự id) → mote_picked (+per_mote) mỗi con
 6. Cập nhật shade: giảm stun → về chase; di chuyển về phía người chơi; đẩy ra khỏi safe zone của đèn đã thắp
 7. Va chạm: nếu không bất tử và có shade chạm → player_hit (1 lần/bước), flames−1, rơi đom đóm, bật invuln
 8. Spawn ngẫu nhiên (shade_spawned) / sinh đom đóm
 9. Đếm thời gian: time_left = gốc − (k+1)/60
10. Kiểm tra kết thúc theo thứ tự: all_lit (won) → no_flames (lost) → dawn (lost)
    → game_over, cộng bonus nếu thắng
```

### 3.5 Tiêu chí nghiệm thu → cách kiểm chứng (bảng truy vết, nhân bản vào `docs/proof/phase-1/report.md`)

| # | Yêu cầu | Kiểm chứng | Bằng chứng |
|---|---|---|---|
| R1 | CLI đúng tham số, exit 0 | scenario `smoke` 600 tick | log + JSONL |
| R2 | Sai định dạng thì exit 2, lỗi khác thì ≠0 + stderr | unit test gọi CLI với JSON hỏng / tick không tăng / thiếu `--seed` | output test |
| R3 | Tick model (tick 0 trước input, event tick = k+1, N bước) | scenario `move_forward`: move [0,1] 60 tick thì z = 6.000 tại tick 60 | expect.json |
| R4 | Xoay cam_yaw + chuẩn hóa vector | unit: yaw 90°, move [0,1] thì đi +X; move [1,1] có độ dài 1 | test |
| R5 | Edge-trigger nút | giữ `interact: true` nhiều tick chỉ ra 1 deposit | scenario |
| R6 | Nhặt trong pickup_radius (≤ r, biên đúng r) | mote đặt đúng 1.5 m thì nhặt, 1.501 m thì không | scenario |
| R7 | Nạp & thắp đèn, điểm | carried 5 cạnh L1, interact → deposit + lantern_lit, score +100 | scenario |
| R8 | Pulse: cost, radius, stun, push, cooldown, không đủ cost thì không có gì | 3 scenario | scenario |
| R9 | Shade đuổi, chạm thì mất máu, rơi đom đóm, invuln | shade cách 3 m, đứng yên → player_hit; không hit lại trong 90 tick | scenario |
| R10 | Safe radius quanh đèn đã thắp | shade không bao giờ có XZ < 8 tới đèn thắp | scenario + assert mọi snapshot |
| R11 | Thắng all_lit + bonus | 4 đèn `lit:true` trong scenario + nạp đèn cuối | scenario |
| R12 | Thua no_flames / dawn | flames 1 + shade; time_left_s 1 | scenario |
| R13 | Scenario setup không phát event/không cộng điểm | đèn `lit:true` thì score tick 0 = 0, không có event | scenario |
| R14 | Tất định | `check-determinism.js`: 3 seed × 2 lần, so byte | log |
| R15 | Tọa độ 3 chữ số, dòng `end` cuối | validator JSONL trong run-scenarios | log |
| R16 | Tuning khai đúng | `check-contract.js` | log |
| R17 | Game chơi được từ đầu tới thắng/thua, HUD, chơi lại | chơi tay | ảnh/GIF: HUD, đèn sáng, màn thắng, màn thua, nút chơi lại |
| R18 | Clone sạch chạy được ≤ 3 lệnh | clone sang thư mục tạm, làm theo README | log terminal |

Expect của scenario **viết tay từ yêu cầu trước khi code**, không copy output của chương trình rồi gọi là expect (RULES mục 5).

### 3.6 Timeline 60 phút

| Phút | Việc | Commit |
|---|---|---|
| 0–10 | CP0: kiểm tra Node, `npm init`, cài `three` + `vite`, khung thư mục, chuyển lab docs sang `docs/lab/`, AGENTS.md, hook, skill | `chore: scaffold + harness` |
| 10–18 | Viết `docs/notes/phase-1.md` (giả định, bảng tuning, mục 3.4), `game.contract.json`, 6–8 scenario + expect | `docs: phase-1 assumptions + scenarios` |
| 18–20 | Duyệt kế hoạch với agent (đưa mục 3.2–3.4 vào prompt) | |
| 20–38 | Agent viết `src/sim` + `cli.js` theo từng bước nhỏ, chạy `npm test` sau mỗi bước | 3–4 commit nhỏ |
| 38–48 | Client Three.js: đảo tròn, Mây (khối đơn giản + nón lá + đèn), đèn, đom đóm, shade tím, camera follow, HUD, màn thắng/thua + chơi lại | `feat(client): …` |
| 48–55 | Kiểm chứng: `npm run verify` (test + scenario + determinism), chụp ảnh, subagent reviewer đọc diff, clone sạch | `docs: phase-1 proof` |
| 55–60 | README (≤3 lệnh, điều khiển, điểm, null/false, Sáng tạo), nhật ký AI + token, `git tag phase-1 && git push origin main phase-1` | |

**Cắt phạm vi nếu trễ:** giữ headless + scenario + README trước. Client chỉ cần chơi được, chưa cần đẹp. Sáng tạo bỏ qua.

---

## 4. Harness AI (làm ở CP0, cập nhật mỗi phase)

1. **`AGENTS.md`** (khoảng 30–40 dòng): lệnh `npm ci` / `npm test` / `npm run verify` / headless mẫu; quy tắc "`src/sim` không import three/DOM, không `Math.random`/`Date.now`, timer bằng tick"; "tuning chỉ sửa ở `tuning.js` + `game.contract.json` cùng lúc"; "không sửa expect.json để test pass"; "commit nhỏ". `CLAUDE.md` chỉ trỏ về AGENTS.md.
2. **Skill `.claude/skills/verify-game/SKILL.md`**: cách chạy `npm run verify`, lưu output vào `docs/proof/phase-N/`, cập nhật bảng report. Chỉ nạp khi kiểm chứng.
3. **Hooks `.claude/settings.json`**:
   - `PostToolUse` (Edit|Write trên `src/**`): chạy `npm test --silent`, báo lỗi ngắn.
   - `Stop`: chạy `npm run verify`; nếu đỏ thì **block** (exit 2) kèm thông báo. Hook này đáp ứng tiêu chí "cơ chế ngăn kết thúc khi test đỏ".
4. **Subagent `.claude/agents/reviewer.md`**: chỉ đọc. Đối chiếu diff với Test Contract và PLAN, tìm test giả hoặc expect bị sửa. Đáp ứng tiêu chí "đánh giá do agent khác người viết".
5. **CI `.github/workflows/ci.yml`**: `ubuntu-latest`, Node 20, `npm ci && npm run verify`. Đồng thời chứng minh chạy được trên Linux.
6. Mỗi lần agent sai lặp lại: thêm 1 dòng AGENTS.md hoặc 1 check tự động, rồi ghi vào nhật ký lỗi AI.

`package.json` scripts: `dev`, `build` (vite build → `dist/`), `test` (`node --test tests/unit`), `scenarios`, `determinism`, `contract`, `verify` (= test + scenarios + determinism + contract).

---

## 5. Ghi chép & bằng chứng (mỗi phase)

`docs/notes/phase-N.md`:
1. Tóm tắt yêu cầu mới/đổi
2. Giả định (+ chỗ ticket làm rõ giả định cũ)
3. Tiêu chí nghiệm thu
4. Thay đổi thiết kế + lý do 1 dòng
5. Nhật ký AI: prompt chính, AI sai gì, phát hiện thế nào, chỉnh harness gì
6. Token/chi phí ước tính (xem `/cost` hoặc usage) + cách tiết kiệm
7. Đánh giá: đạt / chưa đạt / có hỏng phase trước không

`docs/proof/phase-N/report.md`: bảng Yêu cầu | Cách kiểm chứng | Bằng chứng (đường dẫn) | Kết quả (Đạt/Chưa đạt). Ghi lệnh để chạy lại **ở đúng tag**.

Mẹo tiết kiệm token: đưa nguyên văn đoạn contract liên quan vào prompt thay vì để agent tự đọc web; giao từng việc nhỏ có tiêu chí kiểm chứng; dùng model nhẹ cho việc đọc/format; dừng sớm khi agent lạc hướng.

---

## 6. Phase 2–4 (khung, cập nhật khi ticket phát hành)

**Phase 2 (1h → 2h, 60'):** đọc Ticket-02 và so với giả định Phase 1 (cập nhật bảng tuning nếu ticket chốt số). Viết scenario mới trước khi code. Nếu contract đổi version thì cập nhật `contract_version`, validator và scenario cũ. Chạy lại **toàn bộ** scenario Phase 1. Rà harness. Tag `phase-2`.
**Phase 3 (2h → 2h30, 30'):** ticket có thể **thay luật cũ**. Liệt kê test/tài liệu/giả định bị ảnh hưởng. Sửa hoặc bỏ test **kèm lý do** (ghi trong notes, không tắt âm thầm). Viết đoạn "đổi thiết kế thế nào, vì sao". Tag `phase-3`.
**Phase 4 (2h30 → 4h, 90'):**
- Đo các chỉ số ticket yêu cầu (ví dụ thời gian headless N tick, FPS), lưu kèm cấu hình máy.
- Làm sạch README, kiểm tra clone sạch.
- Bổ sung `LICENSE` (MIT), `CREDITS.md` (Three.js MIT, công cụ AI đã dùng, asset nếu có), `CHANGELOG.md`.
- `npm run build` ra `dist/` (web tĩnh). Đóng zip và làm Release: `gh release create v1.0.0 dist.zip demo.mp4 --title v1.0.0 --notes "..."`.
- Dành 15' cuối cho **video** (< 5', `.mp4`, nén bằng ffmpeg nếu cần): chơi thử, `npm run verify` xanh, đo hiệu năng, lướt AGENTS.md/hooks/git log. Đặt link ở **đầu README**.
- Viết `docs/notes/retro.md` (số liệu, lỗi AI, harness hữu ích nhất, tổng token, làm lại thì đổi gì).
- Tag `phase-4`.

Thiết kế để dễ thay đổi: tuning tập trung một chỗ, `step()` chia hàm nhỏ theo mục 3.4, event emit qua một hàm `emit()`, có version contract trong output writer.

---

## 7. Sáng tạo (hạng mục F, 4 điểm). Chỉ làm khi lõi đã xanh

Giữ **1–2 ý nhỏ, chỉ ở client** (`src/client/extras/`), không đổi đầu ra headless. Ví dụ:
- Đảo sáng dần: fog/ánh sáng ấm tăng theo số đèn đã thắp, kèm hiệu ứng "bùng sáng" khi thắp đèn.
- Âm thanh WebAudio tổng hợp (không cần asset): tiếng nhặt đom đóm, thắp đèn, pulse.

Ghi mục **"Sáng tạo của tôi"** trong README, kèm bằng chứng: ảnh + `npm run verify` vẫn xanh + determinism vẫn khớp sau khi thêm.

---

## 8. Checklist trước khi nộp (từ SUBMISSION.md)

- [ ] Repo **public**, tên `K5-L3A-DAY12-ThanDucTrung-2A202603449-AI-SDLC-Dao-Den-Long`
- [ ] Clone sạch, ≤ 3 lệnh, game chạy. Headless đúng contract
- [ ] Tag `phase-1`…`phase-4` đúng commit, Release `v1.0.0` có bản chạy được + video
- [ ] Bằng chứng mỗi phase khớp tag, không sửa tay. Chỗ chưa đạt ghi trung thực
- [ ] Notes: giả định, nhật ký AI + token, retro
- [ ] Harness còn trong repo và lịch sử git. Không force-push sau khi tag
- [ ] `LICENSE`, `CREDITS.md`. Không có `.env`/API key (thêm `.gitignore`: `node_modules/ dist/ .env out/`)
- [ ] Nộp link LMS theo Coach (mặc định ca sáng 23h59 cùng ngày, ca chiều 11h59 hôm sau, GMT+7)
