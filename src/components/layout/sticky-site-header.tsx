import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { HeaderHamburgerMenu } from "@/components/layout/header-hamburger-menu";

export async function StickySiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-[#f7f5fa]/95 supports-backdrop-filter:backdrop-blur-md">
      <div className="h-1 w-full bg-accent-yellow/45" aria-hidden="true" />
      <div className="mx-auto w-full max-w-screen-xl px-0 pt-0">
        <div className="flex items-center justify-between gap-2 rounded-b-[1.8rem] bg-surface px-3 py-2.5 shadow-[0_10px_28px_rgba(42,6,52,0.12)] ring-1 ring-line/70">
          <div className="flex min-w-0 items-center gap-2">
            <HeaderHamburgerMenu />

            <Link href="/matches" className="flex min-w-0 items-center gap-0">
              <Image
                src="/logo-with-background.png"
                alt="Phủi League"
                width={48}
                height={48}
                priority
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <span className="text-[14px] leading-[0.95] font-black tracking-[-0.02em] text-primary sm:text-[1.45rem] sm:leading-[0.9] sm:tracking-[-0.03em]">
                <span className="block">Phủi</span>
                <span className="block">League</span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-surface-muted ring-1 ring-line lg:inline-flex"
            >
              <span className="h-[18px] w-[18px] rounded-full bg-[conic-gradient(from_110deg,#6A5CFF,#45D7FF,#5AF78D,#6A5CFF)]" />
            </span>

            <Link
              href={user ? "/teams" : "/register"}
              className="rounded-full bg-[linear-gradient(90deg,#00ff85,#64006e,#ff7a00)] p-[1px]"
            >
              <span className="inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] leading-4 font-semibold text-ink">
                Đội bóng
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
                  className="inline-flex h-10 cursor-pointer items-center px-1 text-[12px] font-medium text-ink transition-colors hover:text-brand sm:px-2"
                >
                  Đăng xuất
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 cursor-pointer items-center px-1 text-[12px] font-medium text-ink transition-colors hover:text-brand sm:px-2"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
