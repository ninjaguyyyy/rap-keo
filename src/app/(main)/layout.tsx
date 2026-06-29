import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold text-green-700">Ráp Kèo</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm font-medium text-gray-500 hover:text-red-600"
              title={user?.email ?? undefined}
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
    </div>
  );
}
