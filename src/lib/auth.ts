// NextAuth v5 (Auth.js) base config.
// Đăng nhập bằng số điện thoại + OTP qua Credentials provider.
// LƯU Ý: phần xác thực OTP thật sẽ implement ở task "Auth OTP" (bước 3 MVP).
// File này chỉ dựng khung để app compile và sẵn sàng cắm logic.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials provider không dùng DB session -> chiến lược JWT.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "phone-otp",
      credentials: {
        phone: { label: "Số điện thoại", type: "tel" },
        otp: { label: "Mã OTP", type: "text" },
      },
      // TODO(auth task): verify OTP, tìm/tạo User, trả về { id, name, phone }.
      authorize: async () => {
        return null;
      },
    }),
  ],
  callbacks: {
    // Gắn user.id vào token & session để dùng ở server.
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
