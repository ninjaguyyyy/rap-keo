import Link from "next/link";
import { MatchCard } from "@/features/matches/components/match-card";
import { MatchFilters } from "@/features/matches/components/match-filters";
import { listMatches, parseMatchFilters } from "@/features/matches/queries";

// Next 16: searchParams là Promise. skillTier có thể lặp lại (?skillTier=A&skillTier=B).
export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    matchType?: string;
    fieldType?: string;
    skillTier?: string | string[];
    timeSlot?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const filters = parseMatchFilters(params);
  const matches = await listMatches(filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink">Kèo đang mở</h1>
          <p className="text-sm text-ink-muted">
            {matches.length} kèo sắp diễn ra
          </p>
        </div>
        {/* Nút tạo kèo — hành động chính màu brand, vùng chạm h-11 (DESIGN.md). */}
        <Link
          href="/matches/new"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tạo kèo
        </Link>
      </div>

      <MatchFilters />

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center">
          {/* Icon clipboard/whistle tinh tế, cùng tông brand. */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-subtle"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <p className="text-sm text-ink-muted">Chưa có kèo nào phù hợp</p>
          <p className="text-xs text-ink-subtle">
            Thử bỏ bớt bộ lọc để xem thêm kèo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <li key={match.id}>
              <MatchCard match={match} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
