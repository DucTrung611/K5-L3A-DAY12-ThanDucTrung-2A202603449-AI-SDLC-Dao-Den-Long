# AGENTS.md – Đảo Đèn Lồng

Game 3D (Three.js) 3 đêm + chế độ headless theo **Test Contract v1.2**. Giả định và spec: `docs/notes/phase-N.md`. Kế hoạch: `PLAN.md`.
Luật chuẩn do **Ticket-02** (bảng số chuẩn, 3 bản đồ, thứ tự một tick) và **Ticket-03** "Đèn cạn dầu" (nhiên liệu đèn, `drain`, thắng bình minh, sức chứa, điểm mới; ADR ở `docs/adr-phase-3.md`) quy định. Mơ hồ thì tra `docs/notes/phase-3.md` (B31…B48) rồi `docs/notes/phase-2.md` (B1…B30) trước khi bịa luật. Ticket sau thay luật cũ thì test cũ phải sửa/xóa KÈM LÝ DO.

## Lệnh
- Cài: `npm ci` · Chạy game: `npm run dev` · Build web tĩnh: `npm run build`
- Headless: `node src/headless/cli.js --seed 1 --night 1|2|3 --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f] [--snapshot-every 10]`
- Kiểm chứng toàn bộ (PHẢI xanh trước khi báo xong): `npm run verify`
  (= contract + unit test + scenario + determinism 3 đêm + bot Đêm 1)
- Lưu bằng chứng phase: `npm run proof -- --phase N` (skill `verify-game`) · Mutation check: `npm run mutation`

## Kiến trúc
- `src/sim/` lõi mô phỏng thuần, dùng chung headless và client: `tuning.js` (số chuẩn, 1 nguồn), `maps.js` (3 bản đồ + hàm chiều cao `height(x,z)`), `game.js` (một tick), `validate.js`, `output.js`.
- `src/client/` chỉ ĐỌC state để vẽ: `main.js` (menu → đêm → kết quả → Bình Minh, tạm dừng), `scene.js`, `hud.js`, `input.js`, `audio.js`, `settings.js`. Sáng tạo của tôi (vệt sáng theo chân Mây, nhạc nền/âm thanh tự tổng hợp) nằm ở client, không được đổi output headless.
- Dầu đèn là SỐ NGUYÊN đơn vị 1/60 (`fuelU`, `fuel = 100` ⇔ 6000); chỉ làm tròn khi xuất. Vùng an toàn = `hasZone(L)` (sáng và `fuel >= 30`), một chỗ duy nhất.
- Thứ tự một tick CỐ ĐỊNH trong `stepGame` (ticket): input (pause trước) → giảm bộ đếm + trừ dầu đèn (`fuel <= 0` thì tắt ngay) → di chuyển Mây + rơi → nhặt → đèn → vùng an toàn → tỏa sáng → Bóng Mực/Gió Lạc → chạm → sinh theo lịch → thắng/thua.

## Quy tắc bắt buộc
- `src/sim`: KHÔNG `Math.random`/`Date`/`performance`, KHÔNG import three/DOM; timer đếm bằng tick nguyên (`secToTicks`); RNG chỉ qua `createRng(seed)`.
- Số chuẩn chỉ sửa ở `src/sim/tuning.js` VÀ `game.contract.json` cùng lúc (`npm run contract` đối chiếu cả với bảng số viết tay trong script).
- Địa hình: một hàm `height(x,z)` (-Infinity = hư không, +Infinity = vật cản). Khoảng cách tuning đo trên XZ, "trong bán kính r" là `<= r` (+1e-9). Tọa độ output làm tròn 3 chữ số.
- KHÔNG sửa `tests/scenarios/*/expect.json` cho khớp output. Expect tính tay từ yêu cầu, công thức nằm trong `tests/scenarios/_generate.mjs` (sửa generator rồi sinh lại). Luật đổi (ticket mới) thì sửa kèm lý do trong `docs/notes/phase-N.md`.
- Không tắt test âm thầm. Không commit `.env`/key. Commit nhỏ, mỗi commit một việc.
- Khi test FAIL hàng loạt, nghi lỗi harness/runner trước (đường dẫn, tên trường đổi) rồi mới nghi luật game.

## Bài học (agent hay sai ở đây)
- Đổi tên trường của `game.player` (vd `pulseCdTicks` → `pulseCd`) mà quên bot/tests: bot thôi tỏa sáng mà không báo lỗi. Tìm bằng grep toàn repo khi đổi tên.
- Test sai vì quên luật vừa thêm (vd đèn vừa sáng đẩy Bóng Mực ra nên không thể bị chạm cùng tick). Đọc lại luật trước khi sửa code.
- Mutation sống sót = lỗ hổng test: thêm kiểm tra biên (vd bất tử hồi sinh còn ở tick 230, hết ở tick 231).

- Đổi luật thắng/điểm/thời lượng làm đỏ hàng loạt scenario "vô tội" (thời lượng đêm, điểm). Trước khi code: liệt kê scenario bị ảnh hưởng (mẫu: `docs/notes/phase-3.md` mục 4), rồi sửa generator và sinh lại; không sửa `expect.json` tay.
- Script sinh file bằng template literal: `\n` trong chuỗi con bị thành xuống dòng thật (vỡ cú pháp). Dùng `\\n` hoặc Edit trực tiếp.
- Scenario headless mặc định `--snapshot-every 10`: expect ở tick không chia hết cho 10 phải đặt `snapshot_every: 1` (lỗi hay gặp: "không có snapshot tick N").

## Harness
- Hook `PostToolUse`: sửa `src|tests|scripts` thì chạy unit test (`scripts/hooks/post-edit-test.js`). Đỏ giữa chừng lúc đang viết lại lõi là bình thường.
- Hook `Stop`: chạy toàn bộ kiểm chứng, đỏ thì chặn kết thúc (`scripts/hooks/stop-verify.js`).
- Subagent `reviewer` (`.claude/agents/reviewer.md`): review diff, đối chiếu contract và ticket. Không phải agent đã viết code.
- Skill `verify-game`: chạy kiểm chứng và lưu bằng chứng vào `docs/proof/phase-N/`.
