import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  canEditMatch,
  getMatchById,
} from "@/features/matches/queries";
import { listTeamMembers } from "@/features/teams/queries";
import { MatchDetailTabs } from "@/features/matches/components/match-detail-tabs";

// Trang chi tiết trận /matches/[id]. Header (2 đội + tỷ số) render ở layout;
// page chỉ render nội dung = tabs. Quyền xem đã enforce ở layout (getMatchById
// check public/private), check lại đây để lấy match cho tabs + defense-in-depth.
// canEdit + members: owner/thành viên đội thấy nút "Cập nhật kết quả".
export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const match = await getMatchById(id, viewer?.id);
  if (!match) {
    notFound();
  }

  // Members + canEdit: chỉ load khi match có teamId (public kèo không có team thì
  // không cập nhật kết quả). Chạy song song.
  const teamId = match.teamId;
  const [members, canEdit] = await Promise.all([
    teamId ? listTeamMembers(teamId) : Promise.resolve([]),
    canEditMatch(match, viewer?.id),
  ]);

  return (
    <MatchDetailTabs match={match} canEdit={canEdit} members={members} />
  );
}
