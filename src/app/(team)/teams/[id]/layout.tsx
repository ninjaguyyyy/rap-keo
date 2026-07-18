import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTeamById } from "@/features/teams/queries";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import { MapPinIcon } from "@/features/matches/components/card-shared";
import { teamSkillTierLabels } from "@/features/teams/labels";

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

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Header = ảnh bìa đội full-bleed + scrim + hex overlay + crest/tên/khu vực. */}
      <header className="relative w-full overflow-hidden">
        {/* Ảnh bìa đội. coverUrl = ảnh upload (Supabase Storage), fallback mặc định. */}
        <Image
          src={team.coverUrl ?? "/team_detail_bg.webp"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim gradient xanh spotlight (tối dần xuống đáy) để chữ trắng đọc rõ. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-spotlight/45 via-brand-spotlight/75 to-brand-spotlight/95" />
        {/* Họa tiết lục giác mờ. */}
        <div className="hex-bg absolute inset-0" aria-hidden="true" />

        {/* Nội dung header (relative nổi trên ảnh/scrim), giới hạn max-w-md căn giữa. */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Nút back tròn góc trên-trái. */}
          <div className="px-4 pt-4">
            <Link
              href="/teams"
              aria-label="Quay lại danh sách đội"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          </div>

          {/* Crest + tên + khu vực, canh giữa. Chừa pb lớn hơn để body nhô đè lên. */}
          <div className="flex flex-col items-center gap-2 px-4 pb-10 pt-2 text-center">
            {/* Crest đội: hiện dùng avatar chữ cái đầu (chưa upload logo).
                Viền trắng + shadow cho nổi trên nền ảnh bìa. */}
            <TeamAvatar
              name={team.name}
              size="lg"
              className="h-24 w-24 text-4xl shadow-xl ring-4 ring-white/80"
            />
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
              {team.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium text-white/90">
              <span className="inline-flex items-center gap-1">
                {teamSkillTierLabels[team.skillTier]}
              </span>
              {team.homeArea ? (
                <>
                  <span aria-hidden="true" className="text-white/50">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon />
                    {team.homeArea}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung page: card nhô lên đè header (-mt-3 rounded-t-2xl) — consistent
          với layout (main). Các tabs render trong khung max-w-md căn giữa. */}
      <main className="relative z-10 bg-surface-muted -mt-3 rounded-t-2xl px-4 py-4">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
