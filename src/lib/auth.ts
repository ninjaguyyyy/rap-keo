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

// Field Auth.js gửi cho adapter.createUser/updateUser. Remap `image` -> `avatarUrl`
// (cột trong schema Phủi League) + bỏ `emailVerified` (schema không có). Không remap
// -> Prisma error "Unknown argument `image`" lúc user.create.
type AdapterUserInput = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

// Field Auth.js gửi cho adapter.linkAccount. Remap snake_case -> camelCase
// (schema Phủi League dùng camelCase: access_token -> accessToken, id_token -> idToken,
// expires_at -> expiresAt, token_type -> tokenType, provider_account_id ->
// providerAccountId). Không remap -> Prisma error "Unknown argument `access_token`".
type AdapterAccountInput = {
  provider: string;
  type: string;
  providerAccountId: string;
  access_token?: string | null;
  id_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  userId: string;
};

const baseAdapter = PrismaAdapter(db as never) as Record<string, unknown>;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Adapter cho OAuth: lưu token vào bảng Account + User.
  // session strategy là "jwt" (ở auth.config.ts) -> adapter chỉ lo tạo/link user,
  // không dùng database session.
  adapter: {
    ...baseAdapter,
    // Override createUser: remap image -> avatarUrl + bỏ emailVerified.
    async createUser(data: AdapterUserInput) {
      return db.user.create({
        data: {
          name: data.name ?? null,
          email: data.email ?? null,
          avatarUrl: data.image ?? null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      }) as never;
    },
    // updateUser: remap image -> avatarUrl nếu Auth.js gửi (vd khi update profile).
    async updateUser(data: AdapterUserInput & { id: string }) {
      return db.user.update({
        where: { id: data.id },
        data: {
          ...(data.name != null ? { name: data.name } : {}),
          ...(data.email != null ? { email: data.email } : {}),
          ...(data.image != null ? { avatarUrl: data.image } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      }) as never;
    },
    // Override linkAccount: remap snake_case -> camelCase cho schema Phủi League.
    // PrismaAdapter default dùng snake_case (access_token, id_token...) — schema
    // dùng camelCase nên phải remap.
    async linkAccount(data: AdapterAccountInput) {
      return db.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refreshToken: data.refresh_token ?? null,
          accessToken: data.access_token ?? null,
          expiresAt: data.expires_at ?? null,
          tokenType: data.token_type ?? null,
          scope: data.scope ?? null,
          idToken: data.id_token ?? null,
        },
      }) as never;
    },
    // getUser, getUserByEmail, getUserByAccount, deleteUser, unlinkAccount: giữ
    // default của PrismaAdapter — chỉ linkAccount cần remap do schema camelCase.
  } as never,
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
