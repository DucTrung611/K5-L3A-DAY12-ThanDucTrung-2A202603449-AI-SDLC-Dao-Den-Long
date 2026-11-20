# Phase 2: Ticket-02 "Ba hòn đảo" (Contract v1.1)

Nguồn: tab Phase 2 của lab board (đọc ngày 2026-11-20). Loại: Feature + chuẩn hóa, ưu tiên cao, tag `phase-2`, **Contract v1.1**.

## 1. Tóm tắt thay đổi so với Phase 1

| # | Hạng mục | Phase 1 (tự chọn) | Phase 2 (chuẩn, thay thế) | Ảnh hưởng |
|---|---|---|---|---|
| C1 | Số liệu | tự chọn | **Bảng số chuẩn**: speed 6, jump 7 (g 20), mang 10, nhặt ≤1.0 m **và** chênh cao ≤1.5, đèn cost 10, interact 2.0 m, vùng an toàn 6 m, tỏa sáng 3 đom đóm/5 m/3 s, choáng 120 tick, đẩy 4 m trong 15 tick, Bóng Mực 4.0 m/s (Đêm 3: 4.5), phát hiện 12 / bỏ 18 m, bất tử 90 tick, đêm 300/330/360 s | Toàn bộ scenario cũ tính lại |
| C2 | Điểm | +10 nhặt, +100 đèn, +20 choáng | **+10 mỗi đom đóm NẠP**, +100 đèn, **+5** mỗi Bóng Mực trúng tỏa sáng (cả con đang choáng); thắng: `floor(giây còn)×2 + 50×lửa`. Tổng = cộng các đêm thắng | Đổi thời điểm cộng điểm |
| C3 | Rơi khỏi đảo | không có (biên chặn) | **Có**: Y < −10 → −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh bất tử 90 tick; `fall_enabled: true` | Bỏ biên chặn; bỏ scenario `island_boundary_no_fall` |
| C4 | Bản đồ | 1 đảo r=40, đèn theo vòng 72° | **3 đêm**: Đảo Bến (đèn tọa độ cố định), Đảo Cầu (2 đảo + cầu tre + 2 bục nhảy), Đảo Chuông (3 tầng, dốc, bục nhảy, tháp, gió mạnh) | Thêm `maps.js` |
| C5 | Bóng Mực | luôn đuổi, đẩy tức thời | Trạng thái `spawning/wander/chase/recoil/stunned`; phát hiện 12/bỏ 18; chạm → lùi 2 m/60 tick; đẩy 4 m trong 15 tick đầu; 2 con ở tick 300 rồi theo chu kỳ | Viết lại AI Bóng Mực |
| C6 | Mới | | **Lướt (dash)**, **Gió Lạc** (kẻ trộm), **Bùa Gió**, **gió mạnh** (Đêm 3), **bục nhảy**, **tạm dừng**, chuỗi 3 đêm, cài đặt, âm thanh, HUD đủ, bảng màu chuẩn | Tính năng mới |
| C7 | Contract v1.1 | | `contract_version "1.1"`, thêm khóa `dash_speed, dash_duration_s, dash_cooldown_s, night2_duration_s, night3_duration_s`; `--night 1\|2\|3`; snapshot thêm `night, wind, player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}, motes[kind,ttl_s], drifters, charms`; scenario/inputs/event mới; headless 1 đêm ≤ 30 s | CLI + validator + output |

## 2. Giả định mới (chỗ Ticket-02 chưa nói rõ)

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| B1 | "Tăng tốc/dừng ≤ 0.1 s" | Tốc độ đổi **tức thời** (0 tick ≤ 0.1 s) | Thỏa ràng buộc, dễ kiểm chứng |
| B2 | Góc bản đồ | Điểm tại góc θ: `(cx + r·cosθ, cz + r·sinθ)` (z = +r·sinθ) | Dốc 30°/150°, điểm đom đóm tầng 1 (20°…160°) và bục nhảy chỉ khớp tầng 1 (nửa z > 0) khi dùng dấu này |
| B3 | Điểm xuất phát Đêm 2, 3 | Đêm 2: (0,0,0); Đêm 3: **(0,0,−20)** quay mặt +Z. Đều là điểm hồi sinh khi rơi | Đêm 3 tại (0,0,0) là trong tháp chuông. Đã khai ở README |
| B4 | Trần đom đóm 30 | Đếm **mọi** đom đóm đang có (random + rơi) | `motes_active` là tổng |
| B5 | "Điểm trống" để sinh đom đóm | Điểm spawn chưa có đom đóm `random` đang đứng ở đó | Tránh chồng |
| B6 | Bóng Mực `spawning` | 60 tick đứng yên, không gây sát thương, bị tỏa sáng vẫn trúng | Ticket chỉ nêu tên trạng thái |
| B7 | Bóng Mực `wander` | 2.0 m/s, đổi hướng ngẫu nhiên (theo seed) mỗi 180 tick, không rời mặt đất | Ticket chỉ nêu ngưỡng 12/18 |
| B8 | Bóng Mực trong scenario không có `state` | Bắt đầu `wander`, tick đầu tiên chuyển `chase` nếu XZ ≤ 12 | "Hoạt động bình thường ngay" |
| B9 | Đo phát hiện/bỏ đuổi | Khoảng cách XZ; ≤ 12 → chase; chase giữ tới khi > 18 | Khớp "khoảng cách XZ" ở mục chạm |
| B10 | Tâm Bóng Mực | `y = mặt đất + 1.0` (ghi đè y trong scenario) | Ví dụ contract: shade y = 1.0 |
| B11 | Vùng an toàn: Bóng Mực đang ở trong khi đèn vừa sáng | Bị đẩy đều ra mép trong đúng 30 tick, không gây sát thương, trạng thái `recoil` | Ticket: "tối đa 30 tick" |
| B12 | Nhiều Bóng Mực chạm cùng tick | Theo id tăng dần (so tự nhiên `S2 < S10`); con đầu tiên gây hit và `recoil`, các con còn lại không làm gì vì Mây vừa bất tử | "Tối đa 1 lần mất lửa mỗi tick" |
| B13 | Trạng thái nào gây hit | `wander` và `chase`; không gây hit: `spawning`, `recoil`, `stunned`, đang bị đẩy khỏi vùng an toàn | Hợp lý với tên trạng thái |
| B14 | Đom đóm rơi vành 1.5–2.5 m | Góc và bán kính lấy từ RNG theo seed; điểm không đứng được thì thử góc khác (tối đa 8 lần) rồi rơi dưới chân | Ticket chỉ nêu vành |
| B15 | `player_hit` do rơi | `{by:"fall", flames, dropped:0, lost:<số đom đóm mất>}`. Hit do Bóng Mực không có `lost` | "Thêm trường lost" áp dụng cho hit do rơi |
| B16 | Lướt | Hướng = hướng di chuyển lúc bấm, đứng yên thì hướng mặt (mặc định +Z, cập nhật khi di chuyển); 12 tick × 14 m/s; giữ nguyên Y (vy = 0); bấm trong lúc lướt bị bỏ; không nhảy được trong lúc lướt; hồi chiêu 90 tick tính từ tick bắt đầu lướt | Ticket |
| B17 | Bùa Gió và lướt | Còn bùa thì lướt luôn được (kể cả hồi chiêu còn dư) và không đặt hồi chiêu | "Lướt không hồi chiêu" |
| B18 | Bục nhảy | Kích hoạt khi chân Mây đang chạm đất, cách tâm bục ≤ 1.0 m XZ và chênh cao ≤ 0.5; vận tốc phóng giữ đến khi chạm đất; lướt trong lúc bay thì vận tốc ngang bị thay trong 12 tick rồi trở về vận tốc phóng | Ticket |
| B19 | Địa hình | Một hàm chiều cao `h(x,z)`; bước lên mặt cao hơn chân > 0.35 m thì bị chặn (trượt dọc vật cản); bước xuống tối đa 0.35 m thì dính mặt đất, hơn thì rơi. Tháp chuông: cột r=2 chặn người và Bóng Mực | "Vách đứng", "không leo được" |
| B20 | Gió mạnh | Cơn gió mở đầu tại tick `1800·k` (k ≥ 1), kéo dài 300 tick, hướng `dir_deg` = nguyên [0,360) từ RNG, đẩy người chơi (cả trên không) 2 m/s cộng vào vận tốc; ngoài cơn gió `dir_deg` = 0 | "Mỗi 30 s … kéo dài 5 s" |
| B21 | Gió Lạc sinh ở đâu | Một trong các điểm sinh Bóng Mực của đêm đó, cách người chơi ≥ 15 m; bay lơ lửng cao 1.0 m trên mặt đất | "Điểm sương ngẫu nhiên" |
| B22 | Gió Lạc `idle` | 2 m/s, đổi hướng ngẫu nhiên mỗi 120 tick, tự quay lại nếu ra khỏi mặt đất | Ticket chỉ nêu tốc độ |
| B23 | Gió Lạc: chỉ cướp khi `chase`; `flee` bay xa người chơi 7 m/s trong 240 tick rồi `removed` cùng số đã cướp | | Ticket |
| B24 | Tỏa sáng trúng Gió Lạc | Đo 3D tới tâm (mặt đất + 1.0) ≤ 5 m. `chase` → `flee` (không cướp). `flee` đang mang đồ → `drifter_drop`, đom đóm rơi **tại chỗ** (loại `dropped`, TTL 480), Gió Lạc biến mất sau tối đa 120 tick. `idle`: không ảnh hưởng. Không cộng điểm | Đọc "biến mất sau 120 tick" là chủ ngữ Gió Lạc |
| B25 | `night_start` | Phát đúng 1 lần ở bước đầu tiên của mỗi lần chạy (tick 1) | Dựng scenario không phát event nên không thể ở tick 0 |
| B26 | Tạm dừng | `pause` kích hoạt khi false → true: đang chơi thì tạm dừng (event `paused`, dừng bước), đang tạm dừng thì tiếp tục (event `resumed`, bước tiếp tục bình thường). Khi dừng `tick` vẫn tăng, `sim_tick`/thời gian/hồi chiêu/spawn/TTL đứng yên, snapshot `state:"paused"`, các nút khác bị bỏ. Dòng `end` ghi `playing` nếu kết thúc khi đang dừng | Ticket |
| B27 | `invuln` trong snapshot | boolean (còn bất tử hay không) | Tên không có hậu tố `_s` |
| B28 | `ttl_s` của đom đóm `random` | `null` | Chỉ đom đóm rơi có TTL |
| B29 | Phát hiện biên khoảng cách | So sánh với sai số 1e-9 (≤ r) | Tránh lệch do số thực |
| B30 | Đom đóm rơi do Bóng Mực/Gió Lạc | Nhặt lại được từ tick sau, nhặt theo luật thường | Ticket |

## 3. Tiêu chí nghiệm thu cho từng mục Phần 3 (DoD)

| Mục | Làm A thì thấy B | Scenario |
|---|---|---|
| Gió Lạc | Mang ≥ 5 đom đóm trong 15 m → `chase`; chạm ≤ 1.2 m → `drifter_steal{amount:min(3,mang)}`, `flee` 240 tick rồi biến mất; tỏa sáng khi `chase` → `flee` không cướp; tỏa sáng khi `flee` có đồ → `drifter_drop`, đom đóm rơi tại chỗ; sinh ở tick 1200/2400, tối đa 2 | `drifter_steal`, `drifter_pulse_chase`, `drifter_pulse_drop`, `drifter_spawn_schedule` |
| Bùa Gió | Nhặt → `charm_picked{charm_ticks:600}`, chạy 7.2 m/s, lướt không hồi chiêu; xuất hiện lại sau 2700 tick | `charm_pickup_speed`, `charm_dash_no_cooldown`, `charm_respawn` |
| Chuỗi 3 đêm, tạm dừng, cài đặt, âm thanh, HUD | Chơi trong trình duyệt: menu → giới thiệu → chơi → kết quả → đêm kế → Bình Minh; Esc/P dừng hẳn logic; cài đặt lưu qua lần mở | Ảnh + `pause_resume` (headless) |
| Lướt | 14 m/s × 12 tick, hồi chiêu 90 tick, giữ độ cao | `dash_cooldown`, `dash_air_altitude` |
| Bục nhảy, bản đồ 3 đêm, rơi, địa hình | Phóng tới đảo đích; dốc lên tầng 1; vách chặn; bước ra rơi tầng dưới; tháp chặn | `jump_pad_night2`, `jump_pad_night3`, `ramp_climb`, `cliff_blocks`, `step_off_tier`, `tower_blocks`, `bridge_no_rails_fall`, `fall_respawn` |
| Gió mạnh | Tick 1800–2099 đẩy 2 m/s theo `dir_deg` | `wind_gust` |

## 4. Kế hoạch kiểm chứng (viết trước khi code)

- Mọi `expect.json` tính **tay** từ yêu cầu và bảng số chuẩn (công thức ghi trong `description`); không chép output chương trình.
- Scenario Phase 1 được tính lại với số chuẩn (xem mục 5), giữ tên khi ý nghĩa còn nguyên.
- Mutation check sau khi xong: đổi từng hằng số chuẩn, scenario tương ứng phải FAIL.
- Hiệu năng: 1 đêm đầy đủ 21 600 tick (≤ 30 s); client ≥ 30 FPS trung bình ở 1280×720 (đo bằng Playwright).

## 5. Test cũ bị Phase 2 thay thế (sửa kèm lý do, không bỏ âm thầm)

| Scenario Phase 1 | Số phận | Lý do |
|---|---|---|
| `move_*`, `input_fields_persist`, `bad_*` | Giữ, chỉ cập nhật nếu cần | Luật không đổi |
| `jump_arc` | Tính lại | Nhảy 6 → 7 m/s |
| `island_boundary_no_fall` | **Thay** bằng `island_edge_fall` | Rơi khỏi đảo giờ có phạt (C3) |
| `pickup_radius_boundary`, `deposit_*`, `interact_edge_trigger`, `pulse_*`, `shade_hit_invuln_lose`, `unlit_lantern_no_protection`, `safe_radius_blocks`, `win_all_lit`, `lose_dawn` | Tính lại | Đổi số chuẩn, điểm, cơ chế đẩy/lùi (C1, C2, C5) |
| `interact_edge_trigger` | Thay bằng `pulse_cooldown_edge` + `interact_nearest_tiebreak` | Đom đóm mang tối đa 10 nên không còn nạp 2 đèn liên tiếp trong 1 scenario; kiểm tra cạnh lên bằng nút tỏa sáng |
| `smoke_default` | Tính lại | 20 đom đóm ban đầu, Bóng Mực sinh tại tick 300 |

## 6. Quyết định thiết kế

- **Địa hình bằng một hàm `height(x,z)`** (`-Infinity` = hư không, `+Infinity` = vật cản). Mặt đất, vách, dốc, tháp, rơi khỏi đảo đều suy ra từ một quy tắc (B19) nên 3 bản đồ dùng chung một bộ va chạm; thêm đêm mới chỉ thêm một hàm.
- **Thứ tự 12 bước của ticket nằm nguyên văn trong `stepGame`** (có chú thích đầu file) để chỗ nào đổi thứ tự là thấy ngay.
- **Một nguồn số chuẩn** (`tuning.js`) và `check-contract.js` còn giữ một bảng số viết tay thứ hai, nên gõ sai ở `tuning.js` hay ở contract đều bị bắt.
- **Kiểm chứng giữ nguyên hướng hộp đen**: runner gọi đúng `headless_cmd`; bổ sung mutation check và lộ trình chơi được (Đêm 2, Đêm 3) làm bằng chứng game hoàn thành được, không chỉ từng luật rời rạc.

## 7. Nhật ký dùng AI

Công cụ: **Claude Code** trong VS Code (Windows 11), phiên làm việc đọc ticket qua Chrome (iframe cách ly nên đọc bằng ảnh chụp từng đoạn).

| Bước | Việc | Kết quả |
|---|---|---|
| Đọc yêu cầu | Truy cập `ArtifactData` bị chặn (artifact công khai ngoài tổ chức); mở trang bằng Chrome đã đăng nhập, cuộn và chụp ~15 đoạn, phóng to chỗ bị con trỏ che (toạ độ bục nhảy `(20,0,18)`) | Ticket-02 đầy đủ 4 phần + DoD |
| Spec trước code | Viết `phase-2.md` (30 giả định, tiêu chí cho từng mục Phần 3, kế hoạch kiểm chứng) rồi mới code | Xong trước khi viết `game.js` |
| Xây dựng | Viết lại `tuning/maps/game/validate/output`, CLI v1.1, validator, runner, generator 66 scenario, client 3 đêm | Xong |
| Kiểm chứng | Chạy scenario/unit/determinism/mutation/bot; duyệt bằng Playwright; đo FPS | Xem report |

**Các lần AI sai và cách phát hiện:**

| # | Sai ở đâu | Phát hiện thế nào | Sửa / chỉnh harness |
|---|---|---|---|
| E1 | Hàm `ring()` sinh điểm lặp đến 360° nên trùng điểm 0°: 26 điểm đom đóm thay vì 24 | Unit test đếm điểm sinh ("24, 24, 30") đỏ | Sửa `ring()` (không lặp điểm đầu); test giữ nguyên |
| E2 | Unit test viết sai luật: tưởng vừa thắp đèn cuối vừa bị chạm cùng tick, nhưng vùng an toàn của đèn vừa sáng đẩy Bóng Mực ra | Test đỏ, đọc lại luật | Sửa **test** (kiểm "hết lửa luôn thua trước" bằng scenario 0 lửa); ghi vào bài học AGENTS.md |
| E3 | Test Gió Lạc cho mang 2 đom đóm, quên rằng < 5 thì Gió Lạc tự về `idle` | Test đỏ | Sửa test, thêm kiểm "mang < 5 không cướp" |
| E4 | Scenario `step_off_tier` đặt Mây ngay cạnh bục nhảy (0,3,13) nên bị bắn đi | Số liệu lạ (y tăng, z đổi nhanh) trong thông báo FAIL | Dời điểm xuất phát; bài học: scenario địa hình phải tránh bục nhảy |
| E5 | **Lỗi code thật**: tại tick bục phóng, `vel` vẫn ghi vận tốc đi bộ `[0,14,6]`, trong khi ticket nói Mây có vận tốc phóng ngay | `jump_pad_night2` (expect tính tay từ ticket) FAIL | Sửa code: `vel` = vận tốc phóng ngay từ tick đó |
| E6 | Bot đọc tên trường cũ `pulseCdTicks` (đã đổi thành `pulseCd`) nên không bao giờ tỏa sáng; sau khi sửa lại tỏa sáng quá nhiều (mỗi lần tốn 3 đom đóm) và bước ra khỏi mép đảo (mất lửa vì rơi) | Bảng bot: "xua 0", thua `no_flames` với 0 lần trúng; rồi thua `dawn` 8/8 | Sửa tên trường, chỉ tỏa sáng khi Bóng Mực `chase` áp sát < 2.2 m, không bước ra r > 37 m; bài học đổi tên trường ghi vào AGENTS.md |
| E7 | Mutation sống sót: bất tử hồi sinh 90 → 60 tick vẫn qua | `npm run mutation` báo 24/25 | Thêm kiểm biên tick 230/231 vào `island_edge_fall`; chạy lại 25/25 |
| E8 | Biểu tượng hồi chiêu CSS thiếu `position: absolute` nên chồng lên khung Ngọn Lửa | Ảnh chụp HUD | Sửa CSS, chụp lại |
| E9 | Bỏ sót tiến trình Vite cũ giữ cổng 5173 (TaskStop chỉ dừng lớp bọc) → server mới báo "Port in use"; PowerShell `$port:` bị hiểu là tên ổ đĩa | Thông báo lỗi khi mở server | Kiểm tra tiến trình theo cổng, dừng đúng tiến trình `vite`; thêm "dừng server khi xong" vào skill `verify-game` |
| E10 | Sửa `scene.js` khi đang duyệt thử làm Vite tải lại trang, ván về menu nên phép thử tạm dừng không áp dụng | Trạng thái `ui: "menu"` bất ngờ | Làm lại phép thử; không sửa file nguồn giữa lúc duyệt |

Hook `PostToolUse` báo đỏ liên tục lúc đang viết lại lõi (E1–E5 một phần): đúng thiết kế (ép sửa), nhưng ồn. Giữ nguyên vì hook Stop mới là chốt chặn thật.

**Chống "test luôn đạt"**: 25 mutation (hằng số chuẩn, edge-trigger, bỏ bất tử, vách, nạp quá mức, thưởng thời gian...) đều bị ≥ 1 scenario giết ([mutation.json](../proof/phase-2/mutation.json)). Expect của 66 scenario tính tay; lần chạy đầu 62/64 PASS (lúc đó 64 scenario; sau đó thêm 2 lộ trình chơi được, cả hai PASS ngay) và 2 lỗi còn lại đều có nguyên nhân thật (E4 lỗi scenario, E5 lỗi code), không "sửa expect cho khớp".

**Token / chi phí**: *chưa đo chính xác trong phiên này*; cần điền từ `/cost` trước khi tag `phase-2`.

| Phase | Token vào / ra (ước tính) | Chi phí ước tính | Cách tiết kiệm đã dùng |
|---|---|---|---|
| 2 | _điền từ /cost_ | _điền_ | Spec và giả định viết trước khi code (ít vòng sửa); cuộn trang ticket theo đoạn thay vì chụp lại; sinh 66 scenario bằng một generator thay vì viết tay từng file; chạy mutation nền trong lúc viết tài liệu; chỉ chụp ảnh có chọn lọc |

## 8. Đánh giá Phase 2

- **Đạt**: toàn bộ mục Phần 1–4 và DoD có bằng chứng (xem [report.md](../proof/phase-2/report.md)); `npm run verify` xanh; client ~60 FPS, headless một đêm ≈ 0.4–0.6 s.
- **Không hỏng Phase 1** theo kiểm chứng của mình: mọi luật Phase 1 còn lại (tick model, cạnh lên, chuẩn hóa vector, đội hình event, `end` cuối, tất định, mã thoát 0/1/2) vẫn được kiểm bằng scenario; những chỗ ticket thay luật đã sửa kèm lý do ở mục 5.
- **Chưa làm / rủi ro**:
  - Chưa commit, tag `phase-2`, push (người dùng tự làm); chưa điền token.
  - Test ẩn của giảng viên có thể khác 30 giả định B1…B30. Rủi ro cao nhất: B25 (`night_start` ở tick 1), B20 (cơn gió đầu ở tick 1800), B3 (điểm xuất phát Đêm 2, 3), B24 (đọc "biến mất sau 120 tick"), B6–B8 (`spawning`/`wander`). Mọi số nằm ở `tuning.js`/`maps.js`.
  - Âm thanh chưa nghe thực tế; chưa kiểm màu bằng đo pixel; chưa có bot hoàn thành Đêm 2, 3.
  - `npm audit` vẫn báo lỗ hổng moderate ở dev server của Vite (không nằm trong bản build).
- **Lịch sử git (quan trọng cho người chấm)**: Phase 1 **chưa từng được commit** trước khi làm Phase 2 (hai phase cùng nằm trong một thư mục làm việc, mã Phase 1 bị ghi đè). Khi commit, cây Phase 1 được **dựng lại** từ bản sao các phiên bản file mà Claude Code lưu trong phiên (file-history) + các file không đổi, rồi tag `phase-1`. Đã kiểm chứng bản dựng lại trước khi tag: 28/28 unit test, 26/26 scenario, bundle client build ra cùng tên băm với lần build đầu tiên, và bốn mã băm tất định (`63092b5f…`, `7eed1afa…`, `dd4263b9…`, `514a961a…`) trùng từng ký tự với `docs/proof/phase-1/determinism.json` ghi từ lần chạy Phase 1 thật. Thời điểm commit/tag là thời điểm thật (sau hạn `phase-1` của lab), không chỉnh ngày.
- **Cần chỉnh harness cho Phase 3**: Phase 3 "có thể thay luật cũ": thêm vào skill bước "liệt kê scenario bị ảnh hưởng trước khi code" (đã làm ở mục 5 của file này, nên tái dùng mẫu bảng đó).
