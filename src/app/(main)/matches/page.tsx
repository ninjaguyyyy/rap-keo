import { MatchCard } from "@/features/matches/components/match-card";
import { MatchFilters } from "@/features/matches/components/match-filters";
import { listMatches, parseMatchFilters } from "@/features/matches/queries";

// Next 16: searchParams là Promise.
export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    matchType?: string;
    fieldType?: string;
    skillTier?: string;
    timeSlot?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = parseMatchFilters(params);
  const matches = await listMatches(filters);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Kèo đang mở</h1>
        <p className="text-sm text-gray-500">
          {matches.length} kèo sắp diễn ra
        </p>
      </div>

      <MatchFilters />

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Chưa có kèo nào phù hợp. Thử bỏ bớt bộ lọc nhé.
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
