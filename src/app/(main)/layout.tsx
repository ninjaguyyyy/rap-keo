import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { AdminForgotPasswordListener } from "@/features/notifications/components/admin-forgot-password-listener";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Nav gộp trên hero: đã đăng nhập -> nút "Đăng xuất"; chưa đăng nhập -> link "Đăng nhập".
  // Trang /matches là public nên layout không được giả định user luôn tồn tại.
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Hero banner gộp header: ảnh home_bg.jpg + scrim + hex pattern.
          Logo + tên + nav (đăng nhập/đăng xuất) nằm ngay trên hero, KHÔNG sticky
          — chỉ trang trí đầu trang (theo docs/home-mock.html). Tiêu đề RÁP KÈO + tagline ở debajo. */}
      <section className="hero-bg hex-bg text-white">
        {/* Top bar: logo + tên + nav, gióng max-w-md với nội dung trang. */}
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/matches" className="flex items-center gap-2">
            {/* Logo brand: quả bóng stylized, bản /public/logo.png (vuông 1:1). */}
            <Image
              src="/logo.png"
              alt="Ráp Kèo"
              width={56}
              height={56}
              priority
              className="h-10 w-10 shrink-0 object-cover bg-white rounded-full"
            />
            <span className="text-lg font-extrabold tracking-tight text-white">
              Ráp Kèo
            </span>
          </Link>
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/matches" });
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-white/80 hover:text-white"
                title={user.email ?? undefined}
              >
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-white hover:text-white/80"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {/* Tiêu đề hero + tagline. */}
        <div className="mx-auto max-w-md px-4 pt-5 pb-10">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
            RÁP KÈO
          </h1>
          <p className="mt-1 text-sm text-white/85">
            Tìm đối · Tìm người · Tìm sân
          </p>
        </div>
      </section>

      {/* Nội dung trang: card nhô lên đè hero (-mt-3 rounded-t-2xl) giống mock. */}
      <main className="bg-surface-muted -mt-3 rounded-t-2xl px-4 py-4">
        <div className="mx-auto max-w-md">{children}</div>
      </main>

      {user?.role === "ADMIN" ? <AdminForgotPasswordListener /> : null}
    </div>
  );
}
