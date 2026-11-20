# CHANGELOG

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
