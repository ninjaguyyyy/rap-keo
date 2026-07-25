// Cấu hình NextAuth dùng chung cho cả Edge (middleware) và Node (lib/auth.ts).
// KHÔNG import Prisma/crypto ở đây để middleware chạy được trên Edge runtime.
import type { NextAuthConfig } from "next-auth";

// Các tiền tố route yêu cầu đăng nhập.
// Lưu ý: /matches (danh sách kèo) + /tournaments (danh sách giải) là public —
// vào home thấy list luôn, không cần đăng nhập. Tạo giải/kèo qua server action
// `requireUser()` lo auth. /my-tournaments + /my-matches + /teams cần đăng nhập.
const PROTECTED_PREFIXES = [
  "/teams",
  "/fields",
  "/notifications",
  "/profile",
  "/my-tournaments",
  "/my-matches",
];

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // providers thật được thêm ở lib/auth.ts (Node). Edge chỉ cần kiểm tra session.
  providers: [],
  callbacks: {
    // Bảo vệ route: trả false -> NextAuth redirect về pages.signIn.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      if (isProtected) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // Đưa role vào token để session callback đọc được.
        const u = user as { role?: string };
        if (u.role) token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      // Expose role lên session.user để UI/action check admin.
      if (token.role && session.user) {
        (session.user as { role?: string }).role = token.role as never;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
