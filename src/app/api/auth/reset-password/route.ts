// POST /api/auth/reset-password — verify OTP + set mật khẩu mới.
// Flow: user nhập SĐT (step 1) → admin nhận OTP email → user nhập OTP + mk mới (step 2)
// → route này verify OTP (bcrypt compare với hash trong password_reset_otps) +
// update user.passwordHash + mark OTP used (ngăn replay).
// Sau khi ok, client tự gọi signIn("credentials") để set session (mirror register).
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>;

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      const fieldKey = key as keyof ResetPasswordInput;
      if (!out[fieldKey]) out[fieldKey] = issue.message;
    }
  }
  return out;
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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      },
      { status: 400 },
    );
  }

  const { phone, otp, newPassword } = parsed.data;
  const now = new Date();

  // Load OTP mới nhất chưa dùng + chưa hết hạn cho phone.
  let otpRecord;
  try {
    otpRecord = await db.passwordResetOtp.findFirst({
      where: {
        phone,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, otpHash: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể kiểm tra OTP. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  if (!otpRecord) {
    return NextResponse.json(
      {
        error: "OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu OTP mới.",
        fieldErrors: { otp: "OTP không hợp lệ hoặc đã hết hạn." },
      },
      { status: 400 },
    );
  }

  // Verify OTP: bcrypt.compare plaintext (từ form) vs hash (từ DB).
  const otpOk = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!otpOk) {
    return NextResponse.json(
      {
        error: "OTP không đúng.",
        fieldErrors: { otp: "OTP không đúng." },
      },
      { status: 400 },
    );
  }

  // Load user theo phone — flow này chỉ cho user đã có tài khoản SĐT.
  let user;
  try {
    user = await db.user.findUnique({ where: { phone } });
  } catch {
    return NextResponse.json(
      { error: "Không thể kiểm tra tài khoản. Vui lòng thử lại." },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json(
      {
        error: "Số điện thoại chưa được đăng ký.",
        fieldErrors: { phone: "Số điện thoại chưa được đăng ký." },
      },
      { status: 400 },
    );
  }

  // Set mật khẩu mới + mark OTP used (ngăn replay) trong 1 transaction.
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      db.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: now },
      }),
    ]);
  } catch (err) {
    console.error("[reset-password] Cập nhật mật khẩu thất bại:", err);
    return NextResponse.json(
      { error: "Không đặt lại được mật khẩu. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
