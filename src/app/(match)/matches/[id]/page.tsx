import Link from "next/link";
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
import { MockMatchFlowActions } from "@/features/matches/components/mock-match-flow-actions";
import {
  getSessionResultSummary,
  getOrCreateVoteSessionByMatchId,
  getUserVote,
} from "@/features/matches/mvp-vote";
import { fieldTypeLabels, skillTierLabels } from "@/features/matches/labels";

const dayLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatLegacyDayLabel(playTimes: Date[]): string {
  if (playTimes.length === 0) return "";
  const first = [...playTimes].sort((a, b) => a.getTime() - b.getTime())[0];
  return dayLabelFormatter.format(first);
}

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

  // Public match detail dùng UI cũ (flow gọi/inbox + chốt kèo) để giữ trải nghiệm
  // giống trước khi bỏ mock data. Private/team match giữ tabs quản lý.
  if (!match.isPrivate) {
    const dayLabel = formatLegacyDayLabel(match.playTimes);
    const areaLabel = match.field?.name ?? match.area ?? "Chưa rõ khu vực";
    const firstSkillTier = match.skillTiers[0];
    const skillLabel = firstSkillTier ? skillTierLabels[firstSkillTier] : "Mọi trình độ";

    return (
      <div className="space-y-3 p-4">
        <MockMatchFlowActions
          matchId={match.id}
          phone={match.sourcePhone ?? ""}
          fbLink={match.sourcePostUrl ?? ""}
        />

        <div className="space-y-1.5 px-1 text-center text-ink-muted">
          <p className="text-[12px] font-normal tracking-[0.56px]">
            <span>Phủi League</span>
            {dayLabel ? <span className="mx-2.5">•</span> : null}
            {dayLabel ? <span>{dayLabel}</span> : null}
          </p>
          <p className="text-[12px]">
            <span>{fieldTypeLabels[match.fieldType]}</span>
            <span className="mx-2">•</span>
            <span>{areaLabel}</span>
            <span className="mx-2">•</span>
            <span>{skillLabel}</span>
          </p>
        </div>

        <Link
          href="/matches"
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#ebe5eb] text-xs font-medium text-brand"
        >
          Về danh sách kèo
        </Link>
      </div>
    );
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
  const identityVoterCandidates = candidateRows.filter(
    (candidate) => !voteSummary?.voterUserIds.has(candidate.userId),
  );
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
        identityVoterCandidates,
        voteCounts,
        initialCandidateUserId:
          userVote && playableUserIds.has(userVote.candidateUserId)
            ? userVote.candidateUserId
            : null,
        canVoteAsLoggedMember: Boolean(viewer && viewerIsSquadMember && voteSession && voteSession.closedAt == null),
        allowIdentityVoteWithoutLogin: Boolean(
          identityVoterCandidates.length > 0
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
          jerseyNumber: member.jerseyNumber,
          hometown: member.user.hometown ?? null,
          avatarUrl: member.user.avatarUrl ?? null,
        })),
        members: squadRows,
      }}
    />
  );
}
