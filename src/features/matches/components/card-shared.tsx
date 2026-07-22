// Phần dùng chung cho các biến thể MatchCard.
import type { MatchListItem } from "../queries";
import {
  areaLabels,
  fieldTypeLabels,
  formatPlayTimes,
  matchTypeLabels,
  skillTierLabels,
} from "../labels";
import { Badge } from "@/components/ui/badge";

// Shape match dùng được cho resolveSides (hero + match row). Cả TeamMatchItem,
// TeamRecentMatch (team-matches-panel) và MatchDetail (trang chi tiết) đều thoả.
// requests: mảng request ACCEPTED (lấy requesterTeam.name làm đối thủ ghép).
type SideResolvable = {
  matchType: MatchListItem["matchType"];
  requests: { requesterTeam: { name: string } | null }[];
  opponentName: string | null;
  sideAName: string | null;
  sideBName: string | null;
};

// Resolve tên 2 bên của 1 trận cho hiển thị đối đầu (hero + match row).
// - INTERNAL: home = sideAName, away = sideBName (2 bên nội bộ, không phải đội thật).
// - FIND_OPPONENT (team-tạo): home = teamName, away = opponentName.
// - kèo public ghép: away = requests[0].requesterTeam.name (fallback "Đội khách").
// isHomeTeam: true nếu home là đội thật (highlight brand + tính W/D/L).
export function resolveSides(
  match: SideResolvable,
  teamName: string,
): { home: string; away: string; isHomeTeam: boolean } {
  if (match.matchType === "INTERNAL") {
    return {
      home: match.sideAName ?? "Bên A",
      away: match.sideBName ?? "Bên B",
      isHomeTeam: false,
    };
  }
  const opponent =
    match.requests[0]?.requesterTeam?.name ??
    match.opponentName ??
    "Đội khách";
  return { home: teamName, away: opponent, isHomeTeam: true };
}

// Re-export label dùng chung (tránh原名 trùng).
export { matchTypeLabels };


export type MatchCardProps = { match: MatchListItem };

// Màu badge theo loại kèo (token DESIGN.md, override variant mặc định của Badge).
export const matchTypeBadge: Record<string, string> = {
  FIND_OPPONENT: "bg-type-opponent-soft text-type-opponent",
  NEED_PLAYERS: "bg-type-players-soft text-type-players",
  FIELD_AVAILABLE: "bg-type-field-soft text-type-field",
  LOOKING_FOR_TEAM: "bg-type-team-soft text-type-team",
  // Trận nội bộ: tông brand-soft (không lên /matches nhưng vẫn cần badge nếu render).
  INTERNAL: "bg-brand-soft text-brand",
};

// Trạng thái "live-ish" (đã ghép/chốt) → chip lime nổi bật (DESIGN.md "Spotlight surface").
// Lưu ý: listMatches hiện chỉ trả về OPEN, nhánh này hoạt động khi card tái dùng ở view khác.
export function isLiveStatus(status: MatchListItem["status"]): boolean {
  return status === "MATCHED" || status === "CONFIRMED";
}

// Icon MapPin inline (thay emoji 📍 cứng), cùng tông solid với mockup football-design.html.
export function MapPinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// Ghép label nhiều trình độ thành 1 chuỗi: "Khá · Mạnh".
export function joinSkillTiers(tiers: MatchListItem["skillTiers"]): string {
  return tiers.map((t) => skillTierLabels[t]).join(" · ");
}

// Chip giờ đá: live → chip lime (cặp AA); thường → text ink bold.
export function LiveTimeChip({
  isLive,
  playTimes,
}: {
  isLive: boolean;
  playTimes: MatchListItem["playTimes"];
}) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime px-2 py-0.5 text-xs font-bold text-accent-lime-ink">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime-ink" />
        {formatPlayTimes(playTimes)}
      </span>
    );
  }
  return (
    <span className="text-base font-bold text-ink">
      {formatPlayTimes(playTimes)}
    </span>
  );
}

// Hàng badge: loại sân + trình độ (gộp) + trạng thái sân (hasField proxy qua fieldId).
export function SkillFieldBadges({ match }: MatchCardProps) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <Badge variant="secondary">{fieldTypeLabels[match.fieldType]}</Badge>
      <Badge variant="secondary">{joinSkillTiers(match.skillTiers)}</Badge>
      {match.fieldId ? (
        <Badge className="bg-type-field-soft text-type-field">Đã có sân</Badge>
      ) : (
        <Badge variant="secondary">Chưa có sân</Badge>
      )}
    </div>
  );
}

// Dòng sân (label + sân cụ thể nếu có).
export function AreaLine({ match }: MatchCardProps) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <MapPinIcon className="shrink-0 text-brand" />
      <span>
        {areaLabels[match.area ?? ""] ?? match.field?.name ?? "Chưa có sân"}
        {match.field?.name ? (
          <span className="text-ink-subtle"> · {match.field.name}</span>
        ) : null}
      </span>
    </p>
  );
}

// Footer: người tạo + link "Xem chi tiết".
export function CardFooter({ match }: MatchCardProps) {
  return (
    <div className="flex items-center justify-between border-t border-line pt-2">
      <p className="text-xs text-muted-foreground">
        {match.team?.name ?? match.creator.name ?? "Người dùng ẩn danh"}
      </p>
      {/* TODO: link tới /matches/[id] khi build route chi tiết. */}
      <a
        href="#"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-hover hover:underline"
      >
        Xem chi tiết
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>
    </div>
  );
}

