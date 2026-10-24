import "server-only";

import { randomInt } from "node:crypto";
import { getTeamPlayerStandings } from "@/features/teams/queries";

export type InternalPlayingSide = "SIDE_A" | "SIDE_B";

// Chia đội nội bộ cân bằng theo points hiện tại (goals*2 + assists + saves + MVP*3),
// có ngẫu nhiên để không luôn ra cùng 1 cặp khi điểm bằng nhau.
export async function buildBalancedInternalTeamSides(
  teamId: string,
  userIds: string[],
): Promise<Map<string, InternalPlayingSide>> {
  const uniqueUserIds = [...new Set(userIds)];
  const standings = await getTeamPlayerStandings(teamId);
  const pointsByUserId = new Map(standings.map((row) => [row.userId, row.points]));
  const randomOrder = new Map(uniqueUserIds.map((userId) => [userId, randomInt(1_000_000)]));

  const players = uniqueUserIds
    .map((userId) => ({
      userId,
      points: pointsByUserId.get(userId) ?? 0,
      tie: randomOrder.get(userId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || a.tie - b.tie);

  let pointsA = 0;
  let pointsB = 0;
  let countA = 0;
  let countB = 0;
  const result = new Map<string, InternalPlayingSide>();

  for (const player of players) {
    let side: InternalPlayingSide;
    if (pointsA < pointsB) {
      side = "SIDE_A";
    } else if (pointsB < pointsA) {
      side = "SIDE_B";
    } else if (countA < countB) {
      side = "SIDE_A";
    } else if (countB < countA) {
      side = "SIDE_B";
    } else {
      side = randomInt(2) === 0 ? "SIDE_A" : "SIDE_B";
    }

    result.set(player.userId, side);
    if (side === "SIDE_A") {
      pointsA += player.points;
      countA += 1;
    } else {
      pointsB += player.points;
      countB += 1;
    }
  }

  return result;
}
