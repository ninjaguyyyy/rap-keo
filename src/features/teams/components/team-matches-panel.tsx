// Tab "Trận đấu" trên trang chi tiết đội. 2 section:
// - "Sắp tới": list trận sắp tới (status OPEN/MATCHED/CONFIRMED) + nút "Tạo trận"
//   (chỉ owner). Mỗi item = match row giống mock (2 đội + "VS", chưa tỷ số).
// - "Đã đá": list tất cả trận COMPLETED (có tỷ số, badge W/D/L).
// Mỗi match row: 2 đội đối đầu giữa (avatar + tên) + tỷ số/VS ở giữa, metadata
// (sân, ngày, loại sân). Opponent/side names resolve ưu tiên: requests ACCEPTED >
// opponentName/sideA/sideB (trận team tự tạo) > "Đội khách".
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fieldTypeLabels, formatPlayTimes } from "@/features/matches/labels";
import {
  MapPinIcon,
  resolveSides,
} from "@/features/matches/components/card-shared";
import type { TeamMatchItem, TeamRecentMatch } from "../queries";
import { TeamAvatar } from "./team-avatar";
import { CreateTeamMatchDialog } from "./create-team-match-dialog";

export function TeamMatchesPanel({
  teamId,
  teamName,
  upcoming,
  past,
  canManage,
}: {
  teamId: string;
  teamName: string;
  upcoming: TeamMatchItem[];
  past: TeamRecentMatch[];
  canManage: boolean;
}) {
  const hasAny = upcoming.length > 0 || past.length > 0;

  if (!hasAny && !canManage) {
    return <EmptyState text="Chưa có trận nào" subtext="Các trận sẽ hiện ở đây khi đội tham gia kèo." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Section Sắp tới. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
            Sắp tới
          </h2>
          {canManage ? <CreateTeamMatchDialog teamId={teamId} /> : null}
        </div>
        {upcoming.length === 0 ? (
          <EmptyState text="Chưa có trận sắp tới" subtext={canManage ? "Bấm “Tạo trận” để lên lịch." : undefined} compact />
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} teamName={teamName} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section Đã đá. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          Đã đá
        </h2>
        {past.length === 0 ? (
          <EmptyState text="Chưa có trận nào đã đá" compact />
        ) : (
          <ul className="flex flex-col gap-3">
            {past.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} teamName={teamName} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Resolve tên 2 bên của 1 trận (cả upcoming + past dùng chung MatchRow).
// Logic factored ra card-shared.resolveSides (dùng chung với hero match detail).
// Trả về: home/away + isHomeTeam (true nếu home là đội thật — highlight + W/D/L).
function getSides(match: TeamMatchItem | TeamRecentMatch, teamName: string) {
  return resolveSides(match, teamName);
}

// Một trận: layout giống mock — 2 đội 2 bên, tỷ số ở giữa (nếu chưa đá: "VS").
function MatchRow({
  match,
  teamName,
}: {
  match: TeamMatchItem | TeamRecentMatch;
  teamName: string;
}) {
  const { home, away, isHomeTeam } = getSides(match, teamName);
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const hasScore = homeScore != null && awayScore != null;

  // Kết quả đội nhà (chỉ khi home là đội thật, không phải internal 2 bên).
  const result =
    hasScore && isHomeTeam
      ? homeScore! > awayScore!
        ? { label: "Thắng", className: "bg-brand text-white" }
        : homeScore! < awayScore!
          ? { label: "Thua", className: "bg-ink-muted text-white" }
          : { label: "Hòa", className: "bg-accent-yellow text-ink" }
      : null;

  const venue = match.field?.name ?? match.area ?? "Chưa có sân";

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <Card className="gap-0 p-0 transition-shadow hover:ring-1 hover:ring-brand/30">
        {/* Hàng đội + tỷ số. */}
        <div className="flex items-center gap-2 px-4 pt-3">
          <TeamSide name={home} align="start" highlight={isHomeTeam} />
          <ScoreOrVs home={homeScore} away={awayScore} hasScore={hasScore} />
          <TeamSide name={away} align="end" />
        </div>

      {/* Metadata: sân + ngày + loại sân. */}
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-ink-subtle">
          <MapPinIcon />
          <span className="truncate">{venue}</span>
          <span aria-hidden="true" className="text-ink-subtle/60">·</span>
          <span className="shrink-0">{fieldTypeLabels[match.fieldType]}</span>
        </div>
        <span className="shrink-0 text-xs text-ink-subtle">
          {formatPlayTimes(match.playTimes)}
        </span>
      </div>

      {result ? (
        <div className="flex justify-end px-4 pb-3 -mt-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              result.className,
            )}
          >
            {result.label}
          </span>
        </div>
      ) : null}
      </Card>
    </Link>
  );
}

// Một bên trong hàng đối đầu: avatar chữ cái đầu + tên.
function TeamSide({
  name,
  align,
  highlight = false,
}: {
  name: string;
  align: "start" | "end";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "end" ? "flex-row-reverse text-right" : "",
      )}
    >
      <TeamAvatar name={name} size="sm" />
      <span
        className={cn(
          "truncate text-sm font-bold text-ink",
          highlight && "text-brand",
        )}
      >
        {name}
      </span>
    </div>
  );
}

// Tỷ số giữa 2 đội: lớn + đậm; chưa đá -> "VS" mờ.
function ScoreOrVs({
  home,
  away,
  hasScore,
}: {
  home: number | null;
  away: number | null;
  hasScore: boolean;
}) {
  if (!hasScore) {
    return (
      <span className="shrink-0 px-2 text-xs font-bold uppercase tracking-wide text-ink-subtle">
        VS
      </span>
    );
  }
  return (
    <span className="shrink-0 px-2 font-mono text-2xl font-extrabold tabular-nums text-ink">
      {home}
      <span className="mx-1 text-ink-subtle">-</span>
      {away}
    </span>
  );
}

function EmptyState({
  text,
  subtext,
  compact = false,
}: {
  text: string;
  subtext?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface text-center",
        compact ? "px-4 py-6" : "px-4 py-10",
      )}
    >
      <svg
        width={compact ? 28 : 40}
        height={compact ? 28 : 40}
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
      <p className="text-sm text-ink-muted">{text}</p>
      {subtext ? <p className="text-xs text-ink-subtle">{subtext}</p> : null}
    </div>
  );
}
