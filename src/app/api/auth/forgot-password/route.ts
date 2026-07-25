import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { checkAndMarkForgotPasswordRequest } from "@/features/auth/forgot-password-rate-limit";
import { db } from "@/lib/db";
import { publishNotificationEvent } from "@/features/notifications/sse-bus";
import { sendEmail } from "@/lib/email";
import { forgotPasswordOtpHtml } from "@/features/auth/emails/forgot-password-otp";

const OTP_REQUEST_COOLDOWN_MS = 60_000;

// Parse danh sách email admin từ env (comma-separated). Bỏ trống -> fallback
// tới email của user role ADMIN trong DB.
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

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const requestedAt = new Date();

  let admins: { id: string; email: string | null }[] = [];
  try {
    admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, email: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  if (admins.length === 0) {
    return NextResponse.json(
      { error: "Hiện chưa có admin trực tuyến để xử lý yêu cầu." },
      { status: 503 },
    );
  }

  // Tạo notification (real-time toast cho admin đang online) — best-effort.
  try {
    await Promise.all(
      admins.map(async (admin) => {
        const notification = await db.notification.create({
          data: {
            userId: admin.id,
            type: "MATCH_REQUEST",
            payload: {
              kind: "FORGOT_PASSWORD_OTP",
              phone: parsed.data.phone,
              otp,
              requestedAt: requestedAt.toISOString(),
            },
          },
        });

        publishNotificationEvent({
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          payload: notification.payload,
          read: notification.read,
          createdAt: notification.createdAt.toISOString(),
        });
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Không thể gửi thông báo cho admin. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  // Gửi email OTP tới admin. Ưu tiên danh sách từ env (ADMIN_NOTIFICATION_EMAIL),
  // fallback tới email của user role ADMIN trong DB. Best-effort: log lỗi nhưng
  // không fail request (notification real-time vẫn đã gửi — email là bonus).
  const adminEmails = parseAdminEmails();
  const emailRecipients =
    adminEmails.length > 0
      ? adminEmails
      : admins.map((a) => a.email).filter((e): e is string => e != null);

  if (emailRecipients.length > 0) {
    const emailResult = await sendEmail({
      to: emailRecipients,
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
    }
  } else {
    console.warn(
      "[forgot-password] Không có email admin nhận (ADMIN_NOTIFICATION_EMAIL trống + admin user không có email).",
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