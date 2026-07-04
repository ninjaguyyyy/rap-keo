import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MatchListItem } from "../queries";
import {
  fieldTypeLabels,
  formatCost,
  formatPlayTime,
  matchTypeLabels,
  skillTierLabels,
} from "../labels";

// Màu badge theo loại kèo (token DESIGN.md, override variant mặc định của Badge).
const matchTypeBadge: Record<string, string> = {
  FIND_OPPONENT: "bg-type-opponent-soft text-type-opponent",
  NEED_PLAYERS: "bg-type-players-soft text-type-players",
  FIELD_AVAILABLE: "bg-type-field-soft text-type-field",
};

// Trạng thái "live-ish" (đã ghép/chốt) → chip lime nổi bật (xem DESIGN.md "Spotlight surface").
// Lưu ý: listMatches hiện chỉ trả về OPEN, nhánh này hoạt động khi card tái dùng ở view khác.
const LIVE_STATUSES = new Set(["MATCHED", "CONFIRMED"]);

// Icon MapPin inline (thay emoji 📍 cứng), cùng tông solid với mockup football-design.html.
function MapPinIcon({ className = "" }: { className?: string }) {
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

export function MatchCard({ match }: { match: MatchListItem }) {
  const isLive = LIVE_STATUSES.has(match.status);

  return (
    <Card className="gap-2">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge className={matchTypeBadge[match.matchType] ?? ""}>
            {matchTypeLabels[match.matchType]}
          </Badge>
          {isLive ? (
            // Chip lime — cặp nền lime + chữ ink tối để đạt AA (DESIGN.md).
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime px-2 py-0.5 text-xs font-bold text-accent-lime-ink">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime-ink" />
              {formatPlayTime(match.playTime)}
            </span>
          ) : (
            <span className="text-lg font-bold text-ink">
              {formatPlayTime(match.playTime)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary">{fieldTypeLabels[match.fieldType]}</Badge>
          <Badge variant="secondary">{skillTierLabels[match.skillTier]}</Badge>
          {match.costPerSide != null ? (
            <Badge variant="secondary">
              {formatCost(match.costPerSide)}/đội
            </Badge>
          ) : null}
        </div>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="shrink-0 text-brand" />
          <span>
            {match.field?.name ?? match.area ?? "Chưa có sân"}
            {match.field?.address ? (
              <span className="text-ink-subtle"> · {match.field.address}</span>
            ) : null}
          </span>
        </p>

        {match.note ? (
          <p className="line-clamp-2 text-sm text-foreground">{match.note}</p>
        ) : null}

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
      </CardContent>
    </Card>
  );
}
