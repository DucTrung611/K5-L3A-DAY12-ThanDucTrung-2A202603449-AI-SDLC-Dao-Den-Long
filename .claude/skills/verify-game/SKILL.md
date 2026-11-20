---
name: verify-game
description: Chạy toàn bộ kiểm chứng Đảo Đèn Lồng (contract, unit test, scenario headless, determinism, bot playthrough) và lưu bằng chứng vào docs/proof/phase-N/. Dùng khi kết thúc một tính năng, trước khi gắn tag phase, hoặc khi cần cập nhật bảng truy vết yêu cầu → bằng chứng.
---

# Kiểm chứng & lưu bằng chứng

## Khi nào dùng
- Sau khi xong một tính năng/sửa lỗi: chạy bước 1.
- Trước khi gắn tag `phase-N`: chạy bước 1 → 3.

## Các bước
1. `npm run verify`. Phải xanh hết. Nếu đỏ: đọc lỗi, sửa **code** (không sửa expect/test cho qua), chạy lại.
2. `npm run proof -- --phase N`. Lệnh này ghi vào `docs/proof/phase-N/`:
   - `results.md`: bảng PASS/FAIL từng scenario + determinism + bot + hiệu năng + môi trường máy
   - `scenarios/*.jsonl`: output headless thật của từng scenario
   - `bot/`: inputs + output phát lại của bot (bằng chứng chơi từ đầu tới thắng)
3. Cập nhật `docs/proof/phase-N/report.md` (bảng Yêu cầu | Kiểm chứng | Bằng chứng | Kết quả):
   - Mỗi yêu cầu trỏ tới file bằng chứng cụ thể. Chưa đạt thì ghi "Chưa đạt" + lý do.
   - Ảnh/GIF cho thứ chỉ nhìn mới thấy (HUD, màn thắng/thua): chạy `npm run dev`, chụp, ghi rõ ảnh chứng minh yêu cầu nào.
4. Scenario mới: tạo `tests/scenarios/<tên>/{scenario,inputs,expect}.json`. `expect.json` tính TAY từ yêu cầu + tuning,
   ghi `requirement` và `description` (cách tính). Định dạng expect: xem đầu file `scripts/lib/expect.js`.

## Lưu ý
- Bằng chứng phải khớp mã ở tag: chạy proof SAU commit cuối của phase, trước khi tag.
- Không sửa tay file output.
