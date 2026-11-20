# Kết quả kiểm chứng Phase 1 (tự sinh bởi `npm run proof -- --phase 1`)

- Thời điểm: 2026-11-20T08:08:07.057Z
- Mã nguồn: commit `9818fc1` + thay đổi chưa commit
- Máy: Windows_NT 10.0.26300 · AMD Ryzen 7 5700U with Radeon Graphics ×16 · RAM 15 GB · Node v24.14.0
- Tổng: **TẤT CẢ ĐẠT**

| Kiểm chứng | Lệnh | Kết quả |
|---|---|---|
| Contract khớp tuning | `npm run contract` | ĐẠT |
| Unit test | `npm test` | ĐẠT (28 pass / 0 fail) – [unit-tests.tap](unit-tests.tap) |
| Scenario headless (hộp đen qua CLI) | `npm run scenarios` | 26/26 ĐẠT – [scenarios.json](scenarios.json) |
| Tất định (4 seed × 2 lần, 18000 tick) | `npm run determinism` | ĐẠT – [determinism.json](determinism.json) |
| Bot chơi từ đầu tới kết thúc + phát lại CLI | `npm run bot` | thắng 5/5, phát lại khớp – [bot.json](bot.json) |

## Scenario

| Scenario | Yêu cầu | Mô tả (expect tính tay) | Kết quả | Output |
|---|---|---|---|---|
| `bad_inputs_move_range` | R2 | move ngoài [-1,1] -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_inputs_tick_order` | R2 | inputs có tick không tăng nghiêm ngặt -> exit 2 + stderr | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_json` | R2 | scenario.json không phải JSON hợp lệ -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `bad_scenario_lantern_id` | R2 | scenario tham chiếu đèn không tồn tại L9 -> exit 2 | ĐẠT | (exit ≠ 0, không có output) |
| `carry_capacity_full` | R6 | Đang mang đủ carry_capacity (10) thì không nhặt thêm; đom đóm vẫn nằm đó | ĐẠT | [jsonl](scenarios/carry_capacity_full.jsonl) |
| `deposit_and_light` | R7 | Mang 5, cách L1 2 m (≤ interact_radius 3), nhấn interact -> deposit 5, L1 thắp, +100 điểm | ĐẠT | [jsonl](scenarios/deposit_and_light.jsonl) |
| `deposit_out_of_range` | R7 | Cách L1 3.001 m (> interact_radius 3) thì nhấn interact không có tác dụng | ĐẠT | [jsonl](scenarios/deposit_out_of_range.jsonl) |
| `deposit_overflow` | R7 | L1 đã có 3/5, mang 4 -> chỉ nạp 2 cho đủ lantern_cost, còn giữ 2 | ĐẠT | [jsonl](scenarios/deposit_overflow.jsonl) |
| `input_fields_persist` | R3 | Trường vắng giữ giá trị cũ: tick 30 chỉ đổi yaw 180° nên move [0,1] vẫn giữ -> đi ngược về gốc; tick 60 dừng | ĐẠT | [jsonl](scenarios/input_fields_persist.jsonl) |
| `interact_edge_trigger` | R5 | Giữ interact nhiều tick chỉ kích hoạt 1 lần (cạnh lên). L1, L2 cùng cách 2 m -> chọn L1 (id nhỏ hơn); nhả rồi nhấn lại ở tick 20 -> nạp L2 | ĐẠT | [jsonl](scenarios/interact_edge_trigger.jsonl) |
| `island_boundary_no_fall` | R16 | fall_enabled=false: chạy mãi về +X bị chặn ở biên đảo bán kính 40 m, không có player_hit by fall | ĐẠT | [jsonl](scenarios/island_boundary_no_fall.jsonl) |
| `jump_arc` | R17 | Nhảy: v0 6 m/s, g 20 m/s² (Euler bán ẩn) -> y = (6n - n(n+1)/6)/60, tick 10: 0.694 m; đã tiếp đất ở tick 60; giữ nút không nhảy lại | ĐẠT | [jsonl](scenarios/jump_arc.jsonl) |
| `lose_dawn` | R12 | time_left_s 1 -> hết giờ sau 60 bước: game_over lost/dawn ở tick 60, dừng sớm dù --ticks 200 | ĐẠT | [jsonl](scenarios/lose_dawn.jsonl) |
| `move_cam_yaw90` | R4 | cam_yaw_deg=90, move [0,1]: x' = x·cosθ + z·sinθ = 1, z' = 0 -> đi +X, 6 m sau 60 tick | ĐẠT | [jsonl](scenarios/move_cam_yaw90.jsonl) |
| `move_diagonal_normalized` | R4 | move [1,1] dài √2 > 1 phải chuẩn hóa: mỗi trục 6/√2 = 4.243 m sau 60 tick | ĐẠT | [jsonl](scenarios/move_diagonal_normalized.jsonl) |
| `move_forward` | R3 | Tick model: snapshot tick 0 trước input; move [0,1] ở 6 m/s -> 1 m sau 10 tick, 6 m sau 60 tick; time_left_s = 300 - 60/60 | ĐẠT | [jsonl](scenarios/move_forward.jsonl) |
| `pickup_radius_boundary` | R6 | Đom đóm cách đúng 1.5 m (= pickup_radius, ≤ r) được nhặt; cách 1.501 m thì không. +10 điểm | ĐẠT | [jsonl](scenarios/pickup_radius_boundary.jsonl) |
| `pulse_cooldown` | R8 | pulse_cooldown 1 s = 60 tick: nhấn ở tick 0 (OK), 30 (đang hồi chiêu, bỏ qua), 60 (OK). Pulse không trúng ai vẫn có event với stunned_ids rỗng. Còn 10 - 2·2 = 6 | ĐẠT | [jsonl](scenarios/pulse_cooldown.jsonl) |
| `pulse_insufficient_light` | R8 | Mang 1 < pulse_cost 2 -> không tỏa sáng được: không có event pulse, Bóng Mực không bị choáng | ĐẠT | [jsonl](scenarios/pulse_insufficient_light.jsonl) |
| `pulse_stun_push` | R8 | Pulse (tốn 2): A cách 5 m (≤ 6) bị choáng + đẩy 4 m ra x=9; B cách 10 m vẫn đuổi (10 - 3.5/60 = 9.942). Choáng 2.5 s = 150 tick: tick 150 còn stunned, tick 151 chase. +20 điểm | ĐẠT | [jsonl](scenarios/pulse_stun_push.jsonl) |
| `safe_radius_blocks` | R10 | Đứng tại L1 đã thắp: Bóng Mực không vào được bán kính 8 m quanh đèn -> dừng ở z=33, không bao giờ chạm người chơi | ĐẠT | [jsonl](scenarios/safe_radius_blocks.jsonl) |
| `scenario_setup_no_events` | R13 | Dựng scenario (4 đèn lit:true, player carried/flames) không phát sự kiện, không cộng điểm | ĐẠT | [jsonl](scenarios/scenario_setup_no_events.jsonl) |
| `shade_hit_invuln_lose` | R9 | Bóng Mực áp sát: hit ở tick 1 (rơi floor(4·0.5)=2), bất tử 1.5 s = 90 tick -> hit tiếp ở tick 92 (rơi 1), tick 183 (hết lửa) -> thua no_flames | ĐẠT | [jsonl](scenarios/shade_hit_invuln_lose.jsonl) |
| `smoke_default` | R1 | Thế giới mặc định seed 42: exit 0, snapshot tick 0 đúng, Bóng Mực đầu tiên sinh đúng giây 10 (tick 600) | ĐẠT | [jsonl](scenarios/smoke_default.jsonl) |
| `unlit_lantern_no_protection` | R10 | Đèn CHƯA thắp không bảo vệ: Bóng Mực cách 5 m, tốc độ 3.5 m/s -> khoảng cách ≤ 1 sau 69 bước -> player_hit tick 69 | ĐẠT | [jsonl](scenarios/unlit_lantern_no_protection.jsonl) |
| `win_all_lit` | R11 | Thắp đèn cuối -> won/all_lit ở tick 1. Điểm = 100 + floor(299.983)·2 + 3 lửa·50 = 100 + 598 + 150 = 848 | ĐẠT | [jsonl](scenarios/win_all_lit.jsonl) |

## Tất định

| Seed | sha256 lần 1 | sha256 lần 2 | Giống nhau | Dòng end |
|---|---|---|---|---|
| 1 | `63092b5fcb8b78ab` | `63092b5fcb8b78ab` | Có | `{"type":"end","ticks":1235,"state":"lost","score":10}` |
| 7 | `7eed1afa441d812c` | `7eed1afa441d812c` | Có | `{"type":"end","ticks":3572,"state":"lost","score":70}` |
| 42 | `dd4263b9f3fa6c49` | `dd4263b9f3fa6c49` | Có | `{"type":"end","ticks":1241,"state":"lost","score":0}` |
| 2026 | `514a961a9423250c` | `514a961a9423250c` | Có | `{"type":"end","ticks":6564,"state":"lost","score":110}` |

Seed khác nhau cho output khác nhau: Có.

## Bot playthrough (Đêm 1 chơi được từ đầu tới thắng)

| Seed | Kết quả | Tick | Điểm | Lửa còn | Đom đóm nhặt | Lần xua | Lần bị chạm | Phát lại CLI khớp |
|---|---|---|---|---|---|---|---|---|
| 1 | won/all_lit | 2405 | 1458 | 3 | 27 | 1 | 0 | Có – [inputs](bot/seed1-inputs.json) · [output](bot/seed1.jsonl) |
| 2 | won/all_lit | 3795 | 1532 | 3 | 33 | 4 | 0 | Có – [inputs](bot/seed2-inputs.json) · [output](bot/seed2.jsonl) |
| 3 | won/all_lit | 3110 | 1486 | 3 | 30 | 2 | 0 | Có – [inputs](bot/seed3-inputs.json) · [output](bot/seed3.jsonl) |
| 4 | won/all_lit | 5124 | 1688 | 3 | 41 | 10 | 0 | Có – [inputs](bot/seed4-inputs.json) · [output](bot/seed4.jsonl) |
| 5 | won/all_lit | 4566 | 1586 | 3 | 37 | 6 | 0 | Có – [inputs](bot/seed5-inputs.json) · [output](bot/seed5.jsonl) |

## Hiệu năng headless

1 đêm đầy đủ 18000 tick (300 s game), sinh ngẫu nhiên bật, snapshot mỗi 10 tick, 3 lần chạy: 338 ms, 303 ms, 305 ms (gồm khởi động Node).
Nhanh nhất 303 ms ≈ 59,484 tick/giây (≈ 991× thời gian thực). Dòng end: `{"type":"end","ticks":18000,"state":"lost","score":0}`.
