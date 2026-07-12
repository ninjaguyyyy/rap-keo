import { z } from "zod";

// Số điện thoại Việt Nam: bắt đầu bằng 0, 9-10 chữ số (vd 09xxxxxxxx, 03xxxxxxxx).
// Đơn giản hoá cho MVP — không verify durch mạng thật (không OTP SMS).
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ (vd: 0912345678)");

// Mật khẩu: tối thiểu 6 ký tự (MVP phủi, không bắt complexity nặng).
export const passwordSchema = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự");

// Tên hiển thị.
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Tên hiển thị tối thiểu 2 ký tự")
  .max(50, "Tên hiển thị tối đa 50 ký tự");

// Đăng ký thủ công: SĐT + mật khẩu + tên hiển thị.
export const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

// Đăng nhập bằng SĐT + mật khẩu (dùng cho Credentials authorize).
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

// Quên mật khẩu MVP: nhận số điện thoại để gửi hướng dẫn/OTP ở bước sau.
export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
