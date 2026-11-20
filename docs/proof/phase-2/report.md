# Bằng chứng Phase 2: truy vết Yêu cầu → Kiểm chứng → Bằng chứng

Kết quả tự sinh (không sửa tay): [results.md](results.md). Chạy lại ở tag `phase-2`: `npm ci && npm run proof -- --phase 2`.
Nguồn yêu cầu: Ticket-02 (tab Phase 2 của lab board). Giả định cho chỗ ticket chưa nói: [docs/notes/phase-2.md](../../notes/phase-2.md) mục 2 (B1…B30).
Mọi `expect.json` tính **tay** từ ticket; công thức ở [tests/scenarios/_generate.mjs](../../../tests/scenarios/_generate.mjs) và trong `description` của từng scenario.
Đường dẫn bằng chứng scenario có dạng `scenarios/<tên>.jsonl` (output headless thật).

## Phần 1: Số liệu chuẩn

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| S1 | Chạy 6.0 m/s, tăng tốc/dừng ≤ 0.1 s, trên không điều khiển đủ | `move_forward`, `move_cam_yaw90`, `move_diagonal_normalized`, `input_fields_persist` | [move_forward](scenarios/move_forward.jsonl) | Đạt (tăng tốc tức thời, giả định B1) |
| S2 | Nhảy 7.0 m/s, g −20, chỉ nhảy khi chạm đất | `jump_arc` (y₁₀=0.861, đỉnh 1.167, chạm đất tick 41, giữ nút không nhảy lại) | [jump_arc](scenarios/jump_arc.jsonl) | Đạt |
| S3 | Lướt 14 m/s × 0.2 s, hồi chiêu 1.5 s từ lúc bắt đầu, giữ độ cao, bấm lúc đang lướt bị bỏ | `dash_cooldown`, `dash_air_altitude`, `charm_dash_no_cooldown` | [dash_cooldown](scenarios/dash_cooldown.jsonl) | Đạt |
| S4 | Đom đóm: mang 10; nhặt XZ ≤ 1.0 và chênh cao ≤ 1.5; 20 lúc đầu ở 20 điểm khác nhau, trần 30, +1 mỗi 240 tick | `carry_capacity_full`, `pickup_radius_boundary`, `pickup_height_ok`, `pickup_height_too_high`, `pickup_tier_mismatch`, `mote_cap_30`, `smoke_default`, unit test điểm sinh | [pickup_height_too_high](scenarios/pickup_height_too_high.jsonl) | Đạt |
| S5 | Đèn: cost 10, nạp nhiều lần, nhớ tiến độ; interact 2.0 m, nạp `min(mang, còn thiếu)` vào MỘT đèn chưa sáng gần nhất, hòa thì id nhỏ | `deposit_and_light`, `deposit_partial_remembered`, `deposit_overflow`, `deposit_out_of_range`, `interact_nearest_tiebreak` | [deposit_overflow](scenarios/deposit_overflow.jsonl) | Đạt |
| S6 | Vùng an toàn 6 m: Bóng Mực bị chặn ở mép; con đang ở trong bị đẩy ra ≤ 30 tick, không gây sát thương | `safe_radius_blocks`, `safe_zone_expels_inside`, `lantern_lit_expels_shade`, `unlit_lantern_no_protection` | [safe_zone_expels_inside](scenarios/safe_zone_expels_inside.jsonl) | Đạt |
| S7 | Tỏa sáng 3 đom đóm / 5 m 3D / 3 s: choáng 120 tick, đẩy 4 m trong 15 tick, làm mới khi tỏa sáng lại, không đủ 3 thì không kích hoạt, +5 điểm mỗi con | `pulse_stun_push`, `pulse_cooldown_edge`, `pulse_insufficient_light` + unit test | [pulse_stun_push](scenarios/pulse_stun_push.jsonl) | Đạt |
| S8 | Bóng Mực: 4.0 m/s, phát hiện 12 / bỏ 18 m, chạm XZ ≤ 1.0 và chênh cao ≤ 1.5, ≤ 1 hit/tick, lùi 2 m/60 tick, chạm lúc bất tử không làm gì | `shade_detect_giveup`, `shade_hit_invuln_lose`, `shade_spawning_harmless`, unit test (id tự nhiên, 1 hit/tick) | [shade_hit_invuln_lose](scenarios/shade_hit_invuln_lose.jsonl) | Đạt (đo 3D của tỏa sáng và `spawning`/`wander` theo giả định B6–B9) |
| S9 | Lịch sinh: 2 con ở tick 300 rồi 1 con mỗi 8/7/6 s, tối đa 6/8/10, id S1, S2… | `shade_spawn_schedule_n1`, `shade_spawn_schedule_n3`, `smoke_default` | [shade_spawn_schedule_n3](scenarios/shade_spawn_schedule_n3.jsonl) | Đạt (Đêm 2 chỉ qua tính toán cùng cơ chế, chưa có scenario riêng) |
| S10 | Bị đánh: −1 lửa, rơi `floor(mang/2)` trên vành 1.5–2.5 m (TTL 480 tick), bất tử 90 tick | `shade_hit_invuln_lose` + unit test vành 1.5–2.5 m | [shade_hit_invuln_lose](scenarios/shade_hit_invuln_lose.jsonl) | Đạt |
| S11 | Rơi khỏi đảo (Y < −10): đúng 1 lần, bỏ qua bất tử, −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh bất tử 90 tick; hết lửa thì thua ngay | `island_edge_fall` (kiểm biên bất tử tick 230/231), `fall_last_flame_lose`, `bridge_no_rails_fall` | [island_edge_fall](scenarios/island_edge_fall.jsonl) | Đạt |
| S12 | Thắng/thua sau mỗi tick: hết lửa luôn thua; còn sống + đủ đèn thắng (kể cả đúng tick hết giờ); hết giờ thua `dawn` | `win_all_lit`, `win_at_last_tick`, `lose_dawn`, unit test thứ tự ưu tiên | [win_at_last_tick](scenarios/win_at_last_tick.jsonl) | Đạt |
| S13 | Điểm: +10 mỗi đom đóm NẠP, +100 đèn, +5 mỗi Bóng Mực trúng, thắng `floor(giây)×2 + 50×lửa` | `deposit_and_light` (200), `win_all_lit` (948), `pulse_stun_push` (5); client: 948 + 1008 + 1068 = 3024 | [win_all_lit](scenarios/win_all_lit.jsonl), [ảnh Bình Minh](09-dawn.png) | Đạt |
| S14 | Thứ tự xử lý trong một tick (12 bước) | Cài đặt theo đúng thứ tự trong `stepGame`; kiểm gián tiếp: Gió Lạc cướp trước Bóng Mực, pause đọc trước, thực thể mới sinh chỉ tương tác từ tick sau | `src/sim/game.js` đầu file, `pause_resume` | Đạt (không có scenario riêng cho thứ tự cướp/hit cùng tick) |

## Phần 2: Bản đồ chuẩn

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| M1 | Đêm 1: đảo r=40, xuất phát (0,0,0), 5 đèn tọa độ chuẩn, 24 điểm đom đóm (8 + 16), 12 điểm Bóng Mực | `smoke_default` (tick 0), unit test | [smoke_default](scenarios/smoke_default.jsonl), [ảnh](03-night1-hud.png) | Đạt |
| M2 | Đêm 2: 2 đảo r=28, cầu tre x∈[26,44] |z|≤2 không lan can, 2 bục nhảy (20,0,18)/(50,0,−18), 6 đèn, 24 điểm đom đóm, 16 điểm Bóng Mực, bùa C1 | `night2_defaults`, `bridge_no_rails_fall`, `jump_pad_night2` (bay đúng quỹ đạo, hạ cánh đảo B ở tick 84), `night2_route_cross_bridge` | [jump_pad_night2](scenarios/jump_pad_night2.jsonl), [ảnh](04-night2-bridge-pad.png) | Đạt |
| M3 | Đêm 3: 3 tầng, vách đứng, 2 dốc 30° rộng 3 m (r 30→24, Y 0→3), bục nhảy (0,3,13), tháp r=2, 30 điểm đom đóm, 7 đèn, bùa C1/C2 | `night3_defaults`, `ramp_climb`, `cliff_blocks`, `step_off_tier`, `tower_blocks`, `jump_pad_night3`, `night3_route_to_L1` | [night3_route_to_L1](scenarios/night3_route_to_L1.jsonl), [ảnh](05-night3-tiers.png) | Đạt |
| M4 | Góc đo từ +X, `z = +r·sinθ` | Dùng ở ramp/điểm sinh/bục nhảy; khớp hình học yêu cầu (tầng 1 chỉ ở z>0) | giả định B2 | Đạt (suy luận từ hình học ticket) |

## Phần 3: Tính năng mới

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| F1 | **Gió Lạc**: 7 m/s, tối đa 2, tick 1200/2400, id D1…; idle → chase khi mang ≥ 5 và ≤ 15 m; chạm ≤ 1.2 m cướp `min(3, mang)` rồi flee 240 tick; tỏa sáng khi chase → flee không cướp; khi flee có đồ → thả tại chỗ; không mất lửa | `drifter_steal`, `drifter_pulse_chase`, `drifter_pulse_drop`, `drifter_spawn_schedule` + unit test | [drifter_steal](scenarios/drifter_steal.jsonl), [ảnh](10-night2-drifter-charm-shades.png) | Đạt (giả định B21–B24: điểm sinh, tốc độ idle, "biến mất sau 120 tick") |
| F2 | **Bùa Gió**: nhặt như đom đóm, 600 tick (nhặt lại làm mới), chạy 7.2 m/s, lướt không hồi chiêu, xuất hiện lại sau 2700 tick, id C1/C2 | `charm_pickup_speed`, `charm_expiry`, `charm_dash_no_cooldown`, `charm_respawn` | [charm_pickup_speed](scenarios/charm_pickup_speed.jsonl) | Đạt (nhặt lại để làm mới chưa có scenario riêng) |
| F3 | **Gió mạnh** (Đêm 3): mỗi 30 s một cơn 5 s, hướng ngẫu nhiên, đẩy 2 m/s, báo trước 2 s | `wind_gust` (đẩy đúng 10 m theo `dir_deg`), client: lá bay + chữ "Gió sắp nổi" | [wind_gust](scenarios/wind_gust.jsonl), [ui-checks.json](ui-checks.json) | Đạt (cơn gió đầu ở tick 1800 là giả định B20) |
| F4 | **Chuỗi 3 đêm**: menu → giới thiệu (tên đảo, lời Ông Đăng) → chơi → kết quả → đêm kế → Bình Minh; thua chơi lại đêm đó | Duyệt bằng trình duyệt thật | [menu](01-menu.png), [giới thiệu](02-intro-night1.png), [kết quả](08-result-night3-win.png), [Bình Minh](09-dawn.png) | Đạt (dùng scenario thắng nhanh cho từng đêm trong lúc duyệt luồng màn hình) |
| F5 | **Tạm dừng** Esc/P: logic dừng hẳn; Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu | `pause_resume` (headless) + trình duyệt: sau 1.5 s tạm dừng `sim_tick` và thời gian không đổi | [pause_resume](scenarios/pause_resume.jsonl), [ảnh](06-pause-menu.png) | Đạt |
| F6 | **Cài đặt** (âm lượng, độ nhạy chuột) lưu giữa các lần mở | Trình duyệt: đổi 30% / ×2.0, tải lại trang, giá trị còn nguyên | [ảnh](07-settings.png), [settings-persist.json](settings-persist.json) | Đạt |
| F7 | **Âm thanh**: nhạc nền đêm + hiệu ứng nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s | Cài đặt trong `src/client/audio.js`, kích hoạt từ sự kiện sim | — | **Chưa kiểm chứng**: chỉ kiểm tra không phát sinh lỗi console; chưa nghe thực tế (môi trường tự động không có đầu ra âm thanh) |
| F8 | **HUD đủ**: Ngọn Lửa (trên trái), mm:ss (trên giữa, đỏ + nhấp nháy ≤ 30 s), đèn k/n + điểm (trên phải), thanh đom đóm 10 ô, hồi chiêu Lướt/Tỏa sáng (dưới phải), nhắc "E — Nạp ánh sáng (x/10)", mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình | Ảnh từng đêm + `ui-checks.json` (lớp `urgent`/`blink` của đồng hồ, nội dung nhắc nạp) | [HUD Đêm 1](03-night1-hud.png), [Đêm 3](05-night3-tiers.png), [ui-checks.json](ui-checks.json) | Đạt |
| F9 | **Bảng màu chuẩn** (±10%/kênh) và ánh sáng môi trường `0.15 + 0.55 × (đèn sáng / tổng)` | Dùng đúng mã màu của ticket trong `PAL` (scene.js) và biến CSS; công thức ở `scene.js` | `src/client/scene.js` | Đạt theo thiết kế; **chưa đo màu trên ảnh chụp** |

## Phần 4: Test Contract v1.1

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| C1 | `contract_version "1.1"`, tuning khớp số chuẩn + khóa mới `dash_*`, `night2/3_duration_s` | `npm run contract` (đối chiếu cả với bảng số viết tay trong script) + `contract.test.js` | [results.md](results.md) | Đạt |
| C2 | `--night 1\|2\|3`; sai thì mã thoát ≠ 0 | `bad_night_argument` (--night 4 → exit 1), `cli.test.js` | [results.md](results.md) | Đạt |
| C3 | Snapshot thêm `night`, `wind`, `player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}`, mảng `motes/drifters/charms` | Validator `scripts/lib/jsonl.js` chạy trên mọi output | [results.md](results.md) | Đạt |
| C4 | Scenario thêm `player.{invuln_ticks,…}`, `shades[].{state,state_ticks_left}`, `drifters`, `charms`, `random_drifters`, `wind_enabled`; input `dash`, `pause` | Dùng trong các scenario trên; `bad_*` kiểm sai định dạng → exit 2 | [results.md](results.md) | Đạt |
| C5 | Event mới `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`; `player_hit` do rơi có `lost` | Có trong expect của các scenario tương ứng | [results.md](results.md) | Đạt (`night_start` ở tick 1 là giả định B25) |
| C6 | Tên trạng thái Bóng Mực: `spawning, wander, chase, recoil, stunned` | Validator từ chối tên khác (kể cả scenario đầu vào) | `bad_scenario_shade_state` | Đạt |
| C7 | Headless 1 đêm đầy đủ (≤ 21 600 tick) ≤ 30 s | Đo cả 3 đêm, mỗi đêm 3 lần | [results.md](results.md) mục Hiệu năng (≈ 1 s) | Đạt |

## Định nghĩa hoàn thành (DoD)

| Mục | Kết quả |
|---|---|
| Bằng chứng game chạy đúng yêu cầu của phase | Đạt: file này + [results.md](results.md) + ảnh + JSONL |
| Test ẩn Phase 1 vẫn đạt với số chuẩn (hồi quy) | **Không thể tự kiểm** (test ẩn không công bố). Đã tính lại toàn bộ scenario Phase 1 với số chuẩn và ghi lý do thay đổi ở notes mục 5; tuning trong contract = số chuẩn |
| Spec có acceptance criteria cho từng mục Phần 3 | Đạt: [docs/notes/phase-2.md](../../notes/phase-2.md) mục 3 |
| AGENTS.md và skill cập nhật cho phạm vi mới (lịch sử git thể hiện) | Đã sửa `AGENTS.md`, skill `verify-game`; **lịch sử git chỉ thể hiện sau khi commit** (phiên này chưa commit) |
| ≥ 1 scenario headless cho mỗi tính năng mới | Đạt (Gió Lạc 4, Bùa Gió 4, gió 1, bục nhảy 2, tạm dừng 1, lướt 3, rơi 3, địa hình 5) |
| Bản thường ≥ 30 FPS trung bình ở 1280×720 | Đạt: 60 FPS cả 3 đêm trên AMD Radeon, xem [fps.json](fps.json) |

## Mutation: test không phải loại luôn đạt

[mutation.json](mutation.json): sửa cố ý hằng số/logic trong bản sao tạm, mỗi mutation phải làm ≥ 1 scenario FAIL. Lần chạy đầu 24/25 bị giết; mutation sống sót duy nhất (bất tử hồi sinh 90 → 60 tick) chỉ ra thiếu kiểm tra biên trong `island_edge_fall`, đã bổ sung (bất tử còn ở tick 230, hết ở tick 231).

## Chưa đạt / giới hạn

- Chưa commit, tag `phase-2`, push (phiên này không commit). Chạy lại `npm run proof -- --phase 2` **sau** commit cuối, trước khi tag, để `results.md` ghi đúng hash.
- Âm thanh chưa nghe thực tế (F7). Kéo chuột để xoay camera chưa có ảnh/GIF.
- Chưa có bot hoàn thành Đêm 2 và 3 (chỉ có lộ trình scripted tới một đèn mỗi đêm); bot Đêm 1 thắng 8/8 seed.
- Nhiều chi tiết ticket chưa nêu (B1…B30). Test ẩn của giảng viên có thể khác giả định; mọi số nằm ở `tuning.js` nên chỉnh một chỗ.
- Hồi quy Phase 1: các số chuẩn đã thay giá trị tự chọn nên `phase-1/results.md` chỉ còn đúng ở tag `phase-1`, không tái hiện được ở HEAD.
