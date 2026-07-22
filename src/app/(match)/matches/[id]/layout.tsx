import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMatchById } from "@/features/matches/queries";
import { resolveSides } from "@/features/matches/components/card-shared";
import { TeamAvatar } from "@/features/teams/components/team-avatar";

// Layout riêng cho trang chi tiết trận /matches/[id] (route group (match), không
// ảnh hưởng URL). Bỏ hero banner của (main), tự render header = 2 đội đối đầu +
// tỷ số lớn ở giữa (theo mock). Nội dung page (tabs) render dưới header.
//
// getMatchById: public match xem được cả khi chưa login; private (team tự tạo)
// chỉ owner/thành viên — ngoài ra notFound(). Lấy viewer userId (nếu có) để check.
export default async function MatchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const match = await getMatchById(id, viewer?.id);
  if (!match) {
    notFound();
  }

  // Tên đội nhà: team.name nếu có, fallback "Đội nhà". INTERNAL không có team thật.
  const teamName = match.team?.name ?? "Đội nhà";
  const { home, away, isHomeTeam } = resolveSides(match, teamName);
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const hasScore = homeScore != null && awayScore != null;

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Header = hero 2 đội + tỷ số, full-bleed + scrim + hex. */}
      <header className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-brand-spotlight" />
        <div className="hex-bg absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-md">
          {/* Nút back góc trên-trái. Public match về /matches; private về team. */}
          <div className="px-4 pt-4">
            <Link
              href={match.isPrivate && match.teamId ? `/teams/${match.teamId}` : "/matches"}
              aria-label="Quay lại"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
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
          </div>

          {/* 2 đội đối đầu + tỷ số ở giữa, canh giữa. */}
          <div className="flex flex-col items-center gap-4 px-4 pb-10 pt-3 text-center">
            <div className="flex w-full items-center justify-center gap-2">
              <TeamSide name={home} align="start" highlight={isHomeTeam} />
              <ScoreOrVs home={homeScore} away={awayScore} hasScore={hasScore} />
              <TeamSide name={away} align="end" />
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung page: card nhô lên đè header (-mt-3 rounded-t-2xl). */}
      <main className="relative z-10 bg-surface-muted -mt-3 rounded-t-2xl px-4 py-4">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
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
      className={
        "flex min-w-0 flex-1 items-center gap-2" +
        (align === "end" ? " flex-row-reverse text-right" : "")
      }
    >
      <TeamAvatar
        name={name}
        size="lg"
        className="h-16 w-16 text-2xl shadow-xl ring-4 ring-white/80"
      />
      <span
        className={
          "truncate text-base font-extrabold text-white drop-shadow" +
          (highlight ? "" : "")
        }
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
      <span className="shrink-0 px-1 text-sm font-bold uppercase tracking-wide text-white/70">
        VS
      </span>
    );
  }
  return (
    <span className="shrink-0 px-1 font-mono text-4xl font-extrabold tabular-nums text-white drop-shadow">
      {home}
      <span className="mx-0.5 text-white/60">-</span>
      {away}
    </span>
  );
}
