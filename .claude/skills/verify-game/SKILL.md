---
name: verify-game
description: Chạy toàn bộ kiểm chứng Đảo Đèn Lồng (contract v1.2, unit test, scenario headless 3 đêm, determinism, bot, mutation, FPS client) và lưu bằng chứng vào docs/proof/phase-N/. Dùng khi kết thúc một tính năng, trước khi gắn tag phase, hoặc khi cần cập nhật bảng truy vết yêu cầu → bằng chứng.
---

# Kiểm chứng & lưu bằng chứng

## Khi nào dùng
- Sau khi xong một tính năng/sửa lỗi: chạy bước 1.
- Trước khi gắn tag `phase-N`: chạy bước 1 → 4.

## Các bước
1. `npm run verify`. Phải xanh hết. Nếu đỏ: đọc lỗi, sửa **code** (không sửa expect/test cho qua), chạy lại. FAIL hàng loạt thì nghi harness (đường dẫn, tên trường) trước.
2. `npm run mutation` (~4 phút): sửa cố ý hằng số/logic trong bản sao tạm, mỗi mutation phải làm ≥ 1 scenario FAIL. Mutation sống sót → thêm kiểm tra biên vào `tests/scenarios/_generate.mjs`.
3. Client (phần chỉ nhìn mới thấy): `npm run build`, `npx vite preview --port 4173`, dùng Playwright mở trang, chụp ảnh từng màn (menu, giới thiệu, HUD từng đêm, tạm dừng, cài đặt, kết quả, Bình Minh), đo FPS (≥ 30 ở 1280×720, bản build thường) bằng `window.__fps`; lưu `fps.json`. Móc kiểm chứng: `window.__ddl` (`beginNight(n, seed, scenario)`, `step`, `game`, `ui`).
4. `npm run proof -- --phase N` ghi `docs/proof/phase-N/results.md`, `scenarios/*.jsonl`, `determinism.json`, `bot/`, hiệu năng headless. Rồi cập nhật `docs/proof/phase-N/report.md` (Yêu cầu | Kiểm chứng | Bằng chứng | Kết quả; chưa đạt thì ghi "Chưa đạt" + lý do).
5. Khi ticket THAY luật cũ: trước khi code liệt kê scenario/unit test bị ảnh hưởng (mẫu bảng ở `docs/notes/phase-3.md` mục 4), sửa/xóa kèm lý do, ghi ADR ngắn (`docs/adr-phase-N.md`) và CHANGELOG mục "breaking changes".
6. Scenario mới: thêm vào `tests/scenarios/_generate.mjs` (expect tính TAY, ghi công thức trong `description`), xóa thư mục scenario cũ, sinh lại. Định dạng expect: xem đầu `scripts/lib/expect.js`.

## Lưu ý
- Bằng chứng phải khớp mã ở tag: chạy proof SAU commit cuối của phase, trước khi tag.
- Không sửa tay file output. Dừng mọi server Vite đã mở khi xong (kiểm tra cổng 5173/4173).
