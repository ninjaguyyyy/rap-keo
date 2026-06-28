"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { createOtp } from "./otp";
import { sendOtpEmail } from "./mailer";
import { requestOtpSchema, verifyOtpSchema } from "./schemas";

export type RequestOtpState = {
  ok?: boolean;
  email?: string;
  error?: string;
};

// Bước 1: nhận email -> sinh OTP -> gửi (dev: log console).
export async function requestEmailOtp(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const parsed = requestOtpSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email không hợp lệ" };
  }

  const { email } = parsed.data;
  const result = await createOtp(email, "EMAIL");
  if (!result.ok) {
    return { error: "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau ít phút." };
  }

  await sendOtpEmail(email, result.code);
  return { ok: true, email };
}

export type VerifyOtpState = {
  error?: string;
};

// Bước 2: nhận email + OTP -> signIn Credentials -> redirect.
export async function verifyEmailOtp(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = verifyOtpSchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      otp: parsed.data.otp,
      redirectTo: "/",
    });
  } catch (error) {
    // signIn ném redirect khi thành công -> phải rethrow để Next xử lý.
    if (error instanceof AuthError) {
      return { error: "Mã OTP không đúng hoặc đã hết hạn." };
    }
    throw error;
  }

  return {};
}
