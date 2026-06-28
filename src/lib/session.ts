// Helper lấy user hiện tại ở server (Server Component / Server Action / Route Handler).
import { auth } from "@/lib/auth";

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
