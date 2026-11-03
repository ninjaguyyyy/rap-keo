// Layout broadcast (spotlight header + hex pattern) — dùng cho các loại kèo còn lại.
// Lấy cảm hứng từ docs/football-design.html.
import { Card } from "@/components/ui/card";
import type { MatchListItem } from "../queries";
import { areaLabels, formatPlayTimes } from "../labels";
import {
  AreaLine,
  CardFooter,
  SkillFieldBadges,
  isLiveStatus,
} from "./card-shared";

// Icon sân (stadium) cho header spotlight.
function StadiumIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7c3-1 6-1 9-1s6 0 9 1" />
      <path d="M3 7v10c3 1 6 1 9 1s6 0 9-1V7" />
      <path d="M12 2v3" />
      <path d="M3 12c3 1 6 1 9 1s6 0 9-1" />
    </svg>
  );
}

// Icon người (users) cho header spotlight khi kèo thiếu người / nội bộ.
function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Nhãn tag giữa body theo loại kèo.
function bodyTag(matchType: MatchListItem["matchType"]): string {
  switch (matchType) {
    case "NEED_PLAYERS":
      return "Thiếu người";
    case "INTERNAL":
      return "Nội bộ";
    default:
      return "Tìm đối";
  }
}

// Icon giữa body theo loại kèo.
function bodyIcon(matchType: MatchListItem["matchType"]): string {
  if (matchType === "NEED_PLAYERS") return "🧑‍🤝‍🧑"; // thiếu người — tìm thêm người
  if (matchType === "INTERNAL") return "🧑‍🤝‍🧑";
  return "⚽"; // tìm đối
}

export function BroadcastCard({ match }: { match: MatchListItem }) {
  const isLive = isLiveStatus(match.status);
  const isNeedPlayers = match.matchType === "NEED_PLAYERS";
  const isInternal = match.matchType === "INTERNAL";
  const headerLabel = areaLabels[match.area ?? ""] ?? match.field?.name ?? "Chưa có sân";

  // Icon header theo loại kèo.
  const HeaderIcon = isInternal || isNeedPlayers
    ? UsersIcon
    : StadiumIcon;

  // Tone spotlight header theo loại kèo.
  const spotlightTone = isNeedPlayers
      ? "spotlight-players"
      : isInternal
        ? "spotlight-team"
        : "spotlight-opponent";

  return (
    <Card className="gap-0 overflow-hidden border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-0">
      {/* Header spotlight tone (màu theo loại kèo) + họa tiết hex.
          Trái: icon + label (venue hoặc tên user). Phải: chip giờ. */}
      <div className={`${spotlightTone} hex-bg flex items-center justify-between gap-2 px-4 py-3`}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <HeaderIcon className="shrink-0" />
          <span className="truncate">{headerLabel}</span>
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime px-2 py-0.5 text-xs font-bold text-accent-lime-ink">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime-ink" />
            {formatPlayTimes(match.playTimes)}
          </span>
        ) : (
          <span className="text-sm font-bold text-white">
            {formatPlayTimes(match.playTimes)}
          </span>
        )}
      </div>

      {/* Body trắng: khu giữa hiển thị tag loại kèo nổi bật + icon. */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="text-3xl" aria-hidden="true">
            {bodyIcon(match.matchType)}
          </span>
          <span className="text-lg font-extrabold uppercase tracking-wide text-brand">
            {bodyTag(match.matchType)}
          </span>
        </div>

        <SkillFieldBadges match={match} />

        <AreaLine match={match} />

        {match.note ? (
          <p className="line-clamp-2 text-sm text-foreground">{match.note}</p>
        ) : null}

        <CardFooter match={match} />
      </div>
    </Card>
  );
}
