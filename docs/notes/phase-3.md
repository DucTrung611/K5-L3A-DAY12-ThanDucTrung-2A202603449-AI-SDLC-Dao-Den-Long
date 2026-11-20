# Phase 3: Ticket-03 "Đèn cạn dầu" (Contract v1.2)

Nguồn: `TICKET-03-phase-3.md` (Change Request, ưu tiên rất cao, tag `phase-3`, **Contract v1.2**). Quyết định thiết kế: [adr-phase-3.md](../adr-phase-3.md).

## 1. Luật bị thay thế

| # | Luật cũ (Ticket-02) | Luật mới (Ticket-03) |
|---|---|---|
| T1 | Đèn đã sáng không nhận thêm đom đóm | Đèn có `fuel` (max 100), hao 1/s; Tương tác ở đèn sáng = **châm dầu**; `fuel <= 0` → tắt, `lantern_out`; thắp lại cần 5 |
| T2 | Bóng Mực không bao giờ vào vùng an toàn | Đèn `fuel < 30` **mất** vùng an toàn; Bóng Mực `wander` tìm đèn yếu, trạng thái `drain` hút 5 fuel/s |
| T3 | Thắng ngay khi mọi đèn sáng | Thắng khi hết giờ còn sống và đèn sáng ≥ `ceil(0.6·n)`; đêm 240/270/300 s |
| T4 | Sức chứa 10 cố định | `min(20, 10 + 2·successful_lights)`, đặt lại mỗi Đêm |
| T5 | +10/đom đóm nạp, +100/đèn, thưởng giây còn | +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, +5/+15 Tỏa Sáng, bình minh `50 + floor(fuel)`/đèn và 50/lửa |
| T6 | — | Cài đặt "Bảng màu dễ phân biệt" (client) |

## 2. Giả định (ticket chưa nói rõ; mọi số nằm ở `tuning.js`)

| # | Chủ đề | Giả định | Lý do |
|---|---|---|---|
| B31 | `deposited` của đèn đang sáng | Giữ nguyên giá trị đã nạp để thắp (10 lần đầu, 5 khi thắp lại); về 0 khi đèn tắt | Test cũ kiểm `deposited: 10` ngay sau khi thắp; ticket chỉ nói "về 0 khi hết dầu" |
| B32 | Sự kiện khi châm dầu | Chỉ phát `refuel {lantern_id, amount = số đom đóm dùng, fuel sau châm (1 chữ số)}`, không phát `deposit`/`lantern_lit` | Ticket liệt kê `refuel` là sự kiện riêng |
| B33 | Scenario đèn | `lit:true` không `fuel` → 100; chỉ `fuel` (không `lit`) → sáng nếu `fuel > 0`; `ever_lit` mặc định `true` nếu đèn sáng, `false` nếu không | Quy ước ticket 7.3 chỉ nêu trường hợp đầu |
| B34 | Bóng Mực `wander` tới đèn yếu | Đi thẳng bằng tốc độ Bóng Mực của đêm (4.0/4.5 m/s), bị chặn bởi vùng an toàn của đèn khác | Ticket chỉ nói "đi tới" |
| B35 | "Không có đèn yếu thì đi về đèn tắt gần nhất như trước" | Giữ **đi lang thang ngẫu nhiên như Ticket-02** (Ticket-02 không có hành vi đi tới đèn tắt) | Không đổi hành vi/chuỗi RNG của Phase 2 |
| B36 | Thời điểm vào `drain` | Ngay trong bước 8 tick đạt ≤ 2 m; hút bắt đầu từ bước 2 tick sau | Thứ tự tick cố định |
| B37 | Rời `drain` | Ưu tiên chase (Mây ≤ 6 m, đúng 6.0 tính là trong) → wander (đèn tắt / fuel ≥ 30 / cách > 2 m); rồi chạy tiếp logic di chuyển cùng tick (giống wander→chase hiện có) | Nhất quán với máy trạng thái cũ |
| B38 | `fuel_drain` | Mỗi con có bộ đếm riêng; ghi ở tick hút thứ 60, 120…; `fuel` = dầu sau khi trừ tick đó | "mỗi 60 tick trong lúc hút" |
| B39 | `drain` đặt bằng scenario không có `target_lantern_id` | Đèn sáng gần nhất (XZ) | Cần mục tiêu để hút |
| B40 | `successful_lights` | Tăng cả khi thắp lại; đèn đặt sẵn bằng scenario không tính; `player.successful_lights` đặt giá trị đầu | Ticket mục 4 |
| B41 | Thứ tự sự kiện cùng tick | `fuel_drain` trước `lantern_out` (cùng bước 2) | Thứ tự xử lý |
| B42 | Điểm bình minh | Tính trên dầu **sau** khi trừ ở tick bình minh; `floor` trên số nguyên đơn vị | "sau mọi cập nhật của tick" |
| B43 | Tương tác cần mang ≥ 1 đom đóm | Giữ như Ticket-02 | Ticket không đổi |
| B44 | Châm dầu qua ngưỡng 30 | Dùng đúng cơ chế đẩy của "đèn vừa thắp" (30 tick, recoil, không sát thương; `stunned` giữ nguyên) | Ticket: "giống hành vi khi đèn vừa thắp" |
| B45 | Khóa `score` trong contract | Bộ khóa mới `per_mote, per_lantern, per_relight, per_stun, per_stun_drain, per_dawn_lantern, per_flame_left`; bỏ `per_second_left` | Ticket 7.1 không liệt kê khóa điểm; giữ contract khớp `tuning.js` |
| B46 | `fuel` đầy ở bước tương tác | Không bao giờ xảy ra với hao > 0 (vừa thắp/châm xong thì tick sau đã hao); nhánh "đèn đầy dầu không được chọn" vẫn cài, kiểm bằng unit test với `fuel_decay_per_s = 0` | Hệ quả của thứ tự bước 2 → bước 5 |
| B47 | Đèn tắt vì hết dầu khi có Bóng Mực `drain` | Bóng Mực thôi hút và về `wander` ở bước 8 cùng tick | "Sang wander nếu đèn tắt" |
| B48 | Lỗi định dạng mới | `fuel` ngoài [0,100], `ever_lit` không boolean, `successful_lights` âm/không nguyên, `target_lantern_id` không thuộc Đêm → exit 2 | Quy tắc contract chung |

Rủi ro cao nhất với test ẩn: B31 (`deposited` sau khi thắp), B32 (có phát `deposit` khi châm dầu không), B34–B35 (tốc độ/hành vi `wander` tới đèn yếu), B36–B37 (tick chuyển trạng thái `drain`), B38 (mốc `fuel_drain`).

## 3. Tiêu chí hoàn thành → kiểm chứng

| Yêu cầu | Kiểm chứng |
|---|---|
| Nhiên liệu, hao 1/s, tắt khi hết | `fuel_decay_one_per_second`, `lantern_out_at_fuel_zero`, unit "dầu: vừa thắp…" |
| Châm dầu (ceil, giới hạn, 100 trần, chọn đèn) | `refuel_ceil_rounds_up`, `refuel_exact_multiple`, `refuel_limited_by_carried`, `interact_prefers_nearest_receivable`, `interact_tie_refuel_smaller_id`, unit "châm dầu…" |
| Thắp lại 5 / lần đầu 10 | `relight_costs_5`, `relight_partial_then_complete`, `relight_after_out_sequence`, `deposit_and_light` |
| Mất vùng an toàn (fuel < 30, đúng 30 còn) | `safe_zone_lost_below_30_boundary`, unit "vùng an toàn…" |
| `drain` (hút, cộng dồn, chọn mục tiêu, chuyển trạng thái, +15) | `shade_drain_burns_fuel`, `shade_drain_stacking`, `shade_wanders_to_weakest_lantern`, `shade_wander_tiebreak_smaller_id`, `shade_chase_keeps_chasing_weak_lantern`, `drain_to_chase_within_6`, `drain_holds_beyond_6`, `drain_pulse_stun_15`, `pulse_non_drain_stun_5` |
| Đẩy lùi khi châm dầu | `refuel_restores_zone_expels_drain_shade` |
| Thắng/thua mới (3 đêm, no_flames ưu tiên) | `win_dawn_survived_n1`, `win/lose_dawn_threshold_n2/n3`, `lose_dawn_two_of_five`, `lose_no_flames_beats_dawn_win`, `lantern_out_before_dawn_loses`, `all_lit_no_early_win` |
| Sức chứa | `capacity_grows_after_light`, `capacity_caps_at_20`, `capacity_scenario_lit_not_counted` |
| Định dạng scenario/snapshot/sự kiện | 4 scenario `bad_scenario_*` mới, `scripts/lib/jsonl.js` kiểm mọi snapshot, unit "output headless…" |
| Mù màu | Ảnh [01](../proof/phase-3/01-drain-lowfuel-hud.png), [02](../proof/phase-3/02-accessible-palette.png) |

## 4. Test cũ bị luật mới làm sai (cập nhật/xóa có lý do)

| Test | Xử lý | Lý do |
|---|---|---|
| `win_all_lit` | **Xóa**, thay bằng `all_lit_no_early_win` + `win_dawn_survived_n1` | Thắng sớm `all_lit` không còn |
| `win_at_last_tick` | **Xóa**, thay bằng `win_dawn_survived_n1` (thắng đúng tick hết giờ) và `lose_no_flames_beats_dawn_win` | Thắp đèn cuối không thắng nữa; "tick cuối" nay là tick bình minh |
| `smoke_default`, `move_forward`, `pause_resume` | Sửa số thời gian 300 → 240 (và 290/299/…) | Đêm 1 dài 240 s |
| `night2_defaults`, `night3_defaults` | 330 → 270, 360 → 300; thêm `fuel/ever_lit/relit_count` vào đèn | Thời lượng mới |
| `deposit_and_light`, `deposit_partial_remembered`, `deposit_overflow`, `interact_nearest_tiebreak` | Điểm tính lại (+5/đom đóm); `lantern_lit` thêm `relight:false`; thêm `capacity` | Công thức điểm mới |
| `night2_route_cross_bridge`, `night3_route_to_L1` | Điểm 200 → 150, `relight:false` | Công thức điểm mới |
| `lose_dawn` | Giữ nguyên (0 đèn sáng < ngưỡng → `dawn`) | Vẫn đúng |
| Unit: Đêm 1/2/3, `time_left_s`, điểm nạp, thắng, contract (v1.1→v1.2, số chuẩn thời lượng/điểm) | Sửa/viết lại | Cùng lý do; test "số chuẩn Ticket-02" giữ phần còn hiệu lực (tốc độ, tỏa sáng, lướt…) |
| Không có test nào bị `skip` | — | — |

## 5. Các lần AI sai và cách phát hiện

| # | Sai ở đâu | Phát hiện thế nào | Sửa |
|---|---|---|---|
| E1 | 6 scenario mới đặt expect ở tick 1–3 nhưng quên `snapshot_every: 1` (mặc định 10) | Runner báo "không có snapshot tick N" | Sửa generator (lỗi spec, không phải luật game); ghi vào AGENTS.md |
| E2 | Unit test "fuel 30 thì thôi drain" sai: đèn fuel 30 vẫn bị hút ngay tick 1 xuống < 30 | Test đỏ, đọc lại thứ tự bước 2 | Đổi test dùng fuel 40 |
| E3 | Script mutation: template literal biến `\n` thành xuống dòng thật → `SyntaxError`; lần chạy nền đầu thoát ngay | `node --check` | Sửa 3 mục; ghi bài học vào AGENTS.md |
| E4 | Bot cũ (Phase 2) không biết thắp lại/châm dầu, chỉ thắng 1/5 seed | Bảng bot | Bot tính chi phí thắp lại, châm đèn fuel < 55; thắng 4/5 |
| E5 | Chụp màn hình lần đầu: Mây đứng yên để Bóng Mực hạ cả 3 lửa nên ra màn kết quả thay vì HUD | Xem ảnh | Đặt `flames: 50` để chụp (không ảnh hưởng luật) |

Điểm đáng nói: toàn bộ 37 scenario Phase 3 (expect tính tay bằng công thức đơn vị 1/60) khớp cài đặt ngay lần chạy đầu, nên các lỗi ở trên đều là lỗi test/harness, không phải lỗi luật game.

## 6. Mutation check

_Điền sau khi chạy `npm run mutation` (xem mục 7)._

## 7. Đánh giá Phase 3

_Điền sau khi `npm run verify`, mutation và proof hoàn tất._
