import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { InternalSquadSide } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export const MVP_VOTE_TTL_MS = 24 * 60 * 60 * 1000;

type MatchVoteContext = {
  id: string;
  matchType: "FIND_OPPONENT" | "NEED_PLAYERS" | "FIELD_AVAILABLE" | "LOOKING_FOR_TEAM" | "INTERNAL";
  status: "OPEN" | "MATCHED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  teamId: string | null;
  team: {
    ownerId: string;
    members: { userId: string }[];
  } | null;
};

type VoteSessionWithMatch = {
  id: string;
  matchId: string;
  expiresAt: Date;
  closedAt: Date | null;
  winnerUserId: string | null;
  match: {
    id: string;
    matchType: "FIND_OPPONENT" | "NEED_PLAYERS" | "FIELD_AVAILABLE" | "LOOKING_FOR_TEAM" | "INTERNAL";
    status: "OPEN" | "MATCHED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
    teamId: string | null;
    team: {
      ownerId: string;
      members: { userId: string }[];
    } | null;
  };
};

function hashVoteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateVoteToken(): string {
  return randomBytes(32).toString("base64url");
}

function ensureMemberAccess(match: MatchVoteContext, userId: string) {
  if (!match.teamId || !match.team) {
    throw new Error("MATCH_TEAM_REQUIRED");
  }
  const isOwner = match.team.ownerId === userId;
  const isMember = isOwner || match.team.members.some((member) => member.userId === userId);
  if (!isMember) {
    throw new Error("FORBIDDEN_MEMBER");
  }
  return { isOwner };
}

async function loadMatchVoteContext(matchId: string): Promise<MatchVoteContext | null> {
  return db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      matchType: true,
      status: true,
      teamId: true,
      team: {
        select: {
          ownerId: true,
          members: {
            select: { userId: true },
          },
        },
      },
    },
  });
}

async function finalizeSessionInTransaction(
  tx: Prisma.TransactionClient,
  sessionId: string,
) {
  const session = await tx.matchMvpVoteSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      closedAt: true,
      matchId: true,
    },
  });
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.closedAt) return session;

  const votes = await tx.matchMvpVote.findMany({
    where: { sessionId },
    select: {
      candidateUserId: true,
      updatedAt: true,
    },
  });

  let winnerUserId: string | null = null;

  if (votes.length > 0) {
    const tallyMap = new Map<
      string,
      {
        candidateUserId: string;
        votes: number;
        earliestVoteAt: number;
        goals: number;
        assists: number;
        saves: number;
      }
    >();

    for (const vote of votes) {
      const existing = tallyMap.get(vote.candidateUserId);
      const voteAt = vote.updatedAt.getTime();
      if (existing) {
        existing.votes += 1;
        existing.earliestVoteAt = Math.min(existing.earliestVoteAt, voteAt);
      } else {
        tallyMap.set(vote.candidateUserId, {
          candidateUserId: vote.candidateUserId,
          votes: 1,
          earliestVoteAt: voteAt,
          goals: 0,
          assists: 0,
          saves: 0,
        });
      }
    }

    const candidateUserIds = [...tallyMap.keys()];
    const stats = await tx.playerStat.findMany({
      where: {
        matchId: session.matchId,
        userId: { in: candidateUserIds },
      },
      select: {
        userId: true,
        goals: true,
        assists: true,
        saves: true,
      },
    });

    for (const stat of stats) {
      if (!stat.userId) continue;
      const tally = tallyMap.get(stat.userId);
      if (!tally) continue;
      tally.goals += stat.goals;
      tally.assists += stat.assists;
      tally.saves += stat.saves;
    }

    const ranked = [...tallyMap.values()].sort(
      (a, b) =>
        b.votes - a.votes
        || b.saves - a.saves
        || b.goals - a.goals
        || b.assists - a.assists
        || a.earliestVoteAt - b.earliestVoteAt
        || a.candidateUserId.localeCompare(b.candidateUserId),
    );
    winnerUserId = ranked[0]?.candidateUserId ?? null;
  }

  return tx.matchMvpVoteSession.update({
    where: { id: sessionId },
    data: {
      closedAt: new Date(),
      winnerUserId,
    },
    select: {
      id: true,
      closedAt: true,
      matchId: true,
    },
  });
}

async function closeSessionIfExpired(sessionId: string, expiresAt: Date, closedAt: Date | null) {
  if (closedAt) return;
  if (expiresAt.getTime() > Date.now()) return;
  await db.$transaction((tx) => finalizeSessionInTransaction(tx, sessionId));
}

export async function createOrRotateMvpVoteSession(matchId: string, userId: string) {
  const match = await loadMatchVoteContext(matchId);
  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.status !== "COMPLETED") throw new Error("MATCH_NOT_COMPLETED");
  ensureMemberAccess(match, userId);

  const existing = await db.matchMvpVoteSession.findUnique({
    where: { matchId },
    select: {
      id: true,
      closedAt: true,
      expiresAt: true,
    },
  });

  if (existing) {
    await closeSessionIfExpired(existing.id, existing.expiresAt, existing.closedAt);
  }

  const refreshed = existing
    ? await db.matchMvpVoteSession.findUnique({
      where: { matchId },
      select: { id: true, closedAt: true },
    })
    : null;

  if (refreshed?.closedAt) {
    throw new Error("SESSION_CLOSED");
  }

  const token = generateVoteToken();
  const tokenHash = hashVoteToken(token);
  const expiresAt = new Date(Date.now() + MVP_VOTE_TTL_MS);

  await db.matchMvpVoteSession.upsert({
    where: { matchId },
    create: {
      matchId,
      tokenHash,
      expiresAt,
      createdByUserId: userId,
    },
    update: {
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function getVoteSessionByToken(
  matchId: string,
  token: string,
): Promise<VoteSessionWithMatch | null> {
  const tokenHash = hashVoteToken(token);
  const session = await db.matchMvpVoteSession.findFirst({
    where: {
      matchId,
      tokenHash,
    },
    select: {
      id: true,
      matchId: true,
      expiresAt: true,
      closedAt: true,
      winnerUserId: true,
      match: {
        select: {
          id: true,
          matchType: true,
          status: true,
          teamId: true,
          team: {
            select: {
              ownerId: true,
              members: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!session) return null;

  await closeSessionIfExpired(session.id, session.expiresAt, session.closedAt);

  return db.matchMvpVoteSession.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      matchId: true,
      expiresAt: true,
      closedAt: true,
      winnerUserId: true,
      match: {
        select: {
          id: true,
          matchType: true,
          status: true,
          teamId: true,
          team: {
            select: {
              ownerId: true,
              members: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getVoteSessionByMatchId(
  matchId: string,
): Promise<VoteSessionWithMatch | null> {
  const session = await db.matchMvpVoteSession.findUnique({
    where: { matchId },
    select: {
      id: true,
      matchId: true,
      expiresAt: true,
      closedAt: true,
      winnerUserId: true,
      match: {
        select: {
          id: true,
          matchType: true,
          status: true,
          teamId: true,
          team: {
            select: {
              ownerId: true,
              members: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!session) return null;

  await closeSessionIfExpired(session.id, session.expiresAt, session.closedAt);

  return db.matchMvpVoteSession.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      matchId: true,
      expiresAt: true,
      closedAt: true,
      winnerUserId: true,
      match: {
        select: {
          id: true,
          matchType: true,
          status: true,
          teamId: true,
          team: {
            select: {
              ownerId: true,
              members: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getOrCreateVoteSessionByMatchId(
  matchId: string,
): Promise<VoteSessionWithMatch | null> {
  const match = await loadMatchVoteContext(matchId);
  if (!match || match.status !== "COMPLETED" || !match.teamId || !match.team) {
    return null;
  }

  let session = await getVoteSessionByMatchId(matchId);
  if (session) return session;

  try {
    await db.matchMvpVoteSession.create({
      data: {
        matchId,
        tokenHash: hashVoteToken(generateVoteToken()),
        expiresAt: new Date(Date.now() + MVP_VOTE_TTL_MS),
        createdByUserId: match.team.ownerId,
      },
    });
  } catch (error) {
    // Race create: request khác vừa tạo session trước.
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError)
      || error.code !== "P2002"
    ) {
      throw error;
    }
  }

  session = await getVoteSessionByMatchId(matchId);
  return session;
}

export async function getMvpVoteCandidates(matchId: string): Promise<{ userId: string; name: string }[]> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { matchType: true },
  });
  if (!match) return [];

  const squadMembers = await db.matchSquadMember.findMany({
    where: {
      matchId,
      ...(match.matchType === "INTERNAL"
        ? { internalSide: { in: [InternalSquadSide.SIDE_A, InternalSquadSide.SIDE_B] } }
        : {}),
    },
    select: {
      userId: true,
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
  return squadMembers.map((member) => ({
    userId: member.userId,
    name: member.user.name ?? member.user.phone ?? "—",
  }));
}

export async function getUserVote(sessionId: string, userId: string) {
  return db.matchMvpVote.findUnique({
    where: {
      sessionId_voterUserId: {
        sessionId,
        voterUserId: userId,
      },
    },
    select: {
      candidateUserId: true,
      updatedAt: true,
    },
  });
}

export async function getSessionResultSummary(sessionId: string) {
  const [session, votes] = await Promise.all([
    db.matchMvpVoteSession.findUnique({
      where: { id: sessionId },
      select: {
        winnerUserId: true,
      },
    }),
    db.matchMvpVote.groupBy({
      by: ["candidateUserId"],
      where: { sessionId },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(votes.map((vote) => [vote.candidateUserId, vote._count._all]));
  return {
    winnerUserId: session?.winnerUserId ?? null,
    voteCounts: counts,
  };
}

export async function submitVote(params: {
  matchId: string;
  token: string | null;
  voterUserId: string | null;
  authenticatedUserId: string | null;
  candidateUserId: string;
}) {
  const session =
    params.token && params.token.trim().length > 0
      ? await getVoteSessionByToken(params.matchId, params.token)
      : await getVoteSessionByMatchId(params.matchId);
  if (!session) throw new Error("INVALID_TOKEN");
  if (session.closedAt) throw new Error("SESSION_CLOSED");
  if (session.match.status !== "COMPLETED") throw new Error("MATCH_NOT_COMPLETED");
  if (!session.match.teamId || !session.match.team) throw new Error("MATCH_TEAM_REQUIRED");

  const squadMembers = await db.matchSquadMember.findMany({
    where: {
      matchId: session.matchId,
      ...(session.match.matchType === "INTERNAL"
        ? { internalSide: { in: [InternalSquadSide.SIDE_A, InternalSquadSide.SIDE_B] } }
        : {}),
    },
    select: { userId: true },
  });
  const eligibleUserIds = new Set(squadMembers.map((member) => member.userId));
  if (eligibleUserIds.size === 0) {
    throw new Error("MATCH_SQUAD_EMPTY");
  }

  const selectedVoterUserId = params.voterUserId?.trim() || null;
  const authenticatedUserId = params.authenticatedUserId?.trim() || null;
  const effectiveVoterUserId =
    authenticatedUserId && eligibleUserIds.has(authenticatedUserId)
      ? authenticatedUserId
      : (selectedVoterUserId ?? authenticatedUserId);
  if (!effectiveVoterUserId) throw new Error("VOTER_REQUIRED");
  if (!eligibleUserIds.has(effectiveVoterUserId)) {
    throw new Error("VOTER_NOT_MEMBER");
  }
  if (!eligibleUserIds.has(params.candidateUserId)) {
    throw new Error("CANDIDATE_NOT_MEMBER");
  }

  await db.matchMvpVote.upsert({
    where: {
      sessionId_voterUserId: {
        sessionId: session.id,
        voterUserId: effectiveVoterUserId,
      },
    },
    update: {
      candidateUserId: params.candidateUserId,
    },
    create: {
      sessionId: session.id,
      voterUserId: effectiveVoterUserId,
      candidateUserId: params.candidateUserId,
    },
  });

  return { sessionId: session.id };
}

export async function closeMvpVoteSession(matchId: string, userId: string) {
  const match = await loadMatchVoteContext(matchId);
  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.status !== "COMPLETED") throw new Error("MATCH_NOT_COMPLETED");
  const { isOwner } = ensureMemberAccess(match, userId);
  if (!isOwner) throw new Error("FORBIDDEN_OWNER_ONLY");

  const session = await db.matchMvpVoteSession.findUnique({
    where: { matchId },
    select: {
      id: true,
      closedAt: true,
    },
  });
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.closedAt) return;

  await db.$transaction((tx) => finalizeSessionInTransaction(tx, session.id));
}
