import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getTournamentBySlug,
  listTournamentParticipants,
  listTournamentMatches,
  getTournamentStandings,
  getTournamentPlayerLeaderboards,
  listTeamsForTournamentPicker,
} from "@/features/tournaments/queries";
import { listTeamMembers } from "@/features/teams/queries";
import { TournamentDetailTabs } from "@/features/tournaments/components/tournament-detail-tabs";

// Trang chi tiết giải /tournaments/[slug]. Header (banner + tên) render ở layout;
// page render nội dung = tabs. Quyền xem đã enforce ở layout (getTournamentBySlug
// check public/private), check lại đây để lấy tournament cho tabs.
export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const tournament = await getTournamentBySlug(slug, viewer?.id);
  if (!tournament) {
    notFound();
  }

  const canManage = tournament.organizerId === viewer?.id;
  const canApprove = viewer?.role === "ADMIN";
  const tournamentId = tournament.id;

  // Load participants + matches + standings + team picker options (chạy song
  // tranh). Team picker chỉ load khi organizer có quyền add participant (DRAFT/
  // REJECTED) để tránh query không cần thiết.
  const canEditParticipants =
    canManage && (tournament.status === "DRAFT" || tournament.status === "REJECTED");
  const [participants, matches, standings, playerLeaderboards, teamOptions] = await Promise.all([
    listTournamentParticipants(tournamentId),
    listTournamentMatches(tournamentId),
    getTournamentStandings(tournamentId),
    getTournamentPlayerLeaderboards(tournamentId),
    canEditParticipants ? listTeamsForTournamentPicker(tournamentId) : Promise.resolve([]),
  ]);

  // Pre-fetch TeamMember cho mỗi participant có teamId (để dialog "Thêm cầu thủ"
  // chọn). Key = participantId (mỗi participant 1 list, vì participant gắn 1
  // team duy nhất qua teamId). Chỉ fetch khi canEditParticipants (organizer +
  // DRAFT/REJECTED) — không cần cho viewer khác.
  const memberOptionsByParticipant: Record<
    string,
    { userId: string; name: string }[]
  > = {};
  if (canEditParticipants) {
    await Promise.all(
      participants
        .filter((p) => p.teamId)
        .map(async (p) => {
          const members = await listTeamMembers(p.teamId!);
          memberOptionsByParticipant[p.id] = members.map((m) => ({
            userId: m.userId,
            name: m.user.name ?? m.user.phone ?? "—",
          }));
        }),
    );
  }

  return (
    <TournamentDetailTabs
      tournament={tournament}
      canManage={canManage}
      canApprove={canApprove}
      participants={participants}
      matches={matches}
      standings={standings}
      playerLeaderboards={playerLeaderboards}
      teamOptions={teamOptions}
      memberOptionsByParticipant={memberOptionsByParticipant}
    />
  );
}
