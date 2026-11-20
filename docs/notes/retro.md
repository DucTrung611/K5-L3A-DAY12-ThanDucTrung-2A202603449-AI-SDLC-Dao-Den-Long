# Retro dự án Đảo Đèn Lồng (Phase 1 → 4)

> Viết ở Phase 4. Chỗ nào tôi chưa đo thì ghi rõ là chưa đo, không điền số bịa.

## Số liệu

| Phase | Yêu cầu chính | Đạt | Scenario | Unit test | Token/chi phí ước tính | Thời gian |
|---|---|---|---|---|---|---|
| 1 | R1–R19 | 18 đạt, 1 đạt một phần (R18 chưa clone từ GitHub) | 26 | 28 | _điền từ /cost_ | |
| 2 | S1–S14, M1–M4, F1–F9, C1–C7 | 32 đạt (một số kèm giả định), 2 chưa kiểm hết (F7 âm thanh, F9 đo màu) trên tổng 34 mục | 66 | 45 | _điền từ /cost_ | |
| 3 | Ticket-03: nhiên liệu đèn, thắng bình minh, sức chứa, điểm mới | verify xanh; mọi mục chính có scenario/unit test (xem docs/proof/phase-3/report.md) | 102 | 58 | _điền từ /cost_ | |
| 4 | Ticket-04: bench, soak, bảng xếp hạng, accessibility, đóng gói | bench/soak/giao diện đạt trên máy tôi (bench.json, soak.json, ui-check 23/23); chưa đo trên máy chấm chuẩn | 102 (không đổi) | 72 | _điền từ /cost_ | |

## Điều hiệu quả khi làm với AI
- **Ticket có số đo cụ thể → viết kiểm chứng trước.** Phase 4 làm công thức `p1_low_fps`/`frame_ms_p95` thành hàm thuần + unit test tính tay trước khi đụng trình duyệt; sau đó bench thật chỉ còn là lắp ráp.
- **Tách phần thuần khỏi phần I/O.** Cảnh benchmark, soak, luật bảng xếp hạng, keymap đều nằm ở module không DOM/không file nên test được trong 3 s; phần trình duyệt chỉ cần một script `ui-check` duyệt ca chính.
- **Kiểm thử bằng trình duyệt thật bắt lỗi mà test đơn vị không thấy**: máy chủ vite sập vì middleware trả về hàm; chữ UI nhỏ nhất thật ra 9 px (duyệt mọi text node mới ra); phụ đề Bóng Mực hiện lặp hai dòng khi hai con xuất hiện cùng lúc.
- Viết PLAN.md với checklist contract và thứ tự bước trước khi code, nên phần lớn scenario PASS ngay lần đầu.
- Kiểm thử hộp đen qua đúng `headless_cmd` + mutation check để chắc test không "luôn đạt".

## Điều không hiệu quả / AI sai
Chi tiết từng phase: `docs/notes/phase-N.md` mục Nhật ký dùng AI. Những lần AI sai đáng nhớ và cách phát hiện:
- **Đổi tên trường mà quên chỗ dùng** (`pulseCdTicks` → `pulseCd`): bot thôi tỏa sáng mà không báo lỗi. Đã thành bài học trong AGENTS.md (grep toàn repo khi đổi tên).
- **Đổi luật làm đỏ hàng loạt scenario "vô tội"** (Phase 3: thời lượng đêm, điểm). Thay vì sửa `expect.json` cho khớp, liệt kê scenario bị ảnh hưởng, sửa generator, sinh lại, ghi lý do. Phát hiện nhờ quy tắc "không sửa expect cho khớp output".
- **`Date` lọt vào `src/sim`** (Phase 4, hàm lấy giờ cho bảng xếp hạng): unit test "sim không dùng nguồn bất định" trong hook `PostToolUse` đỏ ngay sau khi ghi file.
- **Chuỗi `\n` trong script sinh file** thành xuống dòng thật, vỡ `cli.js` (Phase 3 và lại tái diễn ở Phase 4): hook đỏ hàng loạt test CLI; AGENTS.md đã có cảnh báo, lần này vẫn mắc vì quên đọc lại.
- **Vite `configureServer` trả về hàm** làm máy chủ dev sập: lộ ra khi `ui-check` không kết nối được. Nhờ có kiểm tra tự động bằng trình duyệt thật.
- **Sửa tay `game.timeLeft` để thử "10 giây cuối"**: sim tính lại từ `simTick` nên test hụt; đọc lại luật rồi dựng bằng `scenario.time_left_s`.
- **Báo cáo token/chi phí**: AI không tự đo được; tôi để ô trống và ghi rõ, không điền số bịa.


## Harness hữu ích nhất
1. **Hook `PostToolUse` chạy unit test** (giá trị cao nhất): bắt lỗi trong vài giây sau mỗi lần ghi file, nhiều lần AI vừa sai là đỏ ngay (ví dụ `Date` trong sim, `\n` vỡ cú pháp).
2. **AGENTS.md mục "Bài học"**: mỗi lỗi lặp lại được ghi một dòng; Phase 4 thêm 4 dòng. Giảm lỗi lặp nhưng không xóa hẳn (xem `\n`).
3. **Hook `Stop` chạy `verify` toàn bộ**: không cho báo xong khi còn đỏ.
4. **Skill `verify-game` + `make-proof`**: bằng chứng sinh tự động từ chính mã ở commit, không viết tay.
5. Subagent `reviewer` (review độc lập trước khi tag): có sẵn; ở Phase 4 xem mục cuối `docs/notes/phase-4.md` để biết đã chạy hay chưa.

## Token / chi phí và cách tiết kiệm
- **Tổng token/chi phí: chưa đo.** Cần tác giả điền từ `/cost` (hoặc trang Usage) cho bảng Số liệu; tôi không đoán số.
- Kỹ thuật đã dùng để tiết kiệm: đọc từng phần file lớn (offset/limit) thay vì cả file; sửa nhỏ bằng Edit; tái dùng bộ scenario/test/generator có sẵn thay vì viết lại; chạy `npm test` (3 s) trong lúc làm và `verify` đầy đủ chỉ ở cuối; đặt luật/bài học vào AGENTS.md để không phải giải thích lại mỗi phiên.

## Nếu làm lại thì đổi gì
- **Commit và tag `phase-3` đúng giờ.** Phase 3 xong và xanh nhưng bị để trôi, chưa commit/tag khi vào Phase 4; phải tag muộn (tag trỏ commit sau hạn lab của phase đó). Nên có hook nhắc "phase xong → commit + tag" ngay khi `verify` xanh.
- **Đo hiệu năng và dựng bench từ Phase 2** (cảnh 200 Bóng Mực sớm sẽ lộ sớm điểm nghẽn thay vì đợi Phase 4).
- **Dùng rem/biến CSS cho cỡ chữ ngay từ đầu** thay vì px rải rác (đổi sang ≥ 18 px ở Phase 4 phải sửa mọi chỗ).
- **Thiết kế lưu bảng xếp hạng ngay khi biết có CLI xuất** (đĩa vs trình duyệt là quyết định kiến trúc, tôi chọn máy chủ vite ghi file; bản web tĩnh phải lùi về localStorage).
- Quay video demo song song với làm từng phase thay vì dồn cuối.
