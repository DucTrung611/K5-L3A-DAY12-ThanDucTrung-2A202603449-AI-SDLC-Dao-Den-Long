# AGENTS.md – Đảo Đèn Lồng

Game 3D (Three.js) + chế độ headless theo **Test Contract v1.0**. Yêu cầu, giả định: `docs/notes/phase-N.md`. Kế hoạch: `PLAN.md`.

## Lệnh
- Cài: `npm ci` · Chạy game: `npm run dev` · Build web tĩnh: `npm run build`
- Headless: `node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f] [--snapshot-every 10]`
- Kiểm chứng toàn bộ (PHẢI xanh trước khi báo xong): `npm run verify`
  (= contract + unit test + scenario + determinism + bot playthrough)
- Lưu bằng chứng phase: `npm run proof -- --phase N` (skill `verify-game`)

## Kiến trúc
- `src/sim/` lõi mô phỏng thuần, dùng chung cho headless và client. `src/client/` chỉ ĐỌC state để vẽ.
- `src/client/extras/` = phần sáng tạo, chỉ chạy ở client, không được đổi output headless.
- Thứ tự xử lý 1 bước cố định trong `src/sim/game.js` (input → di chuyển → interact → pulse → nhặt → Bóng Mực → va chạm → spawn → thời gian → kết thúc).

## Quy tắc bắt buộc
- `src/sim`: KHÔNG `Math.random`/`Date`/`performance`, KHÔNG import three/DOM; timer đếm bằng tick nguyên (`secToTicks`).
- Số tuning chỉ sửa ở `src/sim/tuning.js` VÀ `game.contract.json` cùng lúc (`npm run contract` kiểm tra).
- Khoảng cách đo trên mặt phẳng XZ, "trong bán kính r" là `<= r`. Tọa độ output làm tròn 3 chữ số (`src/sim/output.js`).
- Không sửa `tests/scenarios/*/expect.json` cho khớp output. Expect được viết tay từ yêu cầu. Nếu luật đổi (ticket mới) thì sửa kèm lý do trong `docs/notes/phase-N.md`.
- Không tắt test âm thầm. Không commit `.env`/key. Commit nhỏ, mỗi commit một việc.
- Yêu cầu mơ hồ: ghi giả định vào `docs/notes/phase-N.md` trước khi code, không tự bịa luật mà không ghi.

## Harness
- Hook `PostToolUse`: sửa `src|tests|scripts` thì chạy unit test (`scripts/hooks/post-edit-test.js`).
- Hook `Stop`: chạy toàn bộ kiểm chứng, đỏ thì chặn kết thúc (`scripts/hooks/stop-verify.js`).
- Subagent `reviewer` (`.claude/agents/reviewer.md`): review diff, đối chiếu contract. Không phải agent đã viết code.
