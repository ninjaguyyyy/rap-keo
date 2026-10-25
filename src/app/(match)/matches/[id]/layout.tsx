import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMatchById, getMatchByIdForVoteLink } from "@/features/matches/queries";
import { resolveSides } from "@/features/matches/components/card-shared";
import { formatPlayTime, matchStatusLabels } from "@/features/matches/labels";
import { TeamAvatar } from "@/features/teams/components/team-avatar";

// Layout riêng cho trang chi tiết trận /matches/[id] (route group (match), không
// ảnh hưởng URL). Bỏ hero banner của (main), tự render header = 2 đội đối đầu +
// tỷ số lớn ở giữa (theo mock). Nội dung page (tabs) render dưới header.
//
// getMatchById: public match xem được cả khi chưa login; private (team tự tạo)
// chỉ owner/thành viên. Tuy nhiên link chi tiết trận được phép xem public nên
// fallback sang getMatchByIdForVoteLink để guest vẫn thấy đầy đủ layout/header.
export default async function MatchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const memberAccessibleMatch = await getMatchById(id, viewer?.id);
  const match = memberAccessibleMatch ?? (await getMatchByIdForVoteLink(id));
  if (!match) notFound();
  const canOpenTeamPage = Boolean(memberAccessibleMatch && match.isPrivate && match.teamId);
  const backHref = canOpenTeamPage ? `/teams/${match.teamId}` : "/matches";

  // Tên đội nhà: team.name nếu có, fallback "Đội nhà". INTERNAL không có team thật.
  const teamName = match.team?.name ?? "Đội nhà";
  const { home, away } = resolveSides(match, teamName);
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const hasScore = homeScore != null && awayScore != null;
  const firstPlayTime =
    match.playTimes.length > 0
      ? [...match.playTimes].sort((a, b) => a.getTime() - b.getTime())[0]
      : null;
  const scoreMetaLabel = hasScore
    ? matchStatusLabels[match.status]
    : firstPlayTime
      ? formatPlayTime(firstPlayTime)
      : "Chưa lên lịch";

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Header scoreboard: 2 nửa home/away + score badge nổi giữa (match detail mẫu). */}
      <header className="px-2 pt-4">
        <div className="mx-auto w-full max-w-md">
          <div className="relative">
            <Link
              href={backHref}
              aria-label="Quay lại"
              className="absolute -top-5 left-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-line transition-colors hover:bg-surface-muted"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>

            <div className="overflow-hidden rounded-[2rem] shadow-[0_10px_34px_rgba(36,0,40,0.16)]">
              <div className="grid grid-cols-2">
                <div className="bg-match-home px-4 pb-8 pt-5">
                  <TeamSide name={home} align="start" />
                </div>
                <div className="bg-match-away px-4 pb-8 pt-5">
                  <TeamSide name={away} align="end" />
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_14%,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_84%_86%,rgba(255,255,255,0.12),transparent_36%)]"
              />

              <div className="absolute left-1/2 top-1/2 flex min-w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[1.75rem] bg-white px-5 py-3 shadow-[0_8px_24px_rgba(36,0,40,0.24)] ring-1 ring-line/40">
                <ScoreOrVs home={homeScore} away={awayScore} hasScore={hasScore} />
                <p className="mt-1 text-xs font-semibold tracking-wide text-ink-muted">
                  {scoreMetaLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung page: panel sáng kéo chồng nhẹ lên scoreboard. */}
      <main className="relative z-10 mx-auto -mt-4 w-full max-w-md rounded-t-[2rem] bg-surface px-4 py-4 shadow-[0_-2px_20px_rgba(36,0,40,0.08)]">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

// Một bên trong hàng đối đầu: avatar chữ cái đầu + tên.
function TeamSide({
  name,
  align,
}: {
  name: string;
  align: "start" | "end";
}) {
  return (
    <div
      className={
        "flex min-w-0 flex-col items-center gap-2 text-white" +
        (align === "end" ? " text-right" : " text-left")
      }
    >
      <TeamAvatar
        name={name}
        size="lg"
        className="h-16 w-16 text-2xl shadow-lg ring-3 ring-white/85"
      />
      <span
        className="w-full truncate text-center text-2xl leading-tight font-black tracking-[-0.02em] text-white drop-shadow-sm"
      >
        {name}
      </span>
    </div>
  );
}

// Tỷ số giữa 2 đội: lớn + đậm; chưa đá -> "VS".
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
      <span className="shrink-0 px-1 font-heading text-3xl font-black tracking-[0.05em] text-ink">
        VS
      </span>
    );
  }
  return (
    <span className="shrink-0 px-1 font-mono text-[2.8rem] leading-none font-black tabular-nums text-ink">
      {home}
      <span className="mx-1 text-ink-subtle">-</span>
      {away}
    </span>
  );
}
