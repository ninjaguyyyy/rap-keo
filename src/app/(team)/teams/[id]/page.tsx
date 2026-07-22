import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getTeamById,
  getTeamNextMatch,
  getTeamUpcomingMatches,
  getTeamMatches,
  listTeamMembers,
  getTeamLeaderboard,
} from "@/features/teams/queries";
import { TeamDetailTabs } from "@/features/teams/components/team-detail-tabs";

// Trang chi tiết đội /teams/[id]. Header (ảnh bìa + crest + tên) render ở layout;
// page chỉ render nội dung = các tabs. Quyền xem đã enforce ở layout (getTeamById
// bọc React cache -> không query lại DB), check lại đây để lấy team cho tabs +
// defense-in-depth (page có thể render độc lập).
export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=/teams/${id}`);
  }

  const team = await getTeamById(id, user.id);
  if (!team) {
    notFound();
  }

  // Kèo sắp tới (1, cho card Next match) + tất cả sắp tới (tab Trận đấu) + đã đá
  // + thành viên + leaderboard (chạy song song).
  const [nextMatch, upcoming, matches, members, leaderboard] = await Promise.all([
    getTeamNextMatch(id),
    getTeamUpcomingMatches(id),
    getTeamMatches(id),
    listTeamMembers(id),
    getTeamLeaderboard(id),
  ]);

  return (
    <TeamDetailTabs
      team={team}
      canManage={team.ownerId === user.id}
      nextMatch={nextMatch}
      upcoming={upcoming}
      matches={matches}
      members={members}
      leaderboard={leaderboard}
    />
  );
}
