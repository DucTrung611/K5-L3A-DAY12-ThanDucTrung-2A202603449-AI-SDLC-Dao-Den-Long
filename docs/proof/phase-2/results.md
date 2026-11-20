# Kết quả kiểm chứng Phase 2 (tự sinh bởi `npm run proof -- --phase 2`)

- Thời điểm: 2026-11-20T09:02:49.828Z
- Mã nguồn: commit `9818fc1` + thay đổi chưa commit
- Máy: Windows_NT 10.0.26300 · AMD Ryzen 7 5700U with Radeon Graphics ×16 · RAM 15 GB · Node v24.14.0
- Tổng: **TẤT CẢ ĐẠT**

| Kiểm chứng | Lệnh | Kết quả |
|---|---|---|
| Contract v1.1 khớp số chuẩn | `npm run contract` | ĐẠT |
| Unit test | `npm test` | ĐẠT (45 pass / 0 fail) – [unit-tests.tap](unit-tests.tap) |
| Scenario headless (hộp đen qua CLI) | `npm run scenarios` | 66/66 ĐẠT – [scenarios.json](scenarios.json) |
| Tất định (3 đêm × 3 seed × 2 lần, trọn đêm) | `npm run determinism` | ĐẠT – [determinism.json](determinism.json) |
| Bot chơi Đêm 1 từ đầu tới kết thúc + phát lại CLI | `npm run bot` | thắng 5/5, phát lại khớp – [bot.json](bot.json) |
| Headless 1 đêm đầy đủ ≤ 30 s | (xem mục Hiệu năng) | ĐẠT |
| Mutation (test không phải loại luôn đạt) | `npm run mutation` | 25/25 bị giết – [mutation.json](mutation.json) |
| Client ≥ 30 FPS ở 1280×720 (bản build thường) | Playwright (xem [fps.json](fps.json)) | ĐẠT: Đêm 1 60 FPS, Đêm 2 60 FPS, Đêm 3 60 FPS – ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164C) Direct3D11 vs_5_0 ps_5_0, D3D11) |

## Scenario

| Scenario | Yêu cầu | Mô tả (expect tính tay) | Kết quả | Output |
|---|---|---|---|---|
| `bad_inputs_move_range` | R2 | move ngoài [-1,1] -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_inputs_pause_type` | R2/C7 | pause không phải boolean -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_inputs_tick_order` | R2 | inputs có tick không tăng nghiêm ngặt -> exit 2 + stderr | ĐẠT | (exit ≠ 0, không có output) |
| `bad_night_argument` | C7 | --night 4 không hợp lệ -> exit 1 (lỗi tham số) + stderr | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_json` | R2 | scenario.json không phải JSON hợp lệ -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_lantern_id` | R2 | scenario tham chiếu đèn không tồn tại L9 -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_lantern_wrong_night` | R2/C7 | L6 chỉ có từ Đêm 2: ở Đêm 1 -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_shade_state` | R2/C7 | state Bóng Mực ngoài {spawning,wander,chase,recoil,stunned} -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bridge_no_rails_fall` | C4 | Đêm 2: cầu tre rộng /z/ ≤ 2, không lan can: đi +Z từ giữa cầu, z=2.0 ở tick 20 còn đứng được, tick 21 ra khỏi cầu -> rơi, player_hit by fall ở tick 81 | ĐẠT | [jsonl](scenarios/bridge_no_rails_fall.jsonl) |
| `carry_capacity_full` | R6 | Đang mang đủ carry_capacity (10) thì không nhặt thêm; đom đóm vẫn nằm đó | ĐẠT | [jsonl](scenarios/carry_capacity_full.jsonl) |
| `charm_dash_no_cooldown` | Bùa Gió | Còn bùa: lướt không hồi chiêu (dash_cd_s luôn 0). Lướt tick 1..12 (z=2.8); bấm lúc đang lướt (tick 6) bị bỏ; bấm tick 15 lướt ngay lần hai (không chờ hồi chiêu) -> z = 5.6 ở tick 26 | ĐẠT | [jsonl](scenarios/charm_dash_no_cooldown.jsonl) |
| `charm_expiry` | Bùa Gió | Còn 5 tick bùa: tick 1..4 chạy 7.2 m/s (0.12 m/tick, z=0.48 ở tick 4), tick 5 bùa hết (charm_s 0) quay về 6.0 m/s | ĐẠT | [jsonl](scenarios/charm_expiry.jsonl) |
| `charm_pickup_speed` | Bùa Gió | Nhặt bùa ở XZ ≤ 1.0 (z=2.0 ở tick 20): charm_picked {C1, 600}; bùa biến mất, hồi sau 2700 tick (45 s); từ tick 21 chạy 7.2 m/s (z = 2.0 + 0.12·t); charm_s đếm ngược từ 10 s | ĐẠT | [jsonl](scenarios/charm_pickup_speed.jsonl) |
| `charm_respawn` | Bùa Gió | Bùa đang hồi (còn 10 tick) xuất hiện lại đúng tick 10 | ĐẠT | [jsonl](scenarios/charm_respawn.jsonl) |
| `cliff_blocks` | C4 | Đêm 3: vách tầng 2 (r ≤ 8) là vách đứng, không đi lên được: đi +Z từ z=-9 dừng ở z=-8.1 (bước kế tiếp r=8.0 đã thuộc tầng 2) | ĐẠT | [jsonl](scenarios/cliff_blocks.jsonl) |
| `dash_air_altitude` | Lướt | Lướt trên không giữ nguyên độ cao: nhảy tick 1; tick 10 y = 0.861; lướt tick 11..22 y đứng yên 0.861 (hướng mặt +Z, đi 2.8 m); sau lướt rơi từ nghỉ: y_k = 0.861 - k(k+1)/360, chạm đất ở k=18 -> tick 40 | ĐẠT | [jsonl](scenarios/dash_air_altitude.jsonl) |
| `dash_cooldown` | C6/Lướt | Lướt 14 m/s × 12 tick (0.2333 m/tick, giữ độ cao), hồi chiêu 90 tick từ lúc bắt đầu: bấm ở tick 11 -> dash; z = 1.0 + 0.2333·t; tick 22 z=3.8 cd 79 tick (1.317 s); bấm ở tick 31 (còn hồi chiêu) bị bỏ; hết hồi chiêu đúng tick 101 -> dash thứ hai | ĐẠT | [jsonl](scenarios/dash_cooldown.jsonl) |
| `deposit_and_light` | R7/C2 | Mang 10, cách L1 1.5 m (≤ 2.0), nhấn interact -> nạp 10 (lantern_cost 10), L1 sáng. Điểm = 10·10 (mỗi đom đóm NẠP) + 100 (đèn) = 200 | ĐẠT | [jsonl](scenarios/deposit_and_light.jsonl) |
| `deposit_out_of_range` | R7 | Cách L1 2.001 m (> interact_radius 2.0) thì nhấn interact không có tác dụng | ĐẠT | [jsonl](scenarios/deposit_out_of_range.jsonl) |
| `deposit_overflow` | R7 | L1 đã 8/10, mang 5 -> chỉ nạp 2 (min(đang mang, còn thiếu)), còn giữ 3. Điểm = 2·10 + 100 = 120 | ĐẠT | [jsonl](scenarios/deposit_overflow.jsonl) |
| `deposit_partial_remembered` | R7 | Đèn nhớ tiến độ: L1 đã có 3/10, nạp 4 -> 7/10 chưa sáng, +40 điểm (đúng biên 2.0 m). Lần bấm thứ hai không còn gì để nạp | ĐẠT | [jsonl](scenarios/deposit_partial_remembered.jsonl) |
| `drifter_pulse_chase` | Gió Lạc | Tỏa sáng trúng Gió Lạc đang chase (3D 4.005 ≤ 5) -> flee, KHÔNG cướp (stolen 0); không cộng điểm (chỉ Bóng Mực được +5) | ĐẠT | [jsonl](scenarios/drifter_pulse_chase.jsonl) |
| `drifter_pulse_drop` | Gió Lạc | Tỏa sáng trúng Gió Lạc đang flee có đồ: thả lại 3 đom đóm tại chỗ (kind dropped, TTL 480 tick: ở tick 10 còn 471 = 7.85 s, hết ở tick 481), Gió Lạc biến mất sau tối đa 120 tick (tick 120) | ĐẠT | [jsonl](scenarios/drifter_pulse_drop.jsonl) |
| `drifter_spawn_schedule` | Gió Lạc | Gió Lạc sinh ở tick 1200 (D1) và 2400 (D2), tối đa 2 con: tick 3600 không sinh thêm. Người chơi không mang đom đóm nên chúng luôn idle | ĐẠT | [jsonl](scenarios/drifter_spawn_schedule.jsonl) |
| `drifter_steal` | Gió Lạc | Mang 6 ≥ 5 và cách 10 m ≤ 15: idle -> chase (7 m/s, x = 10 - 0.1167 t); chạm ≤ 1.2 m lần đầu ở t=76 (x=1.133) -> drifter_steal {amount 3, carried 3}, flee 240 tick rồi biến mất (tick 316) | ĐẠT | [jsonl](scenarios/drifter_steal.jsonl) |
| `fall_last_flame_lose` | C3 | Rơi khi chỉ còn 1 lửa: thua ngay no_flames ở tick 81, không hồi sinh | ĐẠT | [jsonl](scenarios/fall_last_flame_lose.jsonl) |
| `input_fields_persist` | R3 | Trường vắng giữ giá trị cũ: tick 30 chỉ đổi yaw 180° nên move [0,1] vẫn giữ -> đi ngược về gốc; tick 60 dừng | ĐẠT | [jsonl](scenarios/input_fields_persist.jsonl) |
| `interact_nearest_tiebreak` | R5 | L1 (z=25) và L2 (z=21) cùng cách 2.0 m: chọn đèn id nhỏ hơn (L1); L2 không bị đụng tới | ĐẠT | [jsonl](scenarios/interact_nearest_tiebreak.jsonl) |
| `island_edge_fall` | C3 | Rơi khỏi đảo (thay island_boundary_no_fall): chạy +X từ x=38, x=40 ở tick 20 (còn đứng được), tick 21 ra hư không; rơi y_k = -k(k+1)/360 < -10 lần đầu ở k=60 -> tick 81: player_hit by fall {flames 2, dropped 0, lost 4}; chờ 60 tick (không nhặt, bị đóng băng); tick 141 hồi sinh tại (0,0,0) bất tử 90 tick (còn ở tick 230, hết ở tick 231) | ĐẠT | [jsonl](scenarios/island_edge_fall.jsonl) |
| `jump_arc` | R17/C1 | Nhảy 7.0 m/s, trọng lực 20 m/s²: y_n = (7n - n(n+1)/6)/60 -> tick 10: 0.861; tick 20: 1.167 (đỉnh); tick 41 chạm đất (y = 0 đúng); giữ nút không nhảy lại; vy tick 10 = 7 - 10·20/60 = 3.667 | ĐẠT | [jsonl](scenarios/jump_arc.jsonl) |
| `jump_pad_night2` | C4/Bục nhảy | Đêm 2: chân Mây chạm bục (20,0,18) ở tick 1 -> bắn lên vy 14 và 24 m/s về tâm đảo B (70,0,0). Bay k tick: y = (14k - k(k+1)/6)/60 (đúng 0 ở k=83), ngang = (24·(50,-18)/53.14)/60 mỗi tick; phím đi không ghi đè; chạm đất ở tick 84 trên đảo B | ĐẠT | [jsonl](scenarios/jump_pad_night2.jsonl) |
| `jump_pad_night3` | C4/Bục nhảy | Đêm 3: đứng trên tầng 1 (y=3) trong bán kính 1.0 m của bục (0,3,13) -> bắn vy 12 và 8 m/s hướng -Z. y = 3 + (12k - k(k+1)/6)/60, z = 12.5 - 8k/60; hạ cánh lên tầng 2 (y=6) ở k=49 (tick 50) tại z=5.967 | ĐẠT | [jsonl](scenarios/jump_pad_night3.jsonl) |
| `lantern_lit_expels_shade` | C1/C5 | Đèn vừa sáng ở tick 1: Bóng Mực cách đèn 3 m bị đẩy ra mép 6 m trong 30 tick (0.1 m/tick: z = 28 + 0.1 t), không chạm người chơi | ĐẠT | [jsonl](scenarios/lantern_lit_expels_shade.jsonl) |
| `lose_dawn` | R12 | time_left_s 1 -> hết giờ sau 60 bước: game_over lost/dawn ở tick 60, dừng sớm dù --ticks 200 | ĐẠT | [jsonl](scenarios/lose_dawn.jsonl) |
| `mote_cap_30` | C1 | Trần 30 đom đóm: có 29, tick 240 sinh thêm 1 (=30); tick 480 và 720 không sinh nữa | ĐẠT | [jsonl](scenarios/mote_cap_30.jsonl) |
| `move_cam_yaw90` | R4 | cam_yaw_deg=90, move [0,1]: x' = x·cosθ + z·sinθ = 1, z' = 0 -> đi +X, 6 m sau 60 tick | ĐẠT | [jsonl](scenarios/move_cam_yaw90.jsonl) |
| `move_diagonal_normalized` | R4 | move [1,1] dài √2 > 1 phải chuẩn hóa: mỗi trục 6/√2 = 4.243 m sau 60 tick | ĐẠT | [jsonl](scenarios/move_diagonal_normalized.jsonl) |
| `move_forward` | R3 | Tick model: tick 0 trước input; move [0,1] ở 6 m/s (tăng tốc tức thời ≤ 0.1 s) -> 1 m sau 10 tick, 6 m sau 60 tick; time_left_s = 300 - 60/60 | ĐẠT | [jsonl](scenarios/move_forward.jsonl) |
| `night2_defaults` | C4 | Đêm 2 mặc định: 330 s, xuất phát (0,0,0), 6 đèn tọa độ chuẩn, 20 đom đóm, bùa C1 sẵn sàng, chưa có Bóng Mực/Gió Lạc | ĐẠT | [jsonl](scenarios/night2_defaults.jsonl) |
| `night2_route_cross_bridge` | C4/Chơi được | Đêm 2: đi thẳng +X từ (0,0,0) qua cầu tre sang đảo B (x=70 ở tick 700, không rơi vì /z/ = 0), rồi +Z tới (70,0,19) (tick 890) và thắp L4 (70,0,20). Kiểm: không rơi, L4 sáng, điểm 200 | ĐẠT | [jsonl](scenarios/night2_route_cross_bridge.jsonl) |
| `night3_defaults` | C4 | Đêm 3 mặc định: 360 s, xuất phát (0,0,-20), 7 đèn tọa độ chuẩn (y=6, 3, 3, 0...), 20 đom đóm, hai bùa C1 C2, gió chưa thổi | ĐẠT | [jsonl](scenarios/night3_defaults.jsonl) |
| `night3_route_to_L1` | C4/Chơi được | Đêm 3: đèn L1 ở tầng 2 chỉ tới được bằng: đi vòng ngoài tầng 0 -> leo dốc 30° (r 30 -> 24) -> đi trên tầng 1 -> bục nhảy (0,3,13) -> hạ cánh tầng 2 -> nạp 10 đom đóm. Kiểm kết quả: L1 sáng, điểm 10·10 + 100 = 200, Mây đứng trên tầng 2 (y=6), không bị rơi/chạm | ĐẠT | [jsonl](scenarios/night3_route_to_L1.jsonl) |
| `pause_resume` | C6/Tạm dừng | Tạm dừng: bấm ở tick 11 -> event paused, state paused, tick vẫn tăng nhưng sim_tick/thời gian/vị trí đứng yên (sim 10, z=1.0, 299.833 s); bấm lại ở tick 31 -> resumed và bước đó chạy luôn (sim 11, z=1.1); tick 40: sim 20, z=2.0 | ĐẠT | [jsonl](scenarios/pause_resume.jsonl) |
| `pickup_height_ok` | C1 | Nhặt cần chênh cao chân Mây - mặt đất nơi đặt ≤ 1.5: Mây ở y=1.4 (đang rơi, tick 1 còn 1.394) nhặt ngay tick 1 | ĐẠT | [jsonl](scenarios/pickup_height_ok.jsonl) |
| `pickup_height_too_high` | C1 | Mây ở y=1.6 rơi tự do y_k = 1.6 - k(k+1)/360: k=5 -> 1.5167 (> 1.5, chưa nhặt), k=6 -> 1.4833 (≤ 1.5) nhặt đúng tick 6 | ĐẠT | [jsonl](scenarios/pickup_height_too_high.jsonl) |
| `pickup_radius_boundary` | R6/C1 | Nhặt khi XZ ≤ 1.0: đom đóm cách đúng 1.0 m được nhặt; cách 1.001 m thì không. Nhặt KHÔNG cộng điểm (Ticket-02: +10 khi NẠP) | ĐẠT | [jsonl](scenarios/pickup_radius_boundary.jsonl) |
| `pickup_tier_mismatch` | C1/C4 | Đêm 3: đom đóm trên tầng 2 (y=6) cách Mây 0.6 m theo XZ nhưng chân Mây ở tầng 0 (chênh 6 m > 1.5) -> không nhặt | ĐẠT | [jsonl](scenarios/pickup_tier_mismatch.jsonl) |
| `pulse_cooldown_edge` | R5/R8 | Cạnh lên + hồi chiêu 3 s = 180 tick: pulse tick 1; bấm ở tick 61 (còn hồi chiêu 120) bị bỏ; giữ nút qua tick 181 không kích hoạt lại (không có cạnh lên); bấm lại ở tick 201 -> pulse thứ hai. Mang 10 - 3 - 3 = 4 | ĐẠT | [jsonl](scenarios/pulse_cooldown_edge.jsonl) |
| `pulse_insufficient_light` | R8 | Mang 2 < pulse_cost 3 -> không kích hoạt: không event, không hồi chiêu, Bóng Mực không choáng | ĐẠT | [jsonl](scenarios/pulse_insufficient_light.jsonl) |
| `pulse_stun_push` | R8/C1/C5 | Tỏa sáng (3 đom đóm, 5 m 3D, cd 3 s): A cách 4 m (3D=4.005) choáng 120 tick + bị đẩy 4 m trong 15 tick đầu (4/15 mỗi tick: x = 4 + 0.267 t, đủ x=8 ở tick 15); B cách 12 m (không trúng) đuổi 4 m/s (x = 12 - t/15). +5 điểm. Choáng hết ở tick 121 -> chase | ĐẠT | [jsonl](scenarios/pulse_stun_push.jsonl) |
| `ramp_climb` | C4 | Đêm 3: dốc 30° dài 6 m từ chân (r=30, Y=0) lên đỉnh (r=24, Y=3), độ cao tuyến tính 0.5 m mỗi mét. Đi dọc trục dốc 6 m/s: tick 30 y=1.5, tick 60 y=3.0 (lên tầng 1) | ĐẠT | [jsonl](scenarios/ramp_climb.jsonl) |
| `safe_radius_blocks` | R10 | Đứng tại L1 đã sáng: Bóng Mực (11 m, chase) bị chặn ở mép 6 m quanh đèn -> dừng ở z = 25 + 6 = 31, không bao giờ chạm người chơi | ĐẠT | [jsonl](scenarios/safe_radius_blocks.jsonl) |
| `safe_zone_expels_inside` | C1/C5 | Bóng Mực đang trong vùng an toàn (cách người chơi 0.8 m): bị đẩy đều ra mép 6 m trong đúng 30 tick (mỗi tick (31-25.8)/30 = 0.173 m), trạng thái recoil, KHÔNG gây sát thương; xong thì chase và bị chặn ở z=31 | ĐẠT | [jsonl](scenarios/safe_zone_expels_inside.jsonl) |
| `scenario_setup_no_events` | R13 | Dựng scenario (4 đèn lit:true, player carried/flames) không phát sự kiện (trừ night_start ở tick 1), không cộng điểm | ĐẠT | [jsonl](scenarios/scenario_setup_no_events.jsonl) |
| `shade_detect_giveup` | C5 | Phát hiện ≤ 12 m (XZ): A (12.0) chase, B (12.001) vẫn wander. Bỏ đuổi > 18 m: C (18.0) vẫn chase, D (18.001) về wander | ĐẠT | [jsonl](scenarios/shade_detect_giveup.jsonl) |
| `shade_hit_invuln_lose` | R9/R12/C5 | Bóng Mực áp sát: hit ở tick 1 (rơi floor(5/2)=2); lùi 2 m trong 60 tick (x: 0.433 -> 2.433, hết lùi ở tick 61 -> chase); bất tử 90 tick nên hit tiếp ở tick 91 (rơi floor(3/2)=1) và tick 181 (rơi floor(2/2)=1, hết lửa) -> thua no_flames | ĐẠT | [jsonl](scenarios/shade_hit_invuln_lose.jsonl) |
| `shade_spawn_schedule_n1` | C5 | Đêm 1: 2 con ở tick 300 rồi 1 con mỗi 8 s (480 tick): 780, 1260, 1740, 2220; tối đa 6 nên tick 2700 không sinh thêm | ĐẠT | [jsonl](scenarios/shade_spawn_schedule_n1.jsonl) |
| `shade_spawn_schedule_n3` | C5 | Đêm 3: 2 con ở tick 300 rồi 1 con mỗi 6 s (360 tick) đến 10 con (tick 3180); tick 3540 không sinh thêm | ĐẠT | [jsonl](scenarios/shade_spawn_schedule_n3.jsonl) |
| `shade_spawning_harmless` | C5 | Bóng Mực spawning (còn 20 tick) đứng yên, không gây sát thương; hết spawning ở tick 20 thì chase và chạm ngay trong tick đó | ĐẠT | [jsonl](scenarios/shade_spawning_harmless.jsonl) |
| `smoke_default` | R1/C7 | Đêm 1 mặc định seed 42: 20 đom đóm lúc đầu, thêm 1 ở tick 240 và 480; 2 Bóng Mực sinh đúng tick 300 (S1,S2) ở trạng thái spawning 60 tick rồi wander; night_start ở tick 1; không chạm trong 600 tick | ĐẠT | [jsonl](scenarios/smoke_default.jsonl) |
| `step_off_tier` | C4 | Đêm 3: bước ra khỏi mép tầng 1 (r < 12) thì rơi xuống tầng 0 (không phạt): đi -X từ x=12.55, x=11.95 ở tick 6 ra khỏi mép; rơi y_k = 3 - k(k+1)/360 chạm đất ở k=33 -> tick 39 | ĐẠT | [jsonl](scenarios/step_off_tier.jsonl) |
| `tower_blocks` | C4 | Đêm 3: tháp chuông (trụ r=2 ở tâm tầng 2) không đi xuyên được: đi -Z từ z=6 dừng ở z=2.1 | ĐẠT | [jsonl](scenarios/tower_blocks.jsonl) |
| `unlit_lantern_no_protection` | R10 | Đèn CHƯA sáng không bảo vệ: Bóng Mực cách 5.5 m, 4 m/s: khoảng cách = 5.5 - t/15 ≤ 1.0 lần đầu ở t = 68 (0.967) -> hit tick 68 | ĐẠT | [jsonl](scenarios/unlit_lantern_no_protection.jsonl) |
| `win_all_lit` | R11/C2 | Thắp đèn cuối -> thắng all_lit ở tick 1. Điểm = 10·10 (nạp) + 100 (đèn) + floor(299.983)·2 = 598 + 3 lửa·50 = 150 -> 948 | ĐẠT | [jsonl](scenarios/win_all_lit.jsonl) |
| `win_at_last_tick` | C2 | Thắp đèn cuối đúng tick hết giờ (tick 60, time_left = 0) vẫn THẮNG; điểm = 100 + 100 + floor(0)·2 + 150 = 350 | ĐẠT | [jsonl](scenarios/win_at_last_tick.jsonl) |
| `wind_gust` | C6/Gió mạnh | Đêm 3: cơn gió thổi tick 1800..2099 (5 s), dir_deg nguyên [0,360), đẩy người chơi đứng yên đúng 2 m/s × 5 s = 10 m theo dir_deg; trước 1800 và từ 2100 không gió | ĐẠT | [jsonl](scenarios/wind_gust.jsonl) |

## Tất định

| Đêm | Seed | sha256 lần 1 | sha256 lần 2 | Giống nhau | Thời gian | Dòng end |
|---|---|---|---|---|---|---|
| 1 | 1 | `f5901905cc3d7d3f` | `f5901905cc3d7d3f` | Có | 454 ms | `{"type":"end","ticks":18000,"state":"lost","score":0}` |
| 1 | 7 | `8ac78db746167c1a` | `8ac78db746167c1a` | Có | 480 ms | `{"type":"end","ticks":18000,"state":"lost","score":0}` |
| 1 | 42 | `426c2cf98bcd1015` | `426c2cf98bcd1015` | Có | 435 ms | `{"type":"end","ticks":18000,"state":"lost","score":0}` |
| 2 | 1 | `6cdb8a90c28a45e3` | `6cdb8a90c28a45e3` | Có | 590 ms | `{"type":"end","ticks":19800,"state":"lost","score":0}` |
| 2 | 7 | `5e3fc3338b615b15` | `5e3fc3338b615b15` | Có | 599 ms | `{"type":"end","ticks":19800,"state":"lost","score":0}` |
| 2 | 42 | `668d4d7567623c7a` | `668d4d7567623c7a` | Có | 615 ms | `{"type":"end","ticks":19800,"state":"lost","score":0}` |
| 3 | 1 | `af74fcc29a883306` | `af74fcc29a883306` | Có | 759 ms | `{"type":"end","ticks":21600,"state":"lost","score":0}` |
| 3 | 7 | `0cbca5b38c5dbf5c` | `0cbca5b38c5dbf5c` | Có | 754 ms | `{"type":"end","ticks":21600,"state":"lost","score":0}` |
| 3 | 42 | `a6a77c2e27497324` | `a6a77c2e27497324` | Có | 786 ms | `{"type":"end","ticks":21600,"state":"lost","score":0}` |

Seed khác nhau cho output khác nhau (mỗi đêm): Có.

## Bot playthrough (Đêm 1 chơi được từ đầu tới thắng)

| Seed | Kết quả | Tick | Điểm | Lửa còn | Đom đóm nhặt | Lần xua | Lần bị chạm | Phát lại CLI khớp |
|---|---|---|---|---|---|---|---|---|
| 1 | won/all_lit | 9580 | 1390 | 2 | 53 | 2 | 1 | Có – [inputs](bot/seed1-inputs.json) · [output](bot/seed1.jsonl) |
| 2 | won/all_lit | 9059 | 1448 | 3 | 50 | 0 | 0 | Có – [inputs](bot/seed2-inputs.json) · [output](bot/seed2.jsonl) |
| 3 | won/all_lit | 13035 | 1354 | 3 | 62 | 8 | 0 | Có – [inputs](bot/seed3-inputs.json) · [output](bot/seed3.jsonl) |
| 4 | won/all_lit | 10087 | 1412 | 3 | 50 | 0 | 0 | Có – [inputs](bot/seed4-inputs.json) · [output](bot/seed4.jsonl) |
| 5 | won/all_lit | 13338 | 1319 | 2 | 67 | 13 | 1 | Có – [inputs](bot/seed5-inputs.json) · [output](bot/seed5.jsonl) |

## Hiệu năng headless (yêu cầu: 1 đêm đầy đủ, tối đa 21 600 tick, ≤ 30 s)

| Đêm | Số tick chạy | 3 lần chạy (gồm khởi động Node) | Nhanh nhất | tick/giây |
|---|---|---|---|---|
| 1 | 18000 | 427 ms, 411 ms, 407 ms | 407 ms | 44,208 |
| 2 | 19800 | 517 ms, 502 ms, 480 ms | 480 ms | 41,260 |
| 3 | 21600 | 628 ms, 610 ms, 628 ms | 610 ms | 35,385 |
