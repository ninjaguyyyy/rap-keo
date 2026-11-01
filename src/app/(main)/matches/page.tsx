import { MatchFilters } from "@/features/matches/components/match-filters";
import { MatchesHeroBanner } from "@/features/matches/components/matches-hero-banner";
import { MyMatchFab } from "@/features/matches/components/my-match-fab";
import { MockOpenMatchesList } from "@/features/matches/components/mock-open-matches-list";
import { ScrollToTopOnMount } from "@/components/layout/scroll-to-top-on-mount";
import { getCurrentUser } from "@/lib/session";
import { getActiveMyMatch } from "@/features/matches/queries";
import { openMatchesByDate } from "@/features/matches/mock-open-data";

// Next 16: searchParams là Promise. skillTier có thể lặp lại (?skillTier=A&skillTier=B).
export default async function MatchesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    day?: string;
    [key: string]: string | string[] | undefined;
  }>;
}>) {
  const params = await searchParams;
  const selectedDayKey =
    typeof params.day === "string"
      && openMatchesByDate.some((block) => block.key === params.day)
      ? params.day
      : openMatchesByDate[0].key;
  const selectedBlock =
    openMatchesByDate.find((block) => block.key === selectedDayKey)
    ?? openMatchesByDate[0];

  // Giao diện body dưới hero dùng mock data để duyệt visual mới.
  // /matches là public; chỉ cần check user để render FAB trạng thái kèo cá nhân.
  const user = await getCurrentUser();
  // FAB trạng thái kèo: chỉ load khi user đã đăng nhập (có thể có kèo OPEN).
  const activeMatch = user ? await getActiveMyMatch(user.id) : null;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <ScrollToTopOnMount />
      <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
        <MatchesHeroBanner className="rounded-none border-x-0 shadow-none" />
      </div>

      <div className="mt-4 -mx-4 flex flex-col gap-4">
        <div id="match-filters">
          <MatchFilters
            dayOptions={openMatchesByDate.map((block) => ({
              key: block.key,
              label: block.date,
              count: block.matches.length,
            }))}
            selectedDayKey={selectedDayKey}
          />
        </div>

        <MockOpenMatchesList blockKey={selectedBlock.key} matches={selectedBlock.matches} />
      </div>

      {/* Float button trạng thái kèo của user đăng nhập (chỉ hiện khi có kèo OPEN). */}
      <MyMatchFab match={activeMatch} />
    </div>
  );
}
