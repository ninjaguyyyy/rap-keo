-- NOTE: Cố ý GIỮ các GIST index location (Prisma không biểu diễn được trong
-- schema nên muốn drop — như các migration trước). Loại bỏ 3 DROP INDEX dưới đây.

-- AlterTable: password cho user đăng nhập thủ công.
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT;

-- DropTable: xoá flow OTP (đổi sang phone+password + Google).
DROP TABLE "otp_codes";

-- DropEnum
DROP TYPE "OtpChannel";

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

