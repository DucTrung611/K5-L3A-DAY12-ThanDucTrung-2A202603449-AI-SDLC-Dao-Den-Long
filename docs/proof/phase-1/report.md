# Bằng chứng Phase 1: truy vết Yêu cầu → Kiểm chứng → Bằng chứng

Kết quả tự sinh (không sửa tay): [results.md](results.md). Chạy lại ở tag `phase-1`: `npm ci && npm run proof -- --phase 1`.
Giả định dùng để kiểm chứng: [docs/notes/phase-1.md](../../notes/phase-1.md) mục 2.

| # | Yêu cầu (PRD-0 / Test Contract) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| R1 | CLI đúng tham số, chạy không cửa sổ/GPU, exit 0 | Scenario `smoke_default` gọi đúng `headless_cmd`; CI chạy trên Ubuntu + macOS | [scenarios/smoke_default.jsonl](scenarios/smoke_default.jsonl), [clean-copy.log](clean-copy.log) | Đạt |
| R2 | Sai định dạng → exit 2; lỗi khác → ≠ 0 + stderr | 4 scenario `bad_*` + unit test `cli.test.js` (JSON hỏng, thiếu frames, nút không boolean, tick không tăng, move ngoài [-1,1], id đèn lạ, thiếu `--seed`, tham số lạ) | [results.md](results.md), [unit-tests.tap](unit-tests.tap) | Đạt |
| R3 | Tick model: tick 0 trước input, event tick = k+1, N bước, `time_left_s` | `move_forward` (1 m @ tick 10, 6 m + 299 s @ tick 60), `input_fields_persist`, unit test tick model | [scenarios/move_forward.jsonl](scenarios/move_forward.jsonl) | Đạt |
| R4 | Xoay theo `cam_yaw_deg`, chuẩn hóa vector > 1 | `move_cam_yaw90` (→ +X), `move_diagonal_normalized` (4.243, 4.243), `input.test.js` | [scenarios/move_cam_yaw90.jsonl](scenarios/move_cam_yaw90.jsonl) | Đạt |
| R5 | Nút kích hoạt khi false → true, trường vắng giữ giá trị | `interact_edge_trigger` (giữ nút chỉ ra 1 deposit), `input.test.js` | [scenarios/interact_edge_trigger.jsonl](scenarios/interact_edge_trigger.jsonl) | Đạt |
| R6 | Nhặt đom đóm trong `pickup_radius` (≤ r), giới hạn mang | `pickup_radius_boundary` (1.5 nhặt, 1.501 không), `carry_capacity_full` | [scenarios/pickup_radius_boundary.jsonl](scenarios/pickup_radius_boundary.jsonl) | Đạt |
| R7 | Nạp ánh sáng, thắp đèn, điểm | `deposit_and_light`, `deposit_overflow`, `deposit_out_of_range` (3.001 m không nạp) | [scenarios/deposit_and_light.jsonl](scenarios/deposit_and_light.jsonl) | Đạt |
| R8 | Tỏa sáng: chi phí, bán kính, choáng 150 tick, đẩy 4 m, hồi chiêu 60 tick, `stunned` trong state | `pulse_stun_push`, `pulse_cooldown`, `pulse_insufficient_light`, unit test bán kính | [scenarios/pulse_stun_push.jsonl](scenarios/pulse_stun_push.jsonl) | Đạt |
| R9 | Bóng Mực đuổi, chạm thì mất Ngọn Lửa, rơi đom đóm, bất tử | `shade_hit_invuln_lose` (hit @1, @92, @183 → thua) | [scenarios/shade_hit_invuln_lose.jsonl](scenarios/shade_hit_invuln_lose.jsonl) | Đạt |
| R10 | Bóng Mực sợ đèn (`safe_radius`) | `safe_radius_blocks` (kiểm invariant ở mọi snapshot) + `unlit_lantern_no_protection` | [scenarios/safe_radius_blocks.jsonl](scenarios/safe_radius_blocks.jsonl) | Đạt |
| R11 | Thắng khi thắp hết + thưởng | `win_all_lit` (848 điểm tính tay), bot thắng 5/5 seed | [scenarios/win_all_lit.jsonl](scenarios/win_all_lit.jsonl), [bot.json](bot.json) | Đạt |
| R12 | Thua: hết Ngọn Lửa / hết giờ | `shade_hit_invuln_lose` (no_flames), `lose_dawn` (dawn @ tick 60) | [scenarios/lose_dawn.jsonl](scenarios/lose_dawn.jsonl) | Đạt |
| R13 | Dựng scenario không phát sự kiện, không cộng điểm | `scenario_setup_no_events` (4 đèn lit:true, score 0, 0 event) | [scenarios/scenario_setup_no_events.jsonl](scenarios/scenario_setup_no_events.jsonl) | Đạt |
| R14 | Tất định (cùng seed/scenario/inputs → giống hệt, kể cả id) | 4 seed × 2 lần chạy CLI, 1 đêm đầy đủ, so sha256; seed khác thì output khác | [determinism.json](determinism.json) | Đạt |
| R15 | Định dạng JSONL: 3 loại dòng, `end` cuối, tọa độ 3 chữ số, tên event | Validator `scripts/lib/jsonl.js` chạy trên mọi output scenario | [results.md](results.md) | Đạt |
| R16 | `game.contract.json` khai đúng số đang dùng; `fall_enabled: false` | `npm run contract` + `contract.test.js`; `island_boundary_no_fall` | [results.md](results.md) | Đạt |
| R17 | Game chơi được từ đầu tới thắng/thua: đi, nhảy, camera 3D, HUD, chơi lại | Chơi trong trình duyệt (Playwright): giữ W đi 6 m/s; phím R tạo ván mới; bot thắng 5/5 seed qua CLI; **client phát lại inputs bot seed 1 ra đúng kết quả headless (won, tick 2405, 1458 điểm)**; `jump_arc` | Ảnh bên dưới, [bot/](bot/) | Đạt |
| R18 | Cài và chạy theo README ≤ 3 lệnh trên bản sạch | Sao chép đúng các file sẽ commit sang thư mục trống → `npm ci` → `npm run verify` → `npm run build` → headless | [clean-copy.log](clean-copy.log) | Đạt một phần: chưa clone từ GitHub vì phiên này chưa commit/push |
| R19 | Hiệu năng/ổn định headless | 1 đêm 18000 tick, 3 lần | [results.md](results.md) mục Hiệu năng (≈ 59k tick/s trên Ryzen 7 5700U) | Đạt (Phase 1 chưa có ngưỡng) |

## Ảnh chụp (Playwright, Chromium, 1280×720, mã hiện tại)

| Ảnh | Chứng minh |
|---|---|
| [01-title.png](01-title.png) | Màn hình bắt đầu: câu chuyện + điều khiển |
| [02-gameplay-hud.png](02-gameplay-hud.png) | R17: Mây đội nón lá có đèn lồng nhỏ; 2 đèn đã sáng (vòng an toàn vàng); Bóng Mực tím; HUD (Ngọn Lửa, đom đóm, đèn, điểm, thời gian, thanh tỏa sáng). Đang phát lại inputs bot seed 1 |
| [03-win-screen.png](03-win-screen.png) | R11/R17: màn thắng, bảng điểm 5×100 + 27×10 + 1×20 + thưởng thời gian 518 + thưởng lửa 150 = 1458 (khớp headless) |
| [04-lose-screen.png](04-lose-screen.png) | R12/R17: màn thua (seed 4, đứng yên nên bị Bóng Mực chạm 3 lần), nút Chơi lại |
| [05-island-all-lit.png](05-island-all-lit.png) | Sáng tạo "đảo sáng dần": đủ 5 đèn, trời và sương chuyển ấm (so với ảnh 02) |

## Chưa đạt / giới hạn

- Chưa có commit, tag `phase-1` và push: người dùng yêu cầu không commit trong phiên này. Phải chạy lại `npm run proof -- --phase 1` **sau** commit cuối, trước khi tag, để `results.md` ghi đúng hash commit.
- Âm thanh chưa được kiểm chứng tự động (chỉ kiểm tra code chạy không lỗi trong trình duyệt; console không có lỗi ngoài favicon, đã sửa).
- Điều khiển bằng chuột (kéo để xoay camera) mới thử bằng code, chưa có ảnh/GIF.
