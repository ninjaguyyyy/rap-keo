// NextAuth v5 (Auth.js) — config đầy đủ (Node runtime).
// Đăng nhập 2 cách:
//   1. Google OAuth (qua @auth/prisma-adapter, link account theo email).
//   2. Số điện thoại + mật khẩu (Credentials provider, verify bằng bcrypt).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/features/auth/schemas";
import type { UserRole } from "@/generated/prisma/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Adapter cho OAuth: lưu token vào bảng Account + User.
  // session strategy là "jwt" (ở auth.config.ts) -> adapter chỉ lo tạo/link user,
  // không dùng database session.
  adapter: PrismaAdapter(db as never),
  providers: [
    Google({
      // Client ID/Secret lấy từ Google Cloud Console (OAuth client Web).
      // Authorized redirect URI trong Console phải có:
      //   http://localhost:3000/api/auth/callback/google
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Cho phép user gộp tài khoản đã có (cùng email) với Google.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "phone-password",
      credentials: {
        phone: { label: "Số điện thoại", type: "tel" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const baseUrl =
          process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

        let response: Response;
        try {
          response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify(parsed.data),
          });
        } catch {
          return null;
        }

        if (!response.ok) return null;

        const data = (await response.json().catch(() => ({}))) as {
          user?: {
            id?: string;
            email?: string | null;
            name?: string | null;
            role?: UserRole;
          };
        };

        if (!data.user?.id) return null;

        return {
          id: data.user.id,
          email: data.user.email ?? undefined,
          name: data.user.name ?? undefined,
          role: data.user.role,
        };
      },
    }),
  ],
});
