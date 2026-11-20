# ADR-003: Đèn có nhiên liệu và luật thắng "sống tới bình minh"

- Trạng thái: **Chấp nhận** (Phase 3, Ticket-03 "Đèn cạn dầu", Contract v1.2)
- Thay thế: luật Ticket-02 "đèn đã sáng không nhận thêm đom đóm", "Bóng Mực không bao giờ vào vùng an toàn", "thắng ngay khi tất cả đèn sáng", công thức điểm cũ.
- Liên quan: [phase-3.md](notes/phase-3.md) (giả định và test bị thay), [CHANGELOG.md](../CHANGELOG.md).

## Bối cảnh

Người chơi giỏi thắp đủ đèn trong 2 phút rồi game kết thúc. Nhà thiết kế muốn căng thẳng kéo tới cuối Đêm: đèn thắp rồi vẫn có thể tắt, mục tiêu đổi từ "thắp hết" sang "giữ đảo sáng tới bình minh".

## Quyết định

### 1. Mô hình trạng thái đèn

Trước: `{ lit, deposited }` (một chiều: tắt → sáng, đứng yên mãi mãi).
Nay: `{ lit, deposited, fuelU, everLit, relitCount }`, và đèn là một máy trạng thái hai chiều.

```
            nạp đủ cost (10 lần đầu / 5 thắp lại)
   TẮT  ───────────────────────────────────────────►  SÁNG (fuel = 100)
  (fuel 0,   ◄───────────────────────────────────────   │   ▲
   deposited 0)        fuel <= 0 -> lantern_out         │   │ châm dầu (refuel)
        ever_lit giữ true                               └───┘ fuel += 10·used
```

- **Dầu là số nguyên "đơn vị 1/60 fuel"** (`fuel = 100` ⇔ `6000` đơn vị). Tự hao 1 đơn vị/tick, mỗi Bóng Mực `drain` hút thêm 5 đơn vị/tick. Lý do: `1/60` không biểu diễn chính xác bằng số thực nhị phân, cộng 3600 lần sẽ trôi; số nguyên cho đúng mốc `fuel == 30` (còn vùng an toàn) và `fuel <= 0` (tắt). Chỉ làm tròn khi xuất (`output.js`: 1 chữ số).
- `everLit` quyết định chi phí thắp (10 hay 5); đèn tắt xong `deposited = 0` nhưng `everLit` giữ `true`.
- **Châm dầu** là nhánh của cùng thao tác Tương tác: `used = min(đang mang, ceil((100 - fuel)/10))`. Phát `refuel` (không phát `deposit`/`lantern_lit`).
- Đèn nhận được = chưa sáng **hoặc** sáng chưa đầy dầu; chọn gần nhất, bằng nhau `id` nhỏ hơn.
- **Vùng an toàn** là hàm của dầu, không còn của `lit`: `hasZone(L) = lit && fuel >= 30`. Một chỗ định nghĩa duy nhất, dùng cho đẩy lùi, chặn Bóng Mực di chuyển và lọc điểm sinh.

### 2. Bóng Mực `drain`

Thêm trạng thái `drain` vào máy trạng thái Bóng Mực. Chỉ con `wander` chọn đèn yếu (sáng, `fuel < 30`, gần nhất, bằng nhau `id` nhỏ); không có đèn yếu thì **đi lang thang ngẫu nhiên như Ticket-02** (cố ý giữ nguyên để không đổi chuỗi số ngẫu nhiên và hành vi của test cũ). `chase` không đổi mục tiêu. Hút theo đèn: đèn bị `n` con hút hao `1 + 5n` đơn vị/tick.

Thứ tự ưu tiên khi rời `drain`: chase (Mây trong 6 m) → wander (đèn tắt / fuel ≥ 30 / cách đèn > 2 m); Tỏa Sáng đưa sang `stunned` ở bước 7 (trước bước di chuyển).

### 3. Luật thắng/thua ở bước 11

Bước 11 đọc theo thứ tự: hết Ngọn Lửa → `lost/no_flames`; hết giờ → đếm đèn sáng so với `ceil(0.6·n)` → `won/dawn_survived` hoặc `lost/dawn`. Không còn nhánh `all_lit`. Điều kiện đếm đèn nằm **sau** bước 2 (trừ dầu) của chính tick bình minh, nên đèn cạn đúng tick cuối không được tính.

### 4. Điểm, sức chứa

Công thức điểm mới nằm trong `TUNING.score` (một nguồn). Sức chứa là hàm thuần của `player.successfulLights` (`capacityOf(g)`), nên không cần trường trạng thái thứ hai; HUD và sim cùng gọi một hàm.

### 5. Client (không đổi output headless)

Hiển thị đọc `g.lanterns[].fuelU`, `shade.state`, `shade.target`; "Bảng màu dễ phân biệt" là cài đặt thuần client (`body.cb`, `view.setAccessible`). Phân biệt không phụ thuộc màu: đèn tắt xẹp 20% + vết rách, đèn fuel < 30 nhấp nháy 1 Hz, tia hút dầu nối Bóng Mực với đèn.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Lưu `fuel` là số thực | Trôi số sau nhiều tick; mốc `== 30` có thể sai một tick giữa các máy |
| Tách trạng thái đèn thành enum `off/lit/low` | `low` suy ra được từ `fuel`; thêm một nguồn sự thật làm lệch khi châm dầu qua ngưỡng |
| Cho Bóng Mực `wander` luôn đi tới đèn tắt (đọc "như trước") | Ticket-02 không có hành vi đó (wander là đi ngẫu nhiên); thêm vào sẽ làm đổi hành vi Phase 2 mà ticket không yêu cầu |
| Phát `deposit` cùng `refuel` khi châm dầu | Ticket liệt kê `refuel` là sự kiện riêng; `deposit` mang nghĩa "nạp để thắp" |

## Hệ quả

- **Phá vỡ tương thích** (xem CHANGELOG): thời lượng đêm, điểm, điều kiện thắng, `lantern_lit.relight`, snapshot thêm trường, scenario thêm trường. Test Phase 1–2 không bị thay thế vẫn đạt; test bị thay được viết lại kèm lý do.
- Hệ quả thiết kế đáng chú ý: vì dầu hao ở bước 2, **không có lúc nào đèn đang sáng mà "đầy dầu" ở bước tương tác** (vừa thắp/châm xong thì tick sau đã hao 1 đơn vị). Nhánh "đèn đầy dầu không được chọn" vẫn cài đặt theo ticket nhưng chỉ kiểm được bằng unit test với `fuel_decay_per_s = 0`, không bằng scenario headless.
- Ảnh hưởng cân bằng: thắng cần liên tục kiếm đom đóm để châm dầu; sức chứa tăng dần (tối đa 20) giúp chở nhiều hơn mỗi chuyến.
