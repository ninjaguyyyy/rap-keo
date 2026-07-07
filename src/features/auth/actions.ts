"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema } from "./schemas";

export type RegisterState = {
  ok?: boolean;
  error?: string;
};

// Tạo tài khoản thủ công: SĐT + mật khẩu + tên hiển thị.
// Sau khi tạo xong -> signIn Credentials -> redirect về home.
export async function registerManual(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { name, phone, password } = parsed.data;

  // SĐT chưa được dùng (unique).
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    return { error: "Số điện thoại đã được đăng ký." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { name, phone, passwordHash },
  });

  try {
    await signIn("credentials", {
      phone,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Đăng ký thành công nhưng đăng nhập thất bại." };
    }
    // signIn ném redirect khi thành công -> rethrow để Next xử lý.
    throw error;
  }

  return {};
}
