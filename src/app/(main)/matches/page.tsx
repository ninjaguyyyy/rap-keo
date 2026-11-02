import { MatchFilters } from "@/features/matches/components/match-filters";
import { MatchesHeroBanner } from "@/features/matches/components/matches-hero-banner";
import { MyMatchFab } from "@/features/matches/components/my-match-fab";
import { MockOpenMatchesList } from "@/features/matches/components/mock-open-matches-list";
import { ScrollToTopOnMount } from "@/components/layout/scroll-to-top-on-mount";
import { getCurrentUser } from "@/lib/session";
import { getActiveMyMatch, listMatches, parseMatchFilters } from "@/features/matches/queries";
import { areaLabels, fieldTypeLabels, skillTierLabels } from "@/features/matches/labels";
import type { OpenMatch } from "@/features/matches/mock-open-data";

type MatchRow = Awaited<ReturnType<typeof listMatches>>[number];

const dayLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const vnDateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

function getVnDateKey(date: Date): string {
  const parts = vnDateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function getPrimaryPlayTime(match: MatchRow): Date | null {
  if (match.playTimes.length === 0) return null;
  const sorted = [...match.playTimes].sort((a, b) => a.getTime() - b.getTime());
  const now = Date.now();
  return sorted.find((value) => value.getTime() >= now) ?? sorted[0];
}

function parseVnDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  return new Date(`${key}T00:00:00+07:00`);
}

const kickoffFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

function parsePlayersCount(note: string | null): number | undefined {
  if (!note) return undefined;
  const matched = note.match(/\[(\d+)\s*cầu rảnh\]/i);
  if (!matched) return undefined;
  const value = Number(matched[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function toOpenMatch(match: MatchRow): OpenMatch | null {
  const primaryTime = getPrimaryPlayTime(match);
  if (!primaryTime) return null;

  const kickoff = kickoffFormatter.format(primaryTime);
  const firstSkillTier = match.skillTiers[0];
  const sourceHomeName =
    match.sourceTeamName ??
    match.team?.name ??
    match.creator.name ??
    "Đội chủ nhà";
  const district =
    areaLabels[match.area ?? ""] ??
    match.area ??
    match.field?.name ??
    "Chưa rõ khu vực";

  const matchType =
    match.matchType === "FIND_OPPONENT" ||
    match.matchType === "NEED_PLAYERS" ||
    match.matchType === "FIELD_AVAILABLE" ||
    match.matchType === "LOOKING_FOR_TEAM"
      ? match.matchType
      : undefined;

  return {
    id: match.id,
    homeTeam: sourceHomeName,
    awayTeam: undefined,
    matchType,
    neededPlayers: parsePlayersCount(match.note),
    kickoff,
    fieldType: fieldTypeLabels[match.fieldType],
    district,
    skillLabel: firstSkillTier ? skillTierLabels[firstSkillTier] : "Mọi trình độ",
    phone: match.sourcePhone ?? "",
    fbLink: match.sourcePostUrl ?? "",
  };
}

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

  const filters = parseMatchFilters({
    matchType: typeof params.matchType === "string" ? params.matchType : undefined,
    fieldType: typeof params.fieldType === "string" ? params.fieldType : undefined,
    skillTier: params.skillTier,
    timeSlot: params.timeSlot,
  });
  const matches = await listMatches(filters);
  const groupedByDay = new Map<string, MatchRow[]>();

  for (const match of matches) {
    const primaryTime = getPrimaryPlayTime(match);
    if (!primaryTime) continue;
    const key = getVnDateKey(primaryTime);
    const bucket = groupedByDay.get(key);
    if (bucket) {
      bucket.push(match);
    } else {
      groupedByDay.set(key, [match]);
    }
  }

  const fallbackDayKey = getVnDateKey(new Date());
  const availableDayKeys = [...groupedByDay.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  const lastAvailableDayKey =
    availableDayKeys.length > 0
      ? availableDayKeys[availableDayKeys.length - 1]
      : fallbackDayKey;

  const startDate = parseVnDateKey(fallbackDayKey) ?? new Date();
  const endDate = parseVnDateKey(lastAvailableDayKey) ?? startDate;
  const totalDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
  );

  const dayOptions = Array.from({ length: totalDays }, (_, index) => {
    const current = new Date(startDate.getTime() + index * 86_400_000);
    const key = getVnDateKey(current);
    const count = groupedByDay.get(key)?.length ?? 0;
    return {
      key,
      label: dayLabelFormatter.format(current),
      count,
    };
  });

  const selectedDayKey =
    typeof params.day === "string"
      && dayOptions.some((day) => day.key === params.day)
      ? params.day
      : fallbackDayKey;
  const selectedMatches = (groupedByDay.get(selectedDayKey) ?? [])
    .map(toOpenMatch)
    .filter((value): value is OpenMatch => value !== null);

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
          <MatchFilters dayOptions={dayOptions} selectedDayKey={selectedDayKey} />
        </div>

        <MockOpenMatchesList
          blockKey={selectedDayKey}
          matches={selectedMatches}
        />
      </div>

      {/* Float button trạng thái kèo của user đăng nhập (chỉ hiện khi có kèo OPEN). */}
      <MyMatchFab match={activeMatch} />
    </div>
  );
}
