import { z } from "zod";

// Email đăng nhập — chuẩn hoá: trim + lowercase.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email không hợp lệ");

// OTP 6 chữ số.
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số");

// Dùng cho server action xin OTP.
export const requestOtpSchema = z.object({
  email: emailSchema,
});

// Dùng cho bước xác thực (Credentials authorize).
export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
