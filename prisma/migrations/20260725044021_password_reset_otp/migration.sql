-- Bảng password_reset_otps: lưu OTP đặt lại mật khẩu (hash bằng bcrypt).
-- phone: SĐT user yêu cầu reset. otpHash: hash bcrypt của OTP 6 số.
-- expiresAt: hết hạn sau 15 phút. usedAt: mark sau khi verify (ngăn replay).
CREATE TABLE "password_reset_otps" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- Index cho query: load OTP mới nhất chưa dùng + chưa hết hạn theo phone.
CREATE INDEX "password_reset_otps_phone_expires_at_idx" ON "password_reset_otps"("phone", "expires_at");
