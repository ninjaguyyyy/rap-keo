import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { TournamentStatus } from "@/generated/prisma/enums";

// List giải public (status APPROVED/COMPLETED) cho trang /tournaments.
// Sort mới nhất trước. CANCELLED cũng hiện (hiển thị "Đã hủy") — tách sau nếu cần.
export async function listApprovedTournaments() {
  return db.tournament.findMany({
    where: {
      status: { in: ["APPROVED", "COMPLETED", "CANCELLED"] as TournamentStatus[] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type TournamentListItem = Awaited<
  ReturnType<typeof listApprovedTournaments>
>[number];

// List giải chờ ADMIN duyệt (PENDING). Cho section "Chờ duyệt" trên /tournaments
// (chỉ render khi user là ADMIN).
export async function listPendingTournaments() {
  return db.tournament.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

// List giải user là organizer (mọi status) — trang /my-tournaments.
export async function listMyTournaments(userId: string) {
  return db.tournament.findMany({
    where: { organizerId: userId },
    orderBy: { createdAt: "desc" },
  });
}

// Lấy 1 giải cho trang chi tiết /tournaments/[slug]. Bọc cache() để layout + page
// gọi chung 1 query DB (mirror getTeamById ở src/features/teams/queries.ts:22-30).
// Viewer check:
// - APPROVED/COMPLETED/CANCELLED: public xem được.
// - DRAFT/PENDING/REJECTED: chỉ organizer + ADMIN. Ngoài ra trả null -> notFound().
export const getTournamentBySlug = cache(
  async (slug: string, viewerUserId?: string) => {
    const tournament = await db.tournament.findUnique({
      where: { slug },
      include: {
        organizer: { select: { id: true, name: true } },
      },
    });
    if (!tournament) return null;

    const isPublicViewable =
      tournament.status === "APPROVED" ||
      tournament.status === "COMPLETED" ||
      tournament.status === "CANCELLED";
    if (isPublicViewable) return tournament;

    // DRAFT/PENDING/REJECTED: chỉ organizer xem. ADMIN cũng xem được (duyệt/sửa).
    if (!viewerUserId) return null;
    if (tournament.organizerId === viewerUserId) return tournament;
    // Viewer không phải organizer -> check role ADMIN qua DB (session chỉ có role
    // string, không trust hoàn toàn — query DB cho chặt).
    const viewer = await db.user.findUnique({
      where: { id: viewerUserId },
      select: { role: true },
    });
    if (viewer?.role === "ADMIN") return tournament;
    return null;
  },
);

export type TournamentDetail = NonNullable<
  Awaited<ReturnType<typeof getTournamentBySlug>>
>;

// List participant của giải: include team (id/name/skillTier) + players (id/
// displayName/jerseyNumber/userId) nếu có. Sort theo joinedAt asc.
export async function listTournamentParticipants(tournamentId: string) {
  return db.tournamentParticipant.findMany({
    where: { tournamentId },
    include: {
      team: { select: { id: true, name: true, skillTier: true } },
      players: {
        select: {
          id: true,
          displayName: true,
          jerseyNumber: true,
          userId: true,
        },
        orderBy: [{ jerseyNumber: "asc" }, { displayName: "asc" }],
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export type TournamentParticipantItem = Awaited<
  ReturnType<typeof listTournamentParticipants>
>[number];

// Dòng cầu thủ trong participant (subset của TournamentParticipantItem.players).
export type TournamentPlayerItem = TournamentParticipantItem["players"][number];

// List trận của giải. Include field + playerStats (cho hiển thị tỷ số + scorers).
// Sort: round asc (vòng 1, 2, ... N-1) -> createdAt asc. Match có round null
// (legacy / trận thường) xuống cuối. UI group theo round.
export async function listTournamentMatches(tournamentId: string) {
  const matches = await db.match.findMany({
    where: { tournamentId },
    include: {
      field: { select: { id: true, name: true, address: true } },
      playerStats: { select: { userId: true, goals: true, assists: true } },
    },
  });
  // Sort: round asc (null sau cùng), rồi createdAt asc.
  const sorted = [...matches].sort((a, b) => {
    const ra = a.round ?? Number.POSITIVE_INFINITY;
    const rb = b.round ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted;
}

export type TournamentMatchItem = Awaited<
  ReturnType<typeof listTournamentMatches>
>[number];

// Dòng bảng xếp hạng (League): aggregate từ Match COMPLETED.
export type StandingRow = {
  participantId: string;
  displayName: string;
  teamId: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

// Tính league table từ Match COMPLETED + participant list.
// Mỗi Match INTERNAL có sideAName (home) + sideBName (away) = displayName của 2
// participant. Map tên -> participant để aggregate.
// Pure TS, không raw SQL — dữ liệu nhỏ (N*(N-1)/2 trận).
export async function getTournamentStandings(
  tournamentId: string,
): Promise<StandingRow[]> {
  const [participants, matches] = await Promise.all([
    listTournamentParticipants(tournamentId),
    listTournamentMatches(tournamentId),
  ]);

  // Map displayName -> participant (displayName unique trong 1 giải).
  const byName = new Map(
    participants.map((p) => [p.displayName, p]),
  );

  // Init row cho mỗi participant (cho hiện đội chưa đá trận nào).
  const rows = new Map<string, StandingRow>();
  for (const p of participants) {
    rows.set(p.id, {
      participantId: p.id,
      displayName: p.displayName,
      teamId: p.teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  // Aggregate mỗi Match COMPLETED có tỷ số.
  for (const m of matches) {
    if (m.status !== "COMPLETED") continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    const homeP = byName.get(m.sideAName ?? "");
    const awayP = byName.get(m.sideBName ?? "");
    if (!homeP || !awayP) continue;

    const homeRow = rows.get(homeP.id)!;
    const awayRow = rows.get(awayP.id)!;
    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += m.homeScore;
    homeRow.goalsAgainst += m.awayScore;
    awayRow.goalsFor += m.awayScore;
    awayRow.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      homeRow.won += 1;
      homeRow.points += 3;
      awayRow.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      awayRow.won += 1;
      awayRow.points += 3;
      homeRow.lost += 1;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  const list = [...rows.values()];
  for (const r of list) r.goalDiff = r.goalsFor - r.goalsAgainst;
  // Sort: points desc -> goalDiff desc -> goalsFor desc -> displayName asc.
  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.displayName.localeCompare(b.displayName),
  );
  return list;
}

// Organizer check (dùng cho UI gate + action guard).
export function canManageTournament(
  tournament: { organizerId: string },
  userId?: string,
): boolean {
  return !!userId && tournament.organizerId === userId;
}

// Dòng leaderboard cầu thủ trong giải (Vua phá lưới / Vua kiến tạo / MVP).
// key = "u:<userId>" hoặc "p:<participantPlayerId>" — unique cho React + query.
// displayName: snapshot từ PlayerStat.displayName (lúc ghi bàn). participantDisplayName:
// tên đội trong giải (hydrate từ participantId qua participant list).
export type PlayerLeaderboardRow = {
  key: string;
  displayName: string;
  participantDisplayName: string;
  goals: number;
  assists: number;
  points: number; // goals + assists
};

// Top scorers / assists / MVP của giải — aggregate PlayerStat theo player (qua
// relation match.tournamentId). Trả 3 mảng sort + limit 10. Pure TS aggregate
// (dữ liệu nhỏ: N*(N-1)/2 trận × few scorers).
export async function getTournamentPlayerLeaderboards(
  tournamentId: string,
): Promise<{
  topScorers: PlayerLeaderboardRow[];
  topAssists: PlayerLeaderboardRow[];
  topMvp: PlayerLeaderboardRow[];
}> {
  const [participants, stats] = await Promise.all([
    listTournamentParticipants(tournamentId),
    db.playerStat.findMany({
      where: { match: { tournamentId } },
      select: {
        userId: true,
        participantPlayerId: true,
        participantId: true,
        displayName: true,
        goals: true,
        assists: true,
      },
    }),
  ]);

  // Map participantId -> displayName (cho hydrate participantDisplayName).
  const participantNameById = new Map(
    participants.map((p) => [p.id, p.displayName]),
  );

  // Aggregate theo key = userId ?? participantPlayerId.
  const byKey = new Map<string, PlayerLeaderboardRow>();
  for (const s of stats) {
    const isUser = s.userId != null;
    const key = isUser ? `u:${s.userId}` : `p:${s.participantPlayerId}`;
    if (!key || key === "p:null") continue; // skip stat lỗi (không có user lẫn player)
    const existing = byKey.get(key);
    if (existing) {
      existing.goals += s.goals;
      existing.assists += s.assists;
      existing.points += s.goals + s.assists;
    } else {
      byKey.set(key, {
        key,
        displayName: s.displayName,
        participantDisplayName: s.participantId
          ? (participantNameById.get(s.participantId) ?? "—")
          : "—",
        goals: s.goals,
        assists: s.assists,
        points: s.goals + s.assists,
      });
    }
  }

  const all = [...byKey.values()];
  const sortByName = (a: PlayerLeaderboardRow, b: PlayerLeaderboardRow) =>
    a.displayName.localeCompare(b.displayName);

  const topScorers = [...all]
    .sort((a, b) => b.goals - a.goals || b.points - a.points || sortByName(a, b))
    .slice(0, 10);
  const topAssists = [...all]
    .sort((a, b) => b.assists - a.assists || b.points - a.points || sortByName(a, b))
    .slice(0, 10);
  const topMvp = [...all]
    .sort((a, b) => b.points - a.points || b.goals - a.goals || sortByName(a, b))
    .slice(0, 10);

  return { topScorers, topAssists, topMvp };
}

// List team để AddParticipantDialog chọn (mode "team"). Search theo tên contains,
// limit 20. Server pre-fetch rồi truyền vào dialog (không fetch client-side).
// Exclude team đã có trong giải (theo teamId) để tránh trùng displayName.
export async function listTeamsForTournamentPicker(
  tournamentId: string,
  search?: string,
): Promise<{ id: string; name: string; skillTier: string }[]> {
  // Lấy teamId đã có trong giải để exclude.
  const existing = await db.tournamentParticipant.findMany({
    where: { tournamentId, teamId: { not: null } },
    select: { teamId: true },
  });
  const excludeIds = existing
    .map((p) => p.teamId)
    .filter((id): id is string => id !== null);

  const teams = await db.team.findMany({
    where: {
      id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
      ...(search && search.trim().length > 0
        ? { name: { contains: search.trim(), mode: "insensitive" } }
        : {}),
    },
    select: { id: true, name: true, skillTier: true },
    orderBy: { name: "asc" },
    take: 20,
  });
  // skillTier là enum -> map sang string label ở UI (trả raw enum value).
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    skillTier: t.skillTier as string,
  }));
}
