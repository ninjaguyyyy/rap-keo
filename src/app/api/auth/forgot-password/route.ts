import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { checkAndMarkForgotPasswordRequest } from "@/features/auth/forgot-password-rate-limit";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { forgotPasswordOtpHtml } from "@/features/auth/emails/forgot-password-otp";

const OTP_REQUEST_COOLDOWN_MS = 60_000;
const OTP_TTL_MS = 15 * 60_000; // OTP hết hạn sau 15 phút.

// Parse danh sách email admin từ env (comma-separated). VD: "a@x.com,b@y.com".
// Bắt buộc — không fallback tới user role ADMIN trong DB nữa (đơn giản hóa flow:
// chỉ cần set ADMIN_NOTIFICATION_EMAIL là chạy được, không cần seed user ADMIN).
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /.+@.+\..+/.test(s));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ (JSON)." },
      { status: 400 },
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const rateLimit = checkAndMarkForgotPasswordRequest(
    parsed.data.phone,
    OTP_REQUEST_COOLDOWN_MS,
  );
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      {
        error: `Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi lại OTP.`,
        retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  // Resolve email nhận OTP. Bắt buộc có — không có thì trả 503 (service chưa setup).
  const adminEmails = parseAdminEmails();
  if (adminEmails.length === 0) {
    console.error(
      "[forgot-password] ADMIN_NOTIFICATION_EMAIL chưa set — không có nơi nhận OTP.",
    );
    return NextResponse.json(
      { error: "Hệ thống chưa cấu hình nhận yêu cầu. Vui lòng thử lại sau." },
      { status: 503 },
    );
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const requestedAt = new Date();

  // Lưu OTP hash vào DB (verify ở step 2 — POST /api/auth/reset-password).
  // bcrypt hash 10 rounds ~ 100ms — OK cho MVP volume.
  try {
    const otpHash = await bcrypt.hash(otp, 10);
    await db.passwordResetOtp.create({
      data: {
        phone: parsed.data.phone,
        otpHash,
        expiresAt: new Date(requestedAt.getTime() + OTP_TTL_MS),
      },
    });
  } catch (err) {
    console.error("[forgot-password] Lưu OTP vào DB thất bại:", err);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  // Gửi email OTP tới danh sách admin. Best-effort: log lỗi nhưng không crash —
  // vẫn trả 200 để user không bị lặp request (rate limit đã chặn 60s).
  const emailResult = await sendEmail({
    to: adminEmails,
    subject: `Yêu cầu quên mật khẩu — OTP cho ${parsed.data.phone}`,
    html: forgotPasswordOtpHtml({
      phone: parsed.data.phone,
      otp,
      requestedAt,
    }),
    text: `Yêu cầu quên mật khẩu\n\nSĐT: ${parsed.data.phone}\nOTP: ${otp}\nThời gian: ${requestedAt.toLocaleString("vi-VN")}`,
  });
  if (!emailResult.ok) {
    console.error("[forgot-password] sendEmail failed:", emailResult.error);
    return NextResponse.json(
      { error: "Không gửi được email lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Yêu cầu đã được gửi. Admin sẽ nhận OTP qua email và liên hệ lại bạn sớm.",
    },
    { status: 200 },
  );
}