# Phase 4 – Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)

Ticket nằm ở `docs/lab/` (lab board). Phase này **không đổi luật, số liệu hay đầu ra headless**: toàn bộ 102 scenario của Phase 1–3 giữ nguyên (không sửa `expect.json` nào). Thêm: benchmark, soak, bảng xếp hạng, accessibility, đóng gói.

## 1. Giả định (B49…B62)

| # | Chỗ mơ hồ của ticket | Giả định đã chọn | Ảnh hưởng |
|---|---|---|---|
| B49 | `<bench_cmd>` của một game web chạy ở đâu | Game là web nên bench mở **trình duyệt Chromium thật** (Playwright, ưu tiên Chrome → Edge → Chromium của Playwright) tải `bench.html` từ bản build `dist/`. Lệnh: `node scripts/bench.js` | Cần Chrome hoặc Edge trên máy chấm (hoặc đặt `BENCH_BROWSER`). `BENCH_HEADLESS=1` cho máy không màn hình (chậm hơn vì SwiftShader) |
| B50 | "Bóng Mực vẫn di chuyển theo luật `wander`" nhưng Mây ở (0,0,0) có thể bị rượt | Dùng lõi mô phỏng thật. Sau mỗi tick, mọi Bóng Mực không ở `wander` bị đặt lại `wander`; Mây, Ngọn Lửa, đom đóm mang, dầu L1–L3 và đồng hồ được khóa (đúng mục "tắt sát thương, nhặt đom đóm, hao dầu, kết thúc Đêm"). Cảnh nằm ở `src/sim/bench.js`, có unit test | Số Bóng Mực luôn đúng 200, đom đóm đúng 100 |
| B51 | "Rải đều trên đảo (seed 42)" | Lưới xoắn ốc hoa hướng dương bán kính 36 m + nhiễu nhỏ lấy từ `createRng(seed)` | Cùng seed → cùng vị trí (test tất định) |
| B52 | "Tắt VSync nếu engine cho phép" | Chrome có `--disable-frame-rate-limit --disable-gpu-vsync`; ghi `vsync_off: true`. Cửa sổ 1280×720 không toàn màn hình, canvas ép đúng 1280×720, pixel ratio 1 | FPS đo được có thể vượt tần số quét màn hình |
| B53 | `load_ms` "từ lúc tiến trình bắt đầu" | Từ lúc `bench.js` bắt đầu **mở trình duyệt** tới khi khung hình đầu tiên của cảnh được vẽ; **không** tính thời gian `vite build` (nếu `dist/` chưa có thì build trước rồi mới bấm giờ) | |
| B54 | `peak_mem_mb` của bản web | Tổng Working Set (Windows) / RSS (Linux, macOS) của **cả cây tiến trình trình duyệt do bench tự mở** (nhận diện bằng thư mục user-data tạm), lấy mẫu mỗi 1.5 s. Cộng dồn các tiến trình nên có thể cao hơn thực tế vì bộ nhớ dùng chung; ghi `null` nếu không đo được | |
| B55 | Soak: "Đêm thứ i dùng seed 7 + i" | `i = 0…9` → seed 7…16, bản đồ `(i mod 3) + 1`. "Chạy tới khi kết thúc" = tới khi sim báo `won`/`lost` (≤ 18 000 tick). Input: mỗi 30 tick chọn lại hướng ngẫu nhiên; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác (luồng RNG riêng của input) | Người chơi ngẫu nhiên thường thua; `results` ghi đúng kết quả thật |
| B56 | `mem_start_mb`/`mem_end_mb` | RSS của tiến trình Node, **sau khi ép GC** (`gc()`), đo ngay sau khi dựng Đêm đầu và sau khi Đêm cuối đã xong và bị giải phóng | Tránh báo "rò rỉ" do rác chưa thu |
| B57 | Bảng xếp hạng "lưu trên đĩa cục bộ" nhưng game chạy trong trình duyệt, còn CLI chạy bằng Node | Máy chủ vite (`npm run dev`/`preview`) có `/api/leaderboard` ghi file `data/leaderboard.json` (ghi nguyên tử); CLI đọc đúng file đó (đổi đường dẫn bằng `DDL_LEADERBOARD`). Bản web tĩnh không có máy chủ thì lưu `localStorage` (màn hình nói rõ nguồn lưu) | `data/` nằm trong `.gitignore` |
| B58 | `<run_cmd> --export-leaderboard` | Đổi `run_cmd` thành `node scripts/run.js` (không tham số thì chạy game như `npm run dev`). `headless_cmd` cũng hiểu `--export-leaderboard`. Bảng rỗng → `{"entries": []}`, mã thoát 0 | `npm run dev` vẫn dùng được |
| B59 | `score`, `seed`, `nights_won` của bản ghi | `score` = tổng điểm các Đêm đã thắng trong lượt chơi; `nights_won` = số Đêm đã thắng; `seed` = seed của Đêm cuối cùng đã chơi. Mời nhập tên khi **thua ở bất kỳ Đêm nào** và ở màn Bình Minh (thắng Đêm 1–2 thì chưa mời vì còn đang chơi). Mỗi (điểm, số Đêm thắng) chỉ lưu một lần | Thua Đêm 1 vẫn lưu được với 0 điểm, 0 Đêm thắng |
| B60 | Tên "3–12 ký tự `[A-Za-z0-9_]`" | Đúng tập đó, **không** nhận chữ có dấu (bonus bị bỏ để không lệch đặc tả; reviewer độc lập chỉ ra rủi ro với test ẩn). Ký tự khác bị từ chối. Cùng điểm → `achieved_at` sớm hơn đứng trên, so theo **thời điểm tức thời** (`isoToMs`, không dùng Date nên hợp luật `src/sim`) | |
| B61 | Đổi phím "mọi hành động" | Mỗi hành động một phím (đi 4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng). Phím dành riêng không gán được: `←` `→` (xoay camera), `↑` `↓` (đi tới/lùi phụ), `Enter` (xác nhận). Gán phím đang dùng bị **từ chối kèm cảnh báo** nêu hành động đang giữ phím và đánh dấu hàng trùng. Shift/Ctrl/Alt trái = phải. Phím tắt phụ cũ `P` (tạm dừng) và `Q` (lướt) được bỏ để không trùng với phím người dùng chọn. Cấu hình hỏng/trùng khi đọc lại → về mặc định | README đã đổi bảng điều khiển |
| B62 | "Cỡ chữ mặc định tối thiểu 18 px" | Mọi chữ hiển thị trong menu, cài đặt, HUD, phụ đề ≥ 18 px ở 1280×720 (đã kiểm bằng `ui-check`: duyệt toàn bộ text node hiển thị). **Chữ lớn** nhân gốc 1.25 → 22.5 px. HUD, vòng hồi chiêu và nhãn được phóng to theo | Bố cục chặt hơn ở màn nhỏ |

Phụ đề / chỉ báo (mục 4 ticket): Bóng Mực xuất hiện (phụ đề + **mũi tên màu viền Bóng Mực (tím, hoặc xanh #00B3FF khi bật bảng màu dễ phân biệt) ở mép màn hình** chỉ hướng trong 6 s nếu con đó ngoài màn hình), Gió sắp thổi (phụ đề 2 s trước gió), 10 giây cuối (dải "Còn N giây tới bình minh!"), đèn `fuel < 30` (phụ đề một lần mỗi khi tụt dưới ngưỡng + dải cảnh báo có sẵn). Bật/tắt trong Cài đặt (mặc định bật). **Giảm chuyển động** tắt rung camera (mới thêm khi bị chạm/rơi, ~0.35 s) và chớp màn hình, thêm cả nhấp nháy đồng hồ/đèn sắp tắt.

## 2. Truy vết yêu cầu → kiểm chứng

| Yêu cầu | Cách kiểm | Bằng chứng |
|---|---|---|
| Bench: cảnh chuẩn 200 + 100, L1–L3 sáng, Mây ở gốc, camera quỹ đạo | unit test `cảnh benchmark…`, `camera benchmark…` | `docs/proof/phase-4/unit-tests.tap` |
| Bench: công thức `avg_fps`, `p1_low_fps`, `frame_ms_p95`, `frames` | unit test `benchStats…` (số tính tay) | như trên |
| Bench: chạy thật 1280×720, 30 s, mã thoát 0, ngưỡng | `node scripts/bench.js --seed 42 --duration 30 --out bench.json` | `bench.json` (gốc repo) và `docs/proof/phase-4/bench.json` |
| Soak: 10 đêm, crashes = 0, RSS ≤ 1.2× | unit test `soak CLI…` + chạy thật | `soak.json`, `docs/proof/phase-4/soak.json` |
| Bảng xếp hạng: luật tên, sắp xếp, top 10, xuất CLI | unit test + `ui-check` (lưu lên đĩa, mở lại, xuất CLI) | `ui-check.json`, ảnh `ui-08`, `ui-09` |
| Đổi phím: trùng, khôi phục, lưu bền | unit test `đổi phím…` + `ui-check` | ảnh `ui-04`, `ui-05` |
| Phụ đề, Giảm chuyển động, cỡ chữ | `ui-check` | ảnh `ui-03`, `ui-06`, `ui-07` |
| Tương thích ngược | `npm run verify` (102 scenario + unit + tất định + bot) | `docs/proof/phase-4/results.md` |

## 3. Chưa đạt / hạn chế (nói thật)

- **Điểm đo của tôi không phải điểm trên máy chấm chuẩn.** `bench.json` đo trên Chrome 158 + AMD Radeon iGPU, Windows 11; máy chấm có thể cho số khác.
- Bản web tĩnh (Release `v1.0.0`) mở bằng `file://` không chạy được (module ES); cần máy chủ tĩnh bất kỳ hoặc `npm run preview`. Bảng xếp hạng khi đó lưu `localStorage`, **không** xuất được bằng CLI.
- `peak_mem_mb` cộng Working Set nhiều tiến trình nên cao hơn thực (B54).
- Chưa thử trên macOS/Linux (chỉ CI chạy `verify`; bench/ui-check chưa chạy ở CI vì cần GPU/trình duyệt).
- Video demo: xem README/SUBMISSION.
- Token/chi phí: chưa đo được từ trong phiên (cần `/cost` của chính tác giả), xem mục 4.

## 4. Nhật ký dùng AI (Phase 4)

- Công cụ: Claude Code (VSCode), harness có sẵn: `AGENTS.md`, hook `PostToolUse`/`Stop`, skill `verify-game`, subagent `reviewer`.
- Hook `PostToolUse` bắt ngay hai lỗi do AI gây ra: (1) `Date` lọt vào `src/sim` (đã chuyển `isoWithOffset` sang client); (2) viết `\n` trong chuỗi Python làm vỡ cú pháp `cli.js` (đúng cảnh báo trong AGENTS.md; sửa bằng Edit trực tiếp).
- AI sai và cách phát hiện: `configureServer: (s) => s.middlewares.use(...)` trả về hàm khiến vite hiểu là hook "post" và sập khi khởi động; lộ ra khi `ui-check` không kết nối được máy chủ. Trong test giao diện, sửa tay `timeLeft` không có tác dụng vì sim tự tính lại từ `simTick`; phải dựng đêm bằng `scenario.time_left_s`.
- Token/chi phí: **chưa đo**. Tác giả điền từ `/cost` hoặc trang Usage trước khi nộp:

| Phase | Token vào / ra | Chi phí | Cách tiết kiệm đã dùng |
|---|---|---|---|
| 4 | _điền_ | _điền_ | Đọc phần cần thiết của file lớn (offset/limit), sửa nhỏ bằng Edit thay vì ghi lại cả file, tái dùng bộ test/scenario có sẵn thay vì viết lại, chạy `npm test` (3 s) trước `verify` đầy đủ |

## 5. Review độc lập

Subagent `reviewer` đã chạy trên diff Phase 4 trước khi tag (không có lỗi nghiêm trọng; `npm run verify` xanh). Ba điểm được sửa: tên chỉ nhận `[A-Za-z0-9_]` đúng ticket (trước nhận cả chữ có dấu); bỏ `Date.parse` khỏi `src/sim` (tự viết `isoToMs`); soak khởi động JIT trước khi đo mốc đầu (biên RSS từ ~10% lên ~20%). Thêm: khớp đúng `/api/leaderboard`, kiểm `DIST + sep` ở máy chủ bench. Chưa xử lý (rủi ro thấp, ghi lại): máy chủ bảng xếp hạng không kiểm Origin (chỉ phục vụ dev cục bộ; bản ghi vẫn bị kiểm hợp lệ).
