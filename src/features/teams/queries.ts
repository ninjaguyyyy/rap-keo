import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Liệt kê các đội user thuộc về: là chủ đội (ownerId) HOẶC là thành viên
// (TeamMember). Sort mới nhất trước. Dùng cho trang "Đội của tôi" (/teams).
export async function listMyTeams(userId: string) {
  return db.team.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export type MyTeamItem = Awaited<ReturnType<typeof listMyTeams>>[number];

// Lấy 1 đội cho trang chi tiết /teams/[id]. Viewer phải là chủ đội hoặc thành
// viên — nếu không (hoặc đội không tồn tại) trả null -> route render notFound().
// Kèm owner.name để tab "Tổng quan" hiển thị chủ đội.
// Bọc React cache(): layout + page cùng gọi trong 1 request -> chỉ 1 query DB.
export const getTeamById = cache(async (id: string, userId: string) => {
  return db.team.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: { owner: { select: { id: true, name: true } } },
  });
});

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamById>>>;

// Include shape dùng chung cho 2 query kèo của đội (next + recent). Lấy đối thủ
// qua request ACCEPTED (requesterTeam.name) — MVP: mỗi kèo chỉ 1 request ACCEPTED.
const teamMatchInclude = {
  field: { select: { id: true, name: true, address: true } },
  requests: {
    where: { status: "ACCEPTED" },
    select: { requesterTeam: { select: { id: true, name: true } } },
    take: 1,
  },
} as const;

// Kèo sắp tới của đội: status OPEN/MATCHED/CONFIRMED có ít nhất 1 giờ >= now,
// lấy kèo có giờ sớm nhất. Dùng cho card "Next match" trên trang chi tiết đội.
// playTimes là mảng naive (UTC wall time) -> so sánh với Date.now() trong app.
// Gồm cả trận do team tự tạo (isPrivate + opponentName/sideA/sideB).
export async function getTeamNextMatch(teamId: string) {
  const matches = await db.match.findMany({
    where: {
      teamId,
      status: { in: ["OPEN", "MATCHED", "CONFIRMED"] },
    },
    include: teamMatchInclude,
  });
  const now = Date.now();
  const upcoming = matches.filter((m) =>
    m.playTimes.some((p) => p.getTime() >= now),
  );
  if (upcoming.length === 0) return null;
  // Sort theo giờ sớm nhất, trả kèo đầu tiên.
  upcoming.sort(
    (a, b) =>
      Math.min(...a.playTimes.map((p) => p.getTime())) -
      Math.min(...b.playTimes.map((p) => p.getTime())),
  );
  return upcoming[0];
}

// Tất cả trận sắp tới của đội (cho tab Trận đấu, section "Sắp tới"). Sort sớm nhất
// trước. Bao gồm trận private (team tự tạo) + kèo public gắn team.
export async function getTeamUpcomingMatches(teamId: string) {
  const matches = await db.match.findMany({
    where: {
      teamId,
      status: { in: ["OPEN", "MATCHED", "CONFIRMED"] },
    },
    include: teamMatchInclude,
  });
  const now = Date.now();
  const upcoming = matches.filter((m) =>
    m.playTimes.some((p) => p.getTime() >= now),
  );
  upcoming.sort(
    (a, b) =>
      Math.min(...a.playTimes.map((p) => p.getTime())) -
      Math.min(...b.playTimes.map((p) => p.getTime())),
  );
  return upcoming;
}

export type TeamMatchItem = NonNullable<Awaited<ReturnType<typeof getTeamNextMatch>>>;

// Kèo đã qua giờ đá của đội: gồm cả trận đã cập nhật kết quả (COMPLETED) và trận
// chưa chốt tỷ số (OPEN/MATCHED/CONFIRMED), sort gần nhất trước (KHÔNG limit — lấy
// tất cả cho tab "Lịch đấu"). Page slice 5 đầu cho card "Previous games" ở Overview.
// playTimes naive (UTC wall time) -> lọc trong app: chỉ giữ kèo đã qua giờ đá.
export async function getTeamMatches(teamId: string) {
  const matches = await db.match.findMany({
    where: {
      teamId,
      status: { in: ["OPEN", "MATCHED", "CONFIRMED", "COMPLETED"] },
    },
    include: teamMatchInclude,
  });
  const now = Date.now();
  const past = matches.filter((m) =>
    m.playTimes.every((p) => p.getTime() < now),
  );
  // Sort giảm dần theo giờ đá cuối cùng (trận gần nhất trước).
  past.sort(
    (a, b) =>
      Math.max(...b.playTimes.map((p) => p.getTime())) -
      Math.max(...a.playTimes.map((p) => p.getTime())),
  );
  return past;
}

export type TeamRecentMatch = Awaited<ReturnType<typeof getTeamMatches>>[number];

// Liệt kê thành viên đội: owner trước (role desc), rồi theo joinedAt. Include user
// để hiển thị tên/SĐT/avatar + isGuest (đánh dấu "Khách"). Dùng cho tab "Đội hình"
// + hydrate leaderboard.
export async function listTeamMembers(teamId: string) {
  return db.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          hometown: true,
          avatarUrl: true,
          isGuest: true,
        },
      },
    },
    // OWNER > MEMBER (enum thứ tự: OWNER=0? — sort an toàn bằng role string desc).
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  });
}

export type TeamMemberItem = Awaited<ReturnType<typeof listTeamMembers>>[number];

// Dòng leaderboard: tổng goals/assists + points (goals + assists) của 1 cầu thủ.
export type LeaderboardRow = {
  userId: string;
  name: string;
  goals: number;
  assists: number;
  points: number;
};

export type TeamPlayerStandingRow = {
  userId: string;
  name: string;
  jerseyNumber: number | null;
  rank: number;
  goals: number;
  assists: number;
  saves: number;
  mvpAwards: number;
  matches: number;
  points: number;
  pointsPerMatch: number;
};

// Top vua phá lùng / kiến tạo của đội: groupBy PlayerStat theo userId, _sum goals
// + assists, rồi hydrate tên từ listTeamMembers. Sort goals desc, phụ points desc.
// Chỉ tính thành viên hiện tại (userId trong listTeamMembers) — bỏ stat của người
// đã rời đội (nếu có) để leaderboard chỉ hiện thành viên hiện tại.
export async function getTeamLeaderboard(
  teamId: string,
): Promise<LeaderboardRow[]> {
  const [members, stats] = await Promise.all([
    listTeamMembers(teamId),
    db.playerStat.groupBy({
      by: ["userId"],
      where: { teamId },
      _sum: { goals: true, assists: true },
    }),
  ]);

  const nameById = new Map(members.map((m) => [m.userId, m.user.name ?? m.user.phone ?? "—"]));
  const memberIds = new Set(members.map((m) => m.userId));

  const rows: LeaderboardRow[] = stats
    .filter((s) => s.userId != null && memberIds.has(s.userId))
    .map((s) => {
      const goals = s._sum.goals ?? 0;
      const assists = s._sum.assists ?? 0;
      return {
        userId: s.userId as string,
        name: nameById.get(s.userId as string) ?? "—",
        goals,
        assists,
        points: goals + assists,
      };
    });

  // Sort: goals desc -> points desc -> assists desc.
  rows.sort(
    (a, b) => b.goals - a.goals || b.points - a.points || b.assists - a.assists,
  );
  return rows;
}

// Bảng xếp hạng cầu thủ all-time của đội. Công thức điểm:
// - Goal: +2
// - Assist: +1
// - Save: +1
// - MVP: +3 (đếm số phiên vote MVP đã đóng có winnerUserId = user)
// matches = số trận có dòng PlayerStat (trận có đóng góp stats).
export async function getTeamPlayerStandings(
  teamId: string,
): Promise<TeamPlayerStandingRow[]> {
  const [members, stats, mvpWins] = await Promise.all([
    listTeamMembers(teamId),
    db.playerStat.groupBy({
      by: ["userId"],
      where: {
        teamId,
        userId: { not: null },
      },
      _sum: { goals: true, assists: true, saves: true },
      _count: { _all: true },
    }),
    db.matchMvpVoteSession.groupBy({
      by: ["winnerUserId"],
      where: {
        closedAt: { not: null },
        winnerUserId: { not: null },
        match: { teamId },
      },
      _count: { _all: true },
    }),
  ]);

  const memberNameById = new Map(
    members.map((member) => [member.userId, member.user.name ?? member.user.phone ?? "—"]),
  );
  const statsByUserId = new Map<
    string,
    { goals: number; assists: number; saves: number; matches: number }
  >(
    stats
      .filter((stat) => stat.userId != null)
      .map((stat) => [
        stat.userId as string,
        {
          goals: stat._sum.goals ?? 0,
          assists: stat._sum.assists ?? 0,
          saves: stat._sum.saves ?? 0,
          matches: stat._count._all,
        },
      ]),
  );
  const mvpAwardsByUserId = new Map(
    mvpWins
      .filter((session) => session.winnerUserId != null)
      .map((session) => [session.winnerUserId as string, session._count._all]),
  );

  const rows = members
    .map((member) => {
      const memberStats = statsByUserId.get(member.userId);
      const goals = memberStats?.goals ?? 0;
      const assists = memberStats?.assists ?? 0;
      const saves = memberStats?.saves ?? 0;
      const mvpAwards = mvpAwardsByUserId.get(member.userId) ?? 0;
      const matches = memberStats?.matches ?? 0;
      const points = goals * 2 + assists + saves + mvpAwards * 3;
      const pointsPerMatch = matches > 0 ? points / matches : 0;

      return {
        userId: member.userId,
        name: memberNameById.get(member.userId) ?? "—",
        jerseyNumber: member.jerseyNumber,
        rank: 0,
        goals,
        assists,
        saves,
        mvpAwards,
        matches,
        points,
        pointsPerMatch,
      };
    })
    .sort((a, b) =>
      b.points - a.points
      || b.goals - a.goals
      || b.assists - a.assists
      || b.saves - a.saves
      || b.mvpAwards - a.mvpAwards
      || a.name.localeCompare(b.name),
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return rows;
}
