// Layout broadcast (spotlight header + hex pattern) — dùng cho mọi loại kèo
// (FIND_OPPONENT, NEED_PLAYERS, LOOKING_FOR_TEAM, FIELD_AVAILABLE).
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

// Icon người (users) cho header spotlight khi kèo thiếu người / tìm đội.
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

// Icon cờ (field/flag) cho header spotlight khi kèo có sân trống.
function FlagIcon({ className = "" }: { className?: string }) {
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

// Trích "N cầu rảnh" từ note (form ghi dạng "[N cầu rảnh] ..."). Fallback 1.
function parsePlayersCount(note: string | null): number {
  if (!note) return 1;
  const m = note.match(/\[(\d+)\s*cầu rảnh\]/i);
  return m ? Number(m[1]) : 1;
}

// Nhãn tag giữa body theo loại kèo.
function bodyTag(matchType: MatchListItem["matchType"]): string {
  switch (matchType) {
    case "NEED_PLAYERS":
      return "Thiếu người";
    case "LOOKING_FOR_TEAM":
      return "Tìm đội";
    case "FIELD_AVAILABLE":
      return "Có sân trống";
    default:
      return "Đang tìm đối";
  }
}

// Icon giữa body theo loại kèo.
function bodyIcon(matchType: MatchListItem["matchType"], playersCount: number): string {
  if (matchType === "LOOKING_FOR_TEAM") return "👤".repeat(playersCount);
  if (matchType === "FIELD_AVAILABLE") return "🏟️";
  return "⚽";
}

export function BroadcastCard({ match }: { match: MatchListItem }) {
  const isLive = isLiveStatus(match.status);
  const isLookingForTeam = match.matchType === "LOOKING_FOR_TEAM";
  const isNeedPlayers = match.matchType === "NEED_PLAYERS";
  const isFieldAvailable = match.matchType === "FIELD_AVAILABLE";
  // Header trái: LOOKING_FOR_TEAM -> tên user tạo (cá nhân); khác -> venue (khu vực/sân).
  const headerLabel = isLookingForTeam
    ? (match.creator.name ?? "Người dùng ẩn danh")
    : (areaLabels[match.area ?? ""] ?? match.field?.name ?? "Chưa có khu vực");
  const playersCount = parsePlayersCount(match.note);

  // Icon header theo loại kèo.
  const HeaderIcon = isLookingForTeam || isNeedPlayers
    ? UsersIcon
    : isFieldAvailable
      ? FlagIcon
      : StadiumIcon;

  // Tone spotlight header theo loại kèo — phân biệt 4 màu (xem globals.css).
  const spotlightTone = isFieldAvailable
    ? "spotlight-field"
    : isNeedPlayers
      ? "spotlight-players"
      : isLookingForTeam
        ? "spotlight-team"
        : "spotlight-opponent";

  return (
    <Card className="overflow-hidden gap-0 p-0">
      {/* Header spotlight tone (màu theo loại kèo) + họa tiết hex.
          Trái: icon + label (venue hoặc tên user). Phải: chip giờ. */}
      <div className={`${spotlightTone} hex-bg flex items-center justify-between gap-2 px-4 py-2.5`}>
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

      {/* Body trắng: khu giữa hiển thị tag loại kèo nổi bật + icon.
          LOOKING_FOR_TEAM: "N cầu rảnh" + icon người (1-2 cái).
          Khác: icon (⚽/🏟️) + tag (TÌM ĐỐI/THIẾU NGƯỜI/CÓ SÂN TRỐNG). */}
      <div className="flex flex-col gap-2 p-4">
        {isLookingForTeam ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="text-3xl" aria-hidden="true">
              {bodyIcon(match.matchType, playersCount)}
            </span>
            <span className="text-lg font-extrabold uppercase tracking-wide text-brand-spotlight">
              {playersCount} cầu rảnh
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="text-3xl" aria-hidden="true">
              {bodyIcon(match.matchType, playersCount)}
            </span>
            <span className="text-lg font-extrabold uppercase tracking-wide text-brand-spotlight">
              {bodyTag(match.matchType)}
            </span>
          </div>
        )}

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

