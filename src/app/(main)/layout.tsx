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
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold text-brand">Ráp Kèo</span>
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/matches" });
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-ink-muted hover:text-danger"
                title={user.email ?? undefined}
              >
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-brand hover:text-brand-hover"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
    </div>
  );
}
