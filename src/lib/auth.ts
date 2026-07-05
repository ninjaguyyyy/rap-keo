// NextAuth v5 (Auth.js) — config đầy đủ (Node runtime).
// Đăng nhập bằng email + OTP qua Credentials provider.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { verifyOtp } from "@/features/auth/otp";
import { verifyOtpSchema } from "@/features/auth/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "email-otp",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Mã OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const parsed = verifyOtpSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, otp } = parsed.data;
        const result = await verifyOtp(email, "EMAIL", otp);
        if (!result.ok) return null;

        // Find-or-create user theo email. name để trống cho onboarding sau.
        const user = await db.user.upsert({
          where: { email },
          create: { email },
          update: {},
        });

        // Trả role để jwt callback đưa vào token (xem auth.config.ts).
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
