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

export type TeamMatchItem = NonNullable<Awaited<ReturnType<typeof getTeamNextMatch>>>;

// Kèo đã đá gần đây của đội: status COMPLETED, sort theo giờ đá gần nhất trước,
// giới hạn `limit`. Dùng cho card "Previous games" trên trang chi tiết đội.
export async function getTeamRecentMatches(teamId: string, limit = 5) {
  const matches = await db.match.findMany({
    where: { teamId, status: "COMPLETED" },
    include: teamMatchInclude,
  });
  const now = Date.now();
  // Chỉ giữ kèo có giờ đá đã qua (toàn bộ giờ < now).
  const past = matches.filter((m) =>
    m.playTimes.every((p) => p.getTime() < now),
  );
  // Sort giảm dần theo giờ đá cuối cùng (trận gần nhất trước).
  past.sort(
    (a, b) =>
      Math.max(...b.playTimes.map((p) => p.getTime())) -
      Math.max(...a.playTimes.map((p) => p.getTime())),
  );
  return past.slice(0, limit);
}

export type TeamRecentMatch = Awaited<ReturnType<typeof getTeamRecentMatches>>[number];

// Liệt kê thành viên đội: owner trước (role desc), rồi theo joinedAt. Include user
// để hiển thị tên/SĐT/avatar. Dùng cho tab "Đội hình" + hydrate leaderboard.
export async function listTeamMembers(teamId: string) {
  return db.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
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
    .filter((s) => memberIds.has(s.userId))
    .map((s) => {
      const goals = s._sum.goals ?? 0;
      const assists = s._sum.assists ?? 0;
      return {
        userId: s.userId,
        name: nameById.get(s.userId) ?? "—",
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

