import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { checkAndMarkForgotPasswordRequest } from "@/features/auth/forgot-password-rate-limit";
import { db } from "@/lib/db";
import { publishNotificationEvent } from "@/features/notifications/sse-bus";

const OTP_REQUEST_COOLDOWN_MS = 60_000;

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

  let admins: { id: string }[] = [];
  try {
    admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
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

  try {
    await Promise.all(
      admins.map(async (admin) => {
        // Tạm thời tái sử dụng enum type hiện có để tránh thay đổi schema DB,
        // phân loại nghiệp vụ thật bằng payload.kind.
        const notification = await db.notification.create({
          data: {
            userId: admin.id,
            type: "MATCH_REQUEST",
            payload: {
              kind: "FORGOT_PASSWORD_OTP",
              phone: parsed.data.phone,
              otp,
              requestedAt: new Date().toISOString(),
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

  return NextResponse.json(
    {
      ok: true,
      message: "Yêu cầu đã được gửi cho admin. Vui lòng chờ OTP được gửi thủ công.",
    },
    { status: 200 },
  );
}