# Phase 1: PRD-0 + Test Contract v1.0

## 1. Tóm tắt yêu cầu

Một màn **Đêm 1 – Đảo Bến**: đảo tròn, 5 Đèn Lồng Lớn. Mây đi lại, nhảy, có camera 3D. Đom đóm rải rác và nhặt được. Nạp đom đóm vào đèn để thắp. Bóng Mực đuổi theo; chạm vào thì mất máu. Tỏa sáng xua chúng và tốn ánh sáng. Bóng Mực sợ đèn. Thắp hết thì thắng, mất hết máu thì thua. Có điểm, HUD, chơi lại được. Bắt buộc có headless và `game.contract.json` theo Test Contract v1.0.

## 2. Giả định cho chỗ mơ hồ

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| A1 | "Máu" là gì | 3 **Ngọn Lửa** (`flames`), mỗi lần bị chạm mất 1 | Khớp khóa `flames` trong contract |
| A2 | Nhặt đom đóm thế nào | Tự động khi khoảng cách XZ ≤ `pickup_radius`, mang tối đa `carry_capacity`; đầy thì đom đóm nằm lại | Không cần thêm phím, dễ kiểm chứng |
| A3 | Nạp đèn | Nhấn `interact`: nạp vào đèn **chưa thắp gần nhất** trong `interact_radius`, hòa thì chọn id nhỏ hơn. Lượng nạp = min(đang mang, còn thiếu). Đủ `lantern_cost` thì thắp | Nạp từng phần cho phép chơi linh hoạt |
| A4 | "Tốn ánh sáng" khi tỏa sáng | Tốn `pulse_cost` đom đóm đang mang. Không đủ thì không có tác dụng và không phát event | Ánh sáng = đom đóm, đơn vị duy nhất trong game |
| A5 | Pulse không trúng ai | Vẫn tính là pulse thành công: trừ chi phí, bắt đầu hồi chiêu, event `pulse` với `stunned_ids: []` | Hành động đã xảy ra |
| A6 | Pulse lên Bóng Mực đang choáng | Choáng lại từ đầu, đẩy tiếp và cộng `per_stun` | Đơn giản, nhất quán |
| A7 | "Bóng Mực sợ đèn" | Không vào được vòng `safe_radius` quanh đèn **đã thắp** (bị chiếu ra mép vòng). Đèn chưa thắp không bảo vệ | Thắp đèn có giá trị chiến thuật |
| A8 | Bị chạm thì rơi bao nhiêu | `dropped = floor(carried × hit_drop_ratio)`, số rơi **mất hẳn** | Giữ luật gọn; ghi rõ cách làm tròn |
| A9 | Nhiều Bóng Mực cùng chạm | Tối đa 1 `player_hit` mỗi bước, sau đó bất tử `invuln_s` | Tránh mất hết máu trong 1 tick |
| A10 | Hết giờ | `game_over lost dawn` khi `time_left_s ≤ 0` | Contract có reason `dawn`; PRD chỉ nói thắng khi thắp hết |
| A11 | Thứ tự xét kết thúc trong cùng bước | all_lit → no_flames → dawn | Ưu tiên người chơi |
| A12 | Điểm thưởng khi thắng | `floor(time_left_s) × per_second_left + flames × per_flame_left`, chỉ cộng khi thắng | Khớp khóa score trong contract |
| A13 | Rơi khỏi đảo | Không có (`fall_enabled: false`): biên tròn 40 m chặn người chơi và Bóng Mực | Giảm phạm vi Phase 1 |
| A14 | Vị trí đèn mặc định | Vòng bán kính 25 m, L1 = (0,0,25), các đèn cách nhau 72° | Khớp ví dụ scenario của contract |
| A15 | Sinh Bóng Mực | Giây 10, sau đó mỗi 15 s (tối đa 6); ở rìa đảo r = 38 m, cách người chơi ≥ 15 m, ngoài vùng an toàn. Vào thẳng trạng thái `chase` | Cho người chơi thời gian làm quen |
| A16 | Sinh đom đóm | 30 con ban đầu trong đĩa r ≤ 36 m (tránh 3 m quanh tâm). Mỗi 3 s thêm 1 con nếu còn < 20 | Đủ để thắp 5 đèn (cần 25) |
| A17 | Trạng thái Bóng Mực | `chase`, `stunned` | Contract chỉ bắt buộc `stunned` |
| A18 | Nhảy | v0 = 6 m/s, g = 20 m/s², chỉ nhảy khi chạm đất. Không ảnh hưởng khoảng cách XZ | Contract đo khoảng cách trên XZ |
| A19 | Thời gian quy ra tick | `round(giây × 60)`: bất tử 90, choáng 150, hồi chiêu 60 tick | Tất định, đếm bằng số nguyên |
| A20 | Scenario `motes` dạng phần tử | Chấp nhận `[x,y,z]` hoặc `{id?, pos}`. Id tự sinh `M1…`, Bóng Mực `S1…` (bỏ qua id đã có) | Ví dụ contract dùng `[x,y,z]` |
| A21 | Lỗi khác ngoài sai định dạng | Thiếu hoặc sai tham số, `--night` ≠ 1: exit 1. Không đọc được file scenario/inputs: exit 2 | Contract chỉ bắt buộc "≠ 0" và "sai định dạng → 2" |

Thứ tự một bước mô phỏng: input → di chuyển/nhảy → interact → pulse → nhặt → Bóng Mực (hết choáng, đuổi, đẩy khỏi vùng an toàn) → va chạm → sinh ngẫu nhiên → thời gian → kết thúc (xem [src/sim/game.js](../../src/sim/game.js)).

## 3. Tiêu chí nghiệm thu

Bảng R1–R18 cùng bằng chứng: [docs/proof/phase-1/report.md](../proof/phase-1/report.md).

## 4. Quyết định thiết kế

- **JS ESM + Node, không bước build** cho headless: `headless_cmd` = `node src/headless/cli.js`, chạy được trên mọi OS.
- **Lõi mô phỏng tách riêng** (`src/sim`), client chỉ đọc state. Nhờ vậy cùng một file inputs cho ra kết quả giống nhau trên client và headless.
- **Một nguồn sự thật cho tuning** (`src/sim/tuning.js`). `game.contract.json` được kiểm tra khớp bằng script và unit test.
- **Kiểm thử hộp đen**: runner scenario gọi đúng `headless_cmd` trong contract, giống cách giảng viên chấm.
- **Bot playthrough**: bot sinh file inputs rồi phát lại qua CLI, chứng minh game thắng được từ đầu đến cuối và kết quả tái lập được.

## 5. Nhật ký dùng AI

Công cụ: **Claude Code** (model Claude Opus) trong VS Code, cả phiên làm việc chạy trên Windows 11.

| Bước | Lời nhắc chính (tóm tắt) | Kết quả |
|---|---|---|
| Lập kế hoạch | "đọc toàn bộ repo và website [lab board] tạo PLAN.md để hoàn thành bài lab" | Agent đọc 6 file lab và tab Phase 1 (PRD-0 + Test Contract), viết `PLAN.md` (checklist contract, giả định, thứ tự bước, bảng truy vết, timeline) |
| Xây dựng | "ko commit, làm 1 phát đến hết plan" | Agent dựng lõi sim, CLI, scenario, test, client, harness, tài liệu trong một phiên; tự chạy kiểm chứng sau mỗi bước |

**Các lần AI sai và cách phát hiện:**

| # | Sai ở đâu | Phát hiện thế nào | Sửa / chỉnh harness |
|---|---|---|---|
| E1 | Runner scenario gọi CLI với `shell: true` trên Windows, đường dẫn có dấu cách bị cắt nên 26/26 scenario FAIL (exit 1) | Thông báo stderr của runner: "tham số không hợp lệ: project\…" | Gọi thẳng `process.execPath`, không qua shell, dùng đường dẫn tương đối. Bài học: FAIL hàng loạt thường là lỗi harness, không phải lỗi game |
| E2 | `node --test tests/unit/` không chạy trên Node 22+ (đối số là glob, không nhận thư mục) | `npm test` báo MODULE_NOT_FOUND | Đổi sang glob `"tests/unit/*.test.js"`, `engines.node >= 22`, CI dùng Node 22 |
| E3 | Lệnh bash heredoc dài để sinh scenario bị lỗi quoting | Bash báo "unexpected EOF" | Viết generator bằng Node trong thư mục tạm; nội dung expect vẫn tính tay |
| E4 | Lệnh `sed` sửa regex trong hook Stop ghi `^s*` thay vì `^\s*`, và lệnh test hook dùng đường dẫn Git Bash (`/d/...`) | Đọc lại file sau sed; hook PostToolUse trả 0 khi lẽ ra phải đỏ | Sửa bằng Edit; test lại hook với đường dẫn Windows thật (như Claude Code gửi), có cả ca đỏ và ca xanh |
| E5 | Màn kết thúc: cột nhãn bị bóp, chữ xuống dòng từng từ | Xem ảnh chụp Playwright | Sửa CSS `grid-template-columns: max-content 1fr`, chụp lại |
| E6 | Khi tự động hóa trình duyệt, vòng lặp thời gian thực vẫn chạy giữa các lệnh nên ván bị thua ngoài ý muốn | Trạng thái `lost` bất ngờ | Không phải bug game. Mọi thao tác kiểm chứng dồn vào một lần `evaluate` |

**Chống "test luôn đạt"**: đã cố ý làm hỏng code (mutation) rồi chạy scenario. Đổi `pickup_radius` 1.5→1.4, `invuln_s` 1.5→1.0, `pulse_stun_s` 2.5→2.0, `safe_radius` 8→0, và bỏ edge-trigger: mỗi lần đều có scenario tương ứng FAIL, khôi phục thì 26/26 PASS. Hook cũng được thử với `pulse_cost` sai (contract lệch): PostToolUse và Stop đều chặn.

**Token / chi phí**: *chưa đo chính xác trong phiên này*. Cần điền từ `/cost` (hoặc trang Usage của claude.ai) trước khi tag `phase-1`:

| Phase | Token vào / ra (ước tính) | Chi phí ước tính | Cách tiết kiệm đã dùng |
|---|---|---|---|
| 1 | _điền từ /cost_ | _điền_ | Lập PLAN.md trước (giả định + thứ tự bước rõ) nên code đúng ngay; scenario PASS 26/26 ở lần chạy đầu tiên sau khi sửa runner; dùng script thay vì để agent đọc output dài; chụp ảnh có chọn lọc (5 ảnh) |

## 6. Đánh giá Phase 1

- **Đạt**: toàn bộ R1–R17 có bằng chứng (xem report). Headless khoảng 59.000 tick/s.
- **Chưa làm trong phiên này (theo yêu cầu "không commit")**: commit, tag `phase-1`, push. R18 (clone sạch) mới kiểm bằng bản sao các file sẽ commit, chưa clone từ GitHub.
- **Rủi ro / cần chỉnh**:
  - Bot tham lam thắng mọi seed đã thử (5/5 trong proof, 8/8 ở lần chạy thử seed 1–8) mà không bị chạm lần nào. Bot có thông tin hoàn hảo nên chưa phản ánh độ khó với người, nhưng gợi ý game có thể hơi dễ. Nếu ticket sau yêu cầu cân bằng thì tăng `shade_speed`/số Bóng Mực, và chỉ sửa tuning ở một chỗ.
  - `npm audit` báo 1 lỗ hổng mức moderate ở esbuild (dev server của Vite 5), không nằm trong bản build. Có thể nâng Vite ở Phase 4.
  - Các giả định A3–A13 có thể khác test ẩn của giảng viên. Đã khai đúng số trong contract; nếu ticket làm rõ thì sửa ở `tuning.js` và scenario tương ứng, kèm lý do.
- **Harness hữu ích nhất**: runner scenario hộp đen + hook Stop (không thể "báo xong" khi còn đỏ).
