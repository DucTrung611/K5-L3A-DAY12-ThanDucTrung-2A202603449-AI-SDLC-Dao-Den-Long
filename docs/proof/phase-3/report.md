# Báo cáo Phase 3 – Ticket-03 "Đèn cạn dầu" (Contract v1.2)

Kết quả chạy tự sinh: [results.md](results.md). Spec, giả định B31…B48 và test bị thay: [../../notes/phase-3.md](../../notes/phase-3.md). ADR: [../../adr-phase-3.md](../../adr-phase-3.md). Breaking changes: [CHANGELOG.md](../../../CHANGELOG.md).

| Yêu cầu (ticket) | Kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| §1 Dầu max 100, vừa thắp = 100, hao 1/s, tính theo đơn vị nguyên 1/60 | `fuel_decay_one_per_second` (99.9 / 99 / 90), unit "dầu: vừa thắp…" | [scenarios/fuel_decay_one_per_second.jsonl](scenarios/fuel_decay_one_per_second.jsonl) | Đạt |
| §1 Hết dầu → tắt, `deposited 0`, `lantern_out`, `ever_lit` giữ | `lantern_out_at_fuel_zero` (tick 30), `lantern_out_before_dawn_loses` | [scenarios/lantern_out_at_fuel_zero.jsonl](scenarios/lantern_out_at_fuel_zero.jsonl) | Đạt |
| §1 Châm dầu `used = min(mang, ceil((100-fuel)/10))`, trần 100 | `refuel_ceil_rounds_up`, `refuel_exact_multiple`, `refuel_limited_by_carried` | [scenarios/](scenarios/) | Đạt |
| §1 Chọn đèn nhận được gần nhất, bằng nhau id nhỏ; đèn đầy dầu không chọn | `interact_prefers_nearest_receivable`, `interact_tie_refuel_smaller_id`; unit với `fuel_decay_per_s = 0` | [scenarios/](scenarios/) | Đạt (đầy dầu: chỉ unit test, xem B46) |
| §1 Thắp lại 5 / lần đầu 10 | `relight_costs_5`, `relight_partial_then_complete`, `relight_after_out_sequence`, `deposit_and_light` | [scenarios/](scenarios/) | Đạt |
| §1 UI thanh dầu, nhấp nháy 1 Hz khi fuel < 30 | Ảnh chụp client; mã `scene.js` | [01](01-drain-lowfuel-hud.png) | Đạt (nhìn qua ảnh tĩnh; nhịp 1 Hz theo mã, chưa đo bằng video) |
| §2 Mất vùng an toàn khi fuel < 30 (đúng 30 còn) | `safe_zone_lost_below_30_boundary`, `shade_drain_burns_fuel` | [scenarios/safe_zone_lost_below_30_boundary.jsonl](scenarios/safe_zone_lost_below_30_boundary.jsonl) | Đạt |
| §2 `wander` chọn đèn yếu gần nhất (id nhỏ khi bằng nhau); `chase` không đổi | `shade_wanders_to_weakest_lantern`, `shade_wander_tiebreak_smaller_id`, `shade_chase_keeps_chasing_weak_lantern` | [scenarios/](scenarios/) | Đạt |
| §2 `drain`: ≤ 2 m, 5 fuel/s, cộng dồn, `fuel_drain` mỗi 60 tick | `shade_drain_burns_fuel`, `shade_drain_stacking` | [scenarios/shade_drain_stacking.jsonl](scenarios/shade_drain_stacking.jsonl) | Đạt |
| §2 Rời `drain`: chase (≤ 6 m), stunned, wander | `drain_to_chase_within_6`, `drain_holds_beyond_6`, `drain_pulse_stun_15`, unit | [scenarios/](scenarios/) | Đạt |
| §2 Châm dầu ≥ 30 đẩy Bóng Mực 30 tick, không sát thương | `refuel_restores_zone_expels_drain_shade` | [scenarios/](scenarios/) | Đạt |
| §3 Đêm 240/270/300 s; thắng khi còn sống và đèn sáng ≥ ceil(0.6n) (3/5, 4/6, 5/7) | `win_dawn_survived_n1`, `win/lose_dawn_threshold_n2/n3`, `lose_dawn_two_of_five`, `*_defaults` | [scenarios/](scenarios/) | Đạt |
| §3 Không thắng sớm; `no_flames` ưu tiên kể cả tick bình minh; `reason` | `all_lit_no_early_win`, `lose_no_flames_beats_dawn_win` | [scenarios/](scenarios/) | Đạt |
| §4 Sức chứa `min(20, 10 + 2·successful_lights)`, reset mỗi đêm, HUD `mang/sức chứa` | `capacity_grows_after_light`, `capacity_caps_at_20`, `capacity_scenario_lit_not_counted`; HUD "6/10" trong ảnh | [01](01-drain-lowfuel-hud.png) | Đạt |
| §5 Công thức điểm mới (+5, +100, +40, +5/+15, bình minh, bỏ thưởng giờ) | `deposit_*`, `relight_*`, `drain_pulse_stun_15`, `pulse_non_drain_stun_5`, `win_dawn_survived_n1` (457) | [scenarios/win_dawn_survived_n1.jsonl](scenarios/win_dawn_survived_n1.jsonl) | Đạt |
| §5 Tổng điểm game giữ nguyên | `main.js` cộng điểm các đêm thắng như cũ | mã | Đạt (không có test tự động cho client) |
| §6 "Bảng màu dễ phân biệt": lưu cài đặt, #00B3FF, #FFFFFF + ⚠, đèn xẹp 20% + rách, nhấp nháy | Ảnh chụp; `localStorage` có `accessible: true` | [02](02-accessible-palette.png) | Đạt (đèn tắt xẹp/rách chưa có ảnh cận cảnh) |
| §7.1 `game.contract.json` v1.2 + 8 khóa tuning | `npm run contract`, unit contract | [results.md](results.md) | Đạt |
| §7.2–7.4 Schema snapshot/scenario/event | `scripts/lib/jsonl.js` kiểm mọi snapshot của 101 scenario; 4 scenario lỗi định dạng; unit "output headless" | [scenarios.json](scenarios.json) | Đạt |
| DoD-1 Bằng chứng chạy | results.md, scenarios/*.jsonl, ảnh | thư mục này | Đạt |
| DoD-2 ADR | [adr-phase-3.md](../../adr-phase-3.md) | | Đạt |
| DoD-3 Test cũ cập nhật/xóa có lý do, không skip | [phase-3.md mục 4](../../notes/phase-3.md) | | Đạt |
| DoD-4 Changelog breaking changes | [CHANGELOG.md](../../../CHANGELOG.md) | | Đạt |
| DoD-5 Tương thích ngược Phase 1–2 | Mọi scenario Phase 1–2 không bị thay vẫn PASS (64 trong số 101); determinism 3 đêm | [determinism.json](determinism.json) | Đạt theo kiểm chứng của mình (test ẩn của giảng viên có thể khác) |
