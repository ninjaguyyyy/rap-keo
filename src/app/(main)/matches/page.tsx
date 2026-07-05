import { MatchCard } from "@/features/matches/components/match-card";
import { MatchFilters } from "@/features/matches/components/match-filters";
import { CreateMatchDialog } from "@/features/matches/components/create-match-dialog";
import { getCurrentUser } from "@/lib/session";
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
  // /matches là public, nhưng tạo kèo (modal) cần đăng nhập — check user để
  // hiện form hay thông báo đăng nhập trong dialog.
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink">Kèo đang mở</h1>
          <p className="text-sm text-ink-muted">
            {matches.length} kèo sắp diễn ra
          </p>
        </div>
        {/* Nút tạo kèo mở modal (client island). Auth check ở server, truyền xuống. */}
        <CreateMatchDialog isAuthed={!!user} />
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
