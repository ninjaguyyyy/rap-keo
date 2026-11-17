import type { ReactNode } from "react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTeamById } from "@/features/teams/queries";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import { EditTeamAvatarDialog } from "@/features/teams/components/edit-team-avatar-dialog";
import { teamSkillTierLabels } from "@/features/teams/labels";
import { resolveTeamPrimaryColorHex } from "@/features/teams/colors";

// Layout riêng cho trang chi tiết đội /teams/[id] (route group (team) không ảnh
// hưởng URL). Bỏ hero banner của (main), tự render header = ảnh bìa đội + crest +
// tên + khu vực. Nội dung page (các tabs) render dưới header qua {children}.
//
// getTeamById đã bọc React cache() -> layout & page gọi chung 1 query DB.
// Auth + quyền: viewer phải là chủ đội hoặc thành viên, ngoài ra notFound().
export default async function TeamLayout({
  children,
  params,
}: {
  children: ReactNode;
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
  const canManage = team.ownerId === user.id;
  const primaryColorHex = resolveTeamPrimaryColorHex(team.primaryColor);

  return (
    <div className="min-h-dvh bg-surface-muted">
      <header className="px-2 pb-3 pt-3">
        {/* Hero banner theo style team card: nền màu chủ đạo + pattern, logo/tên/meta. */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0" aria-hidden="true">
            <div
              className="h-full w-full bg-[url('/scoreboard-header-light.svg')] bg-cover bg-center"
              style={{ backgroundColor: primaryColorHex }}
            />
          </div>
          <div className="absolute inset-0 bg-black/12" aria-hidden="true" />

          <div className="relative flex h-[160px] flex-col p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="relative -mt-1">
                <TeamAvatar
                  name={team.name}
                  imageUrl={team.logoUrl}
                  size="lg"
                  className="h-16 w-16 rounded-full! border border-white/35 bg-white/10 p-1.5 shadow-sm"
                />
                {canManage ? <EditTeamAvatarDialog teamId={team.id} /> : null}
              </div>
            </div>

            <div className="mt-3 min-w-0">
              <h1 className="truncate text-[24px] leading-[1.05] font-black tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(24,0,30,0.35)]">
                {team.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] leading-6 text-white/92">
                <span className="inline-flex items-center gap-1.5">
                  <Image
                    src="/stadium.svg"
                    alt=""
                    width={22}
                    height={22}
                    className="opacity-95 invert"
                  />
                  {team.homeArea ?? "Chưa cập nhật khu vực"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Image
                    src="/soccer-ball-variant.png"
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-95 brightness-0 invert"
                  />
                  {teamSkillTierLabels[team.skillTier]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab/menu nằm dưới hero banner theo mockup. */}
      <main className="px-2 pb-6">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
