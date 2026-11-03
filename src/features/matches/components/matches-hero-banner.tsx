import Link from "next/link";
import { cn } from "@/lib/utils";

export type HeroTabKey = "open" | "all";

type HeroTabItem = {
  key: HeroTabKey;
  label: string;
  href: string;
  count: number;
};

const DEFAULT_HERO_TABS: HeroTabItem[] = [
  { key: "open", label: "Kèo đang mở", href: "/matches", count: 0 },
  { key: "all", label: "All Kèo", href: "/matches?tab=all", count: 0 },
];

export function MatchesHeroBanner({
  className,
  activeTab = "open",
  tabs = DEFAULT_HERO_TABS,
}: Readonly<{ className?: string; activeTab?: HeroTabKey; tabs?: HeroTabItem[] }>) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_18px_40px_rgba(35,65,178,0.18)]",
        className
      )}
    >
      <div className="relative px-5 py-6 sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(125deg,var(--color-match-home)_0%,#4f63ff_42%,#0ec7e7_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.14),transparent_36%),linear-gradient(112deg,transparent_45%,rgba(255,255,255,0.08)_46%,transparent_56%),linear-gradient(122deg,transparent_58%,rgba(255,255,255,0.08)_59%,transparent_66%)]"
        />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <h2 className="text-[32px] leading-[120%] font-black tracking-[-0.64px] max-w-[18.8rem] min-h-[3.8rem]">
              <span className="block">Phủi League</span>
              <span className="block">Kèo Đang Mở</span>
              <span className="mt-1 block text-[1rem] leading-[1.1] tracking-[-0.01em] sm:text-[1.15rem]">
                Toàn khu vực
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:max-w-60 sm:justify-end">
            <Link
              href="/matches#match-filters"
              className="inline-flex w-fit items-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Ráp kèo nhanh
            </Link>
            <Link
              href="/matches"
              className="inline-flex w-fit items-center rounded-full border border-white/65 bg-white/16 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
            >
              Tạo kèo chờ đối
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-[linear-gradient(90deg,rgba(72,57,182,0.95)_0%,rgba(27,126,210,0.95)_100%)] px-4 py-2.5">
        <nav aria-label="Nhóm giải" className="flex items-center gap-5 text-white/85">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                activeTab === tab.key
                  ? "relative text-sm font-semibold text-white after:absolute after:-bottom-2.5 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-white"
                  : "text-sm font-medium"
              }
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] leading-none">
                {tab.count}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}