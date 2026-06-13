# PRD — Ráp Kèo

## 1. Vision
Ứng dụng web (mobile-first) giúp các đội bóng phủi **ráp kèo** (tìm đối, tìm người, tìm sân) nhanh và chính xác, thay cho cách rao kèo thủ công trên Facebook group vốn không lọc được và dễ bị trôi tin.

## 2. Vấn đề
- Rao kèo trên Facebook: không filter được (sân gần, trình độ, loại sân, thời gian).
- Tin bị trôi, khó chốt được kèo.
- Quản lý đội, quản lý sân đều làm tay.

## 3. Đối tượng người dùng
- **Đội trưởng / quản lý đội**: tạo kèo, quản lý thành viên, tìm đối.
- **Người chơi lẻ**: tìm đội thiếu người để ghép.
- **Chủ sân**: đăng sân, đăng khung giờ trống (giai đoạn sau).

## 4. User Stories (MVP)
- Là đội trưởng, tôi muốn tạo một kèo nêu rõ loại sân, thời gian, khu vực, trình độ để đội khác tìm thấy.
- Là đội trưởng, tôi muốn lọc kèo theo sân gần, loại sân (5/7/11), khung giờ, trình độ để tìm đối phù hợp.
- Là đội trưởng, tôi muốn gửi yêu cầu ghép kèo và nhận xác nhận để chốt kèo, tránh bị trôi.
- Là người chơi lẻ, tôi muốn tìm kèo đang thiếu người để xin tham gia.
- Là người dùng, tôi muốn đăng nhập bằng số điện thoại (OTP) để tăng độ tin cậy.

## 5. Phạm vi MVP (LÀM)
1. Đăng nhập OTP qua số điện thoại.
2. Tạo & quản lý hồ sơ đội bóng.
3. Tạo kèo (Match) với đầy đủ thuộc tính filter.
4. Tìm & lọc kèo (vị trí/gần, loại sân, thời gian, trình độ, loại kèo).
5. Ghép kèo: gửi yêu cầu → xác nhận → khóa kèo. Thông báo cơ bản.
6. Danh sách sân (chỉ hiển thị, chưa booking).

## 6. KHÔNG làm trong MVP
- Đặt sân / thanh toán online.
- Chat realtime đầy đủ (giai đoạn sau).
- Đánh giá uy tín, lịch sử trận chi tiết.
- App native iOS/Android (làm web responsive trước).
- Gợi ý kèo tự động bằng AI.

## 7. Trạng thái của một Kèo (Match)
`OPEN` → `MATCHED` (đã ghép, chờ xác nhận) → `CONFIRMED` (đã chốt) → `COMPLETED` / `CANCELLED` / `EXPIRED` (quá giờ tự hết hạn).

## 8. Loại kèo
- `FIND_OPPONENT`: tìm đối.
- `NEED_PLAYERS`: thiếu người.
- `FIELD_AVAILABLE`: có sân trống cần rủ kèo.

## 9. Metrics thành công
- Số kèo được tạo / tuần.
- Tỷ lệ kèo chuyển sang CONFIRMED.
- Số đội hoạt động trong khu vực thí điểm.

## 10. Chiến lược ra mắt
Tập trung **một khu vực/quận** để đủ mật độ đội & sân, tránh dàn trải.