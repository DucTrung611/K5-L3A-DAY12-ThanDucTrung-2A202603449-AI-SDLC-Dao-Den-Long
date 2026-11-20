# CHANGELOG

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
