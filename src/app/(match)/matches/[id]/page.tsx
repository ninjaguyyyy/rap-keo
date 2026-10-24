import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  canEditMatch,
  ensureMatchSquadSeeded,
  getMatchById,
  getMatchByIdForVoteLink,
  listMatchSquadMembers,
} from "@/features/matches/queries";
import { listTeamMembers } from "@/features/teams/queries";
import { MatchDetailTabs } from "@/features/matches/components/match-detail-tabs";
import {
  getSessionResultSummary,
  getOrCreateVoteSessionByMatchId,
  getUserVote,
} from "@/features/matches/mvp-vote";

// Trang chi tiết trận /matches/[id]. Header (2 đội + tỷ số) render ở layout;
// page chỉ render nội dung = tabs. Quyền xem đã enforce ở layout (getMatchById
// check public/private), check lại đây để lấy match cho tabs + defense-in-depth.
// canEdit + members: owner/thành viên đội thấy nút "Cập nhật kết quả".
export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const tabParam = Array.isArray(rawSearchParams.tab)
    ? rawSearchParams.tab[0]
    : rawSearchParams.tab;
  const initialTab = (
    tabParam === "mvp"
    || tabParam === "squad"
    || tabParam === "stats"
    || tabParam === "overview"
  )
    ? tabParam
    : "overview";
  const viewer = await getCurrentUser();
  const match =
    (await getMatchById(id, viewer?.id))
    ?? (await getMatchByIdForVoteLink(id));
  if (!match) {
    notFound();
  }

  // Members + canEdit: chỉ load khi match có teamId (public kèo không có team thì
  // không cập nhật kết quả). Chạy song song.
  const teamId = match.teamId;
  const shouldUseMatchSquad = Boolean(teamId);
  const [members, canEdit, voteSession, squadRows] = await Promise.all([
    teamId ? listTeamMembers(teamId) : Promise.resolve([]),
    canEditMatch(match, viewer?.id),
    getOrCreateVoteSessionByMatchId(id),
    shouldUseMatchSquad
      ? (async () => {
        await ensureMatchSquadSeeded(id);
        return listMatchSquadMembers(id);
      })()
      : Promise.resolve([]),
  ]);
  const viewerIsMember = viewer
    ? members.some((member) => member.userId === viewer.id)
    : false;
  const viewerIsOwner = viewer
    ? members.some((member) => member.userId === viewer.id && member.role === "OWNER")
    : false;
  const canDeleteMatch = Boolean(viewerIsOwner && teamId);

  const [userVote, voteSummary] = voteSession
    ? await Promise.all([
      viewerIsMember ? getUserVote(voteSession.id, viewer!.id) : Promise.resolve(null),
      getSessionResultSummary(voteSession.id),
    ])
    : [null, null];
  const isInternalMatch = match.matchType === "INTERNAL";
  const playingSquadRows = isInternalMatch
    ? squadRows.filter(
      (member) => member.internalSide === "SIDE_A" || member.internalSide === "SIDE_B",
    )
    : squadRows;
  const candidateRows = playingSquadRows.map((member) => ({
    userId: member.userId,
    name: member.name,
  }));
  const voteCounts = candidateRows.map((candidate) => ({
    candidateUserId: candidate.userId,
    count: voteSummary?.voteCounts.get(candidate.userId) ?? 0,
  }));
  const playableUserIds = new Set(playingSquadRows.map((member) => member.userId));
  const viewerIsSquadMember = viewer ? playableUserIds.has(viewer.id) : false;
  const resultMembers = members.filter((member) => playableUserIds.has(member.userId));

  return (
    <MatchDetailTabs
      match={match}
      canEdit={canEdit}
      canDelete={canDeleteMatch}
      members={members}
      resultMembers={resultMembers}
      initialTab={initialTab}
      mvpVote={{
        hasSession: Boolean(voteSession),
        isOwner: viewerIsOwner,
        isClosed: voteSession?.closedAt != null,
        expiresAt: voteSession?.expiresAt.toISOString() ?? null,
        winnerUserId: voteSummary?.winnerUserId ?? null,
        candidates: candidateRows,
        voteCounts,
        initialCandidateUserId:
          userVote && playableUserIds.has(userVote.candidateUserId)
            ? userVote.candidateUserId
            : null,
        canVoteAsLoggedMember: Boolean(viewer && viewerIsSquadMember && voteSession && voteSession.closedAt == null),
        allowIdentityVoteWithoutLogin: Boolean(
          candidateRows.length > 0
          && voteSession
          && voteSession.closedAt == null
          && (!viewer || !viewerIsSquadMember),
        ),
        initialVoterUserId: viewerIsSquadMember ? viewer!.id : null,
      }}
      squad={{
        isInternal: isInternalMatch,
        canManage: canDeleteMatch && shouldUseMatchSquad,
        teamMembers: members.map((member) => ({
          userId: member.userId,
          name: member.user.name ?? member.user.phone ?? "—",
        })),
        members: squadRows,
      }}
    />
  );
}
