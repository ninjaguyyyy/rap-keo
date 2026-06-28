// Bảo vệ route bằng NextAuth (Edge). Dùng authConfig edge-safe (không import Prisma).
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // Logic bảo vệ nằm ở callbacks.authorized trong authConfig.
  void req;
});

export const config = {
  // Bỏ qua static assets, ảnh, và route nội bộ của Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
