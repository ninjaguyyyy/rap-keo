-- Thêm cột is_guest cho users: đánh dấu thành viên "khách" (thêm bằng tên,
-- không có tài khoản). Mặc định false. Guest có thể upgrade thành user thật
-- khi đăng ký SĐT (giữ nguyên membership + stats).
ALTER TABLE "users" ADD COLUMN "is_guest" BOOLEAN NOT NULL DEFAULT false;