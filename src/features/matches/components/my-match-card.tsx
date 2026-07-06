"use client";

// MyMatchCard — card kèo trong trang "Kèo của tôi".
// Header spotlight + body info ở đây; phần status + action delegated sang
// MatchStatusPanel (dùng chung với MyMatchFab popover).
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MyMatchItem } from "../queries";
import type { MatchType } from "@/generated/prisma/enums";
import { areaLabels, matchTypeLabels } from "../labels";
import {
  AreaLine,
  SkillFieldBadges,
  LiveTimeChip,
} from "./card-shared";
import { MatchStatusPanel } from "./match-status-panel";

// === Header spotlight tone + icon (đồng bộ broadcast-card.tsx) ===
function StadiumIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7c3-1 6-1 9-1s6 0 9 1" />
      <path d="M3 7v10c3 1 6 1 9 1s6 0 9-1V7" />
      <path d="M12 2v3" />
      <path d="M3 12c3 1 6 1 9 1s6 0 9-1" />
    </svg>
  );
}
function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function FlagIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function spotlightToneFor(type: MatchType): string {
  switch (type) {
    case "FIELD_AVAILABLE":
      return "spotlight-field";
    case "NEED_PLAYERS":
      return "spotlight-players";
    case "LOOKING_FOR_TEAM":
      return "spotlight-team";
    default:
      return "spotlight-opponent";
  }
}

function headerLabel(match: MyMatchItem): string {
  if (match.matchType === "LOOKING_FOR_TEAM") {
    return match.creator.name ?? "Người dùng ẩn danh";
  }
  return areaLabels[match.area ?? ""] ?? match.field?.name ?? "Chưa có sân";
}

export function MyMatchCard({ match }: { match: MyMatchItem }) {
  const isLive = match.status === "MATCHED" || match.status === "CONFIRMED";
  const pendingRequests = match.requests.filter((r) => r.status === "PENDING");
  const hasRequests = pendingRequests.length > 0;

  const HeaderIcon =
    match.matchType === "LOOKING_FOR_TEAM" || match.matchType === "NEED_PLAYERS"
      ? UsersIcon
      : match.matchType === "FIELD_AVAILABLE"
        ? FlagIcon
        : StadiumIcon;

  return (
    <Card className={cn("gap-0 overflow-hidden p-0", hasRequests && "ring-1 ring-type-field/30")}>
      {/* Header spotlight + chip giờ / badge số đội hỏi. */}
      <div
        className={cn(
          spotlightToneFor(match.matchType),
          "hex-bg flex items-center justify-between gap-2 px-4 py-2.5",
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white">
          <HeaderIcon className="shrink-0" />
          <span className="truncate">{headerLabel(match)}</span>
        </span>
        {hasRequests ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-lime px-2.5 py-1 text-xs font-bold text-accent-lime-ink">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-lime-ink opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-lime-ink" />
            </span>
            {pendingRequests.length} ĐỘI ĐANG HỎI
          </span>
        ) : (
          <LiveTimeChip isLive={isLive} playTimes={match.playTimes} />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        {/* Tag loại kèo nổi giữa (giống broadcast-card). */}
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="text-3xl" aria-hidden="true">
            {match.matchType === "FIELD_AVAILABLE"
              ? "🏟️"
              : match.matchType === "NEED_PLAYERS"
                ? "🧑‍🤝‍🧑"
                : "⚽"}
          </span>
          <span className="text-lg font-extrabold uppercase tracking-wide text-brand-spotlight">
            {matchTypeLabels[match.matchType]}
          </span>
        </div>

        <SkillFieldBadges match={match} />
        <AreaLine match={match} />

        {match.note ? (
          <p className="line-clamp-2 text-sm text-foreground">{match.note}</p>
        ) : null}

        <MatchStatusPanel match={match} />
      </div>
    </Card>
  );
}
