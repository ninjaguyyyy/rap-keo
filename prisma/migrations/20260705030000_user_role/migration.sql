-- Thêm vai trò user (USER/ADMIN). Mặc định USER. Admin seed riêng (set sau).
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
