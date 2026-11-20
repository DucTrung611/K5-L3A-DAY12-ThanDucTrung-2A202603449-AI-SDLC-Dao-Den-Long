# CHANGELOG

## [phase-4] – v1.0.0 "Bình minh" (Ticket-04, Contract v1.3)
Giả định B49…B62 và truy vết yêu cầu: [docs/notes/phase-4.md](docs/notes/phase-4.md). **Không đổi luật, tuning hay đầu ra headless**: 102 scenario của Phase 1–3 giữ nguyên, không sửa `expect.json` nào.

### Thêm
- **Benchmark** (`node scripts/bench.js`, trang `bench.html`): cảnh chuẩn 200 Bóng Mực + 100 đom đóm + L1–L3 sáng, camera quỹ đạo, 1280×720, VSync tắt, ghi `bench.json` (avg FPS, p1-low, p95, frames, load, bộ nhớ đỉnh).
- **Soak test** (`node scripts/soak.js`): 10 Đêm liên tiếp trong một tiến trình, input ngẫu nhiên theo seed, ghi `soak.json`.
- **Bảng xếp hạng cục bộ**: top 10, tên 3–12 ký tự `[A-Za-z0-9_]`, ISO 8601 có múi giờ, lưu đĩa `data/leaderboard.json` (qua máy chủ vite) hoặc trình duyệt; màn hình xem từ Menu; `--export-leaderboard`.
- **Dễ tiếp cận**: đổi phím mọi hành động (phát hiện trùng, khôi phục mặc định, lưu bền); phụ đề/chỉ báo (Bóng Mực + mũi tên mép màn hình, Gió sắp thổi, 10 s cuối, đèn fuel < 30); Giảm chuyển động (camera rung mới + chớp màn hình đều tắt được); chữ ≥ 18 px, Chữ lớn ×1.25.
- **Đóng gói**: README đủ bench/soak/leaderboard/accessibility, CHANGELOG 4 phase, CREDITS, LICENSE, `retro.md`, Release `v1.0.0` (web tĩnh `dao-den-long-web.zip` + video demo).
- **Kiểm chứng**: 14 unit test mới (`tests/unit/phase4.test.js`), `scripts/ui-check.js` (23 kiểm tra bằng trình duyệt thật), `soak` trong `npm run verify`, `make-proof` hỗ trợ Phase 4.

### Đổi
- **Contract v1.3**: `contract_version "1.3"`, thêm `bench_cmd`, `soak_cmd`; `run_cmd` = `node scripts/run.js` (hiểu `--export-leaderboard`; không tham số thì chạy game). Test `game.contract.json: các khóa bắt buộc` sửa từ "1.2" sang "1.3" kèm khóa mới.
- **Phím mặc định**: bỏ phím tắt phụ `P` (tạm dừng) và `Q` (lướt) để không đụng phím người dùng tự chọn; còn `Esc` và `Shift`. `↑`/`↓` vẫn đi tới/lùi.
- **Cỡ chữ UI**: mọi chữ ≥ 18 px (trước đây nhỏ nhất 9 px); HUD và vòng hồi chiêu phóng to tương ứng.
- Vite build thêm trang `bench.html`; `vite.config.js` có middleware `/api/leaderboard`.

## [phase-3] – Ticket-03 "Đèn cạn dầu" (Contract v1.2)
Quyết định thiết kế: [docs/adr-phase-3.md](docs/adr-phase-3.md). Giả định B31…B48 và danh sách test bị thay: [docs/notes/phase-3.md](docs/notes/phase-3.md).

### ⚠ Thay đổi phá vỡ tương thích (breaking changes)
- **Luật thắng**: bỏ "thắng ngay khi tất cả đèn sáng". Thắng = còn sống khi hết giờ **và** số đèn sáng ở tick cuối ≥ `ceil(0.6 × tổng đèn)` (Đêm 1/2/3 cần 3/5, 4/6, 5/7). `game_over.reason`: `"all_lit"` **không còn dùng**; thắng là `"dawn_survived"`; thua là `"dawn"` (không đủ đèn) hoặc `"no_flames"` (hết lửa luôn thua trước, kể cả tick bình minh).
- **Thời lượng đêm**: 300/330/360 s → **240/270/300 s** (`night1_duration_s`…).
- **Đèn có nhiên liệu**: đèn đã sáng nhận thêm đom đóm (châm dầu), hao 1 fuel/s, `fuel <= 0` thì tắt (`lantern_out`). Thay luật "đèn đã sáng không nhận thêm đom đóm".
- **Vùng an toàn**: đèn `fuel < 30` mất vùng an toàn (đúng 30 vẫn còn). Thay luật "Bóng Mực không bao giờ vào vùng an toàn".
- **Công thức điểm** thay toàn bộ: +5 mỗi đom đóm nạp (trước +10); thắp lần đầu +100; thắp lại +40; Tỏa Sáng +5 (+15 tổng nếu con đó đang `drain`); bình minh (chỉ khi thắng) mỗi đèn sáng `+50 + floor(fuel)` và mỗi Ngọn Lửa `+50`. **Bỏ** thưởng thời gian (`per_second_left`).
- **Sức chứa** tăng dần: `min(20, 10 + 2 × successful_lights)`, đặt lại mỗi Đêm (trước cố định 10).
- **Contract v1.2** (`game.contract.json`): `contract_version "1.2"`; thêm `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max`; `night*_duration_s` đổi; khóa `score` đổi sang bộ khóa mới.
- **Output headless**: snapshot đèn thêm `fuel` (1 chữ số thập phân), `ever_lit`, `relit_count`; `player.capacity`; trạng thái Bóng Mực `"drain"`; sự kiện mới `refuel`, `lantern_out`, `fuel_drain` (mỗi 60 tick hút); `lantern_lit` thêm `relight`.
- **Scenario**: đèn thêm `fuel`, `ever_lit` (`lit: true` không khai `fuel` → 100); `player.successful_lights`; `shades[].target_lantern_id`, `shades[].state: "drain"`.

### Thêm
- Thắp lại đèn đã tắt chỉ cần 5 đom đóm (chưa từng sáng vẫn cần 10). Tương tác chọn đèn *nhận được* gần nhất (chưa sáng, hoặc sáng chưa đầy dầu).
- Bóng Mực trạng thái `drain`: `wander` chọn đèn sáng `fuel < 30` gần nhất, tới ≤ 2 m thì đứng hút 5 fuel/s (cộng dồn nhiều con); sang `chase` khi Mây trong 6 m, `stunned` khi trúng Tỏa Sáng, `wander` khi đèn tắt/fuel ≥ 30/cách > 2 m. Châm dầu lên ≥ 30 đẩy các con trong 6 m ra mép vùng (30 tick, không sát thương).
- **Client**: thanh dầu trên đèn, đèn và thanh dầu nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% + vết rách, tia hút dầu, HUD `đang_mang / sức_chứa`, "cần ≥ N đèn lúc bình minh", cảnh báo đèn sắp tắt, nhắc châm dầu/thắp lại; cài đặt **"Bảng màu dễ phân biệt"** (viền/mắt Bóng Mực #00B3FF, cảnh báo #FFFFFF kèm ⚠; có lưu).
- **Kiểm chứng**: 101 scenario headless (37 scenario Phase 3, expect tính tay), 58 unit test, mutation check mở rộng, bot Đêm 1 biết thắp lại và châm dầu.

### Đổi / xóa test (có lý do, không bỏ qua âm thầm)
- Viết lại vì luật bị thay: `win_all_lit` → `all_lit_no_early_win` (+ `win_dawn_survived_n1`), `win_at_last_tick` → `win_dawn_survived_n1`/`lose_no_flames_beats_dawn_win`; thời lượng đêm trong `smoke_default`, `move_forward`, `pause_resume`, `night2_defaults`, `night3_defaults`; điểm trong `deposit_*`, `interact_nearest_tiebreak`, 2 lộ trình chơi được; unit test thắng/điểm/thời lượng/contract.
- Chi tiết từng test: [docs/notes/phase-3.md](docs/notes/phase-3.md) mục 4.

## [phase-2] – Ticket-02 "Ba hòn đảo" (Contract v1.1)
### Thêm
- **Số liệu chuẩn** của ticket thay mọi giá trị tự chọn (tốc độ, nhảy 7 m/s, mang 10, nhặt ≤ 1.0 m + chênh cao 1.5, đèn cost 10, vùng an toàn 6 m, tỏa sáng 3/5 m/3 s, choáng 120 tick, đẩy 4 m/15 tick, đêm 300/330/360 s...). Điểm: +10 khi NẠP, +5 mỗi Bóng Mực trúng tỏa sáng.
- **3 bản đồ** (`src/sim/maps.js`): Đảo Bến, Đảo Cầu (2 đảo + cầu tre không lan can + 2 bục nhảy), Đảo Chuông (3 tầng, vách, 2 dốc 30°, bục nhảy, tháp chuông, gió mạnh). Địa hình qua một hàm `height(x,z)`.
- **Tính năng mới**: Lướt (dash), Gió Lạc (kẻ trộm), Bùa Gió, gió mạnh, bục nhảy, rơi khỏi đảo + hồi sinh, tạm dừng.
- **Bóng Mực** viết lại: trạng thái `spawning/wander/chase/recoil/stunned`, phát hiện 12/bỏ 18 m, lùi 2 m sau khi chạm, đẩy 4 m trong 15 tick, 2 con ở tick 300 rồi theo chu kỳ.
- **Contract v1.1**: `--night 1|2|3`, snapshot/scenario/inputs/event mới, validator và runner cập nhật.
- **Client**: menu, giới thiệu đêm (lời Ông Đăng), chuỗi 3 đêm tới màn Bình Minh, tạm dừng (Esc/P), cài đặt lưu qua lần mở, HUD đủ (đồng hồ đỏ/nhấp nháy ≤ 30 s, thanh đom đóm 10 ô, hồi chiêu, nhắc nạp, mũi tên tới đèn), bảng màu chuẩn, ánh sáng môi trường `0.15 + 0.55 × tiến độ`, nhạc nền và hiệu ứng âm thanh.
- **Kiểm chứng**: 66 scenario headless (expect tính tay, công thức trong `tests/scenarios/_generate.mjs`), 45 unit test, tất định 3 đêm trọn đêm, mutation check (`npm run mutation`), hai lộ trình chơi được (Đêm 2 qua cầu, Đêm 3 dốc → bục nhảy → tầng 2), đo FPS bản build thường.
### Đổi
- Test Phase 1 bị luật mới thay thế được tính lại kèm lý do (`docs/notes/phase-2.md` mục 5); `island_boundary_no_fall` thay bằng `island_edge_fall` (rơi khỏi đảo giờ có phạt); `interact_edge_trigger` thay bằng `pulse_cooldown_edge` + `interact_nearest_tiebreak`.
- `AGENTS.md` và skill `verify-game` cập nhật cho phạm vi mới (số chuẩn, bản đồ, mutation, đo FPS).
- Bot kiểm chứng Đêm 1 sửa để không bước ra khỏi đảo và chỉ tỏa sáng khi Bóng Mực đang đuổi áp sát.
- Bỏ `src/client/extras/` (ánh sáng "đảo sáng dần" nay là công thức chuẩn trong `scene.js`).

## [phase-1] – PRD-0 + Test Contract v1.0
### Thêm
- Lõi mô phỏng tất định `src/sim` (60 tick/s, PRNG theo seed), tuning một nguồn `src/sim/tuning.js`.
- Headless CLI `node src/headless/cli.js` theo Test Contract v1.0 (snapshot/event/end JSONL, mã thoát 0/1/2).
- `game.contract.json`.
- Client 3D Three.js: Đêm 1 – Đảo Bến, Mây (nón lá + đèn lồng nhỏ), 5 Đèn Lồng Lớn, đom đóm, Bóng Mực, tỏa sáng, nhảy, camera góc nhìn thứ ba, HUD, màn thắng/thua, chơi lại.
- Sáng tạo: đảo sáng dần theo số đèn thắp; âm thanh WebAudio tổng hợp.
- Kiểm chứng: 28 unit test, 26 scenario headless (expect tính tay), kiểm tra tất định, bot playthrough + phát lại CLI, `npm run verify`, `npm run proof`.
- Harness: AGENTS.md/CLAUDE.md, hook PostToolUse (unit test) + Stop (chặn khi đỏ), skill `verify-game`, subagent `reviewer`, CI GitHub Actions (Ubuntu + macOS).
### Đổi
- Tài liệu lab gốc chuyển vào `docs/lab/`.
