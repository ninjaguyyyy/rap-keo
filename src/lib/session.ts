// Helper lấy user hiện tại ở server (Server Component / Server Action / Route Handler).
import { auth } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/enums";

// Mở rộng type để user.role có sẵn trên session (NextAuth default không có).
declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// Trả về user, ném lỗi nếu chưa đăng nhập — dùng cho code yêu cầu auth.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

// Trả về user nếu là ADMIN, ngược lại ném lỗi. Dùng cho action admin-only
// (vd: parse text tạo kèo bằng AI).
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
