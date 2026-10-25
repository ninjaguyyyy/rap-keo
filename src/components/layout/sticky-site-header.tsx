import Image from "next/image";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

const MENU_LINKS = [
  { href: "/matches", label: "Kèo đang mở" },
  { href: "/my-matches", label: "Kèo của tôi" },
  { href: "/teams", label: "Đội của tôi" },
  { href: "/tournaments", label: "Giải đấu" },
  { href: "/my-tournaments", label: "Giải của tôi" },
  { href: "/notifications", label: "Thông báo" },
];

export async function StickySiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-[#f7f5fa]/95 supports-backdrop-filter:backdrop-blur-md">
      <div className="h-1 w-full bg-accent-yellow/45" aria-hidden="true" />
      <div className="mx-auto w-full max-w-screen-xl px-0 pb-2 pt-0">
        <div className="flex items-center justify-between gap-2 rounded-b-[1.8rem] bg-surface px-3 py-2.5 shadow-[0_10px_28px_rgba(42,6,52,0.12)] ring-1 ring-line/70">
          <div className="flex min-w-0 items-center gap-2">
            <details className="group/menu relative shrink-0">
              <summary className="inline-flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-brand-soft [&::-webkit-details-marker]:hidden">
                <Menu className="size-6" />
              </summary>
              <div className="absolute left-0 top-14 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
                <nav className="flex flex-col p-1.5">
                  {MENU_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </details>

            <Link href="/matches" className="flex min-w-0 items-center gap-2">
              <Image
                src="/logo-with-background.png"
                alt="Phủi League"
                width={48}
                height={48}
                priority
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <span className="hidden truncate text-[1.75rem] leading-[0.9] font-black tracking-[-0.03em] text-ink md:block">
                Phủi League
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
              href="/matches"
              aria-label="Tìm kiếm kèo"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-line transition-colors hover:bg-brand-soft"
            >
              <Search className="size-[18px]" />
            </Link>

            <Link
              href={user ? "/teams" : "/register"}
              className="hidden rounded-full bg-[linear-gradient(90deg,#00ff85,#64006e,#ff7a00)] p-[1px] sm:inline-flex"
            >
              <span className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold text-ink">
                Join myPL
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
                  className="inline-flex h-10 items-center px-1 text-base font-medium text-ink transition-colors hover:text-brand sm:px-2"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center px-1 text-base font-medium text-ink transition-colors hover:text-brand sm:px-2"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
