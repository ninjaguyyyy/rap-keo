// Cấu hình NextAuth dùng chung cho cả Edge (middleware) và Node (lib/auth.ts).
// KHÔNG import Prisma/crypto ở đây để middleware chạy được trên Edge runtime.
import type { NextAuthConfig } from "next-auth";

// Các tiền tố route yêu cầu đăng nhập.
// Lưu ý: /matches (danh sách kèo) là public — vào home thấy list kèo luôn,
// không cần đăng nhập. Tạo kèo giờ là modal trên /matches (server action
// `createMatch` -> `requireUser()` lo auth), không còn route /matches/new.
const PROTECTED_PREFIXES = [
  "/teams",
  "/fields",
  "/notifications",
  "/profile",
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
