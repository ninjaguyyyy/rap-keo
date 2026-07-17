import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTeamById } from "@/features/teams/queries";
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

  return <TeamDetailTabs team={team} canManage={team.ownerId === user.id} />;
}
