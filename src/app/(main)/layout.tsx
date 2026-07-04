import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Header thích nghi: đã đăng nhập -> nút "Đăng xuất"; chưa đăng nhập -> link "Đăng nhập".
  // Trang /matches là public nên layout không được giả định user luôn tồn tại.
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Header spotlight: tone xanh đậm broadcast + họa tiết hex (DESIGN.md "Spotlight surface").
          Sticky top, dính trên cùng khi cuộn. Khung hẹp max-w-md (~448px) theo mock mobile-first. */}
      <header className="spotlight hex-bg sticky top-0 z-10">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold text-white">Ráp Kèo</span>
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
      </header>

      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
    </div>
  );
}
