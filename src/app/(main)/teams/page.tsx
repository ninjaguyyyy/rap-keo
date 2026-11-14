import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMyTeams } from "@/features/teams/queries";
import { TeamCard } from "@/features/teams/components/team-card";
import { CreateTeamDialog } from "@/features/teams/components/create-team-dialog";
import { TeamsFiltersSection } from "@/features/teams/components/teams-filters-section";
import { SkillTier } from "@/generated/prisma/enums";

// Trang "Đội của tôi" — list đội user là chủ hoặc thành viên, kèm nút tạo đội.
// Auth required: chưa đăng nhập -> login kèm callback về đây (middleware cũng chặn).
export default async function TeamsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ skillTier?: string | string[] }>;
}>) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect("/login?callbackUrl=/teams");
  }

  const params = await searchParams;
  const teams = await listMyTeams(user.id);
  const skillTierRaw = params.skillTier;
  const skillTierValue =
    typeof skillTierRaw === "string" && skillTierRaw in SkillTier
      ? (skillTierRaw as SkillTier)
      : undefined;
  const filteredTeams = skillTierValue
    ? teams.filter((team) => team.skillTier === skillTierValue)
    : teams;
  const emptyTitle = skillTierValue
    ? "Không tìm thấy đội phù hợp"
    : "Bạn chưa tạo đội nào";
  const emptyDescription = skillTierValue
    ? "Thử đổi bộ lọc trình độ để xem thêm đội."
    : "Tạo đội đầu tiên để ráp kèo nhanh hơn.";

  return (
    <div className="flex flex-col gap-4">
      <section className="mt-6 relative left-1/2 h-36.5 w-screen -translate-x-1/2 overflow-hidden bg-brand px-5 text-white">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(84,17,112,0.45) 8%, rgba(84,17,112,0.08) 42%, rgba(12,0,26,0.56) 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.1) 0 52px, rgba(255,255,255,0) 52px 120px)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex h-full items-center justify-between gap-3">
          <p className="font-sans text-[32px] leading-none font-extrabold tracking-[-0.03em] text-white">
            Đội bóng
          </p>
          <CreateTeamDialog />
        </div>
      </section>

      <TeamsFiltersSection />

      {filteredTeams.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-linear-to-b from-surface to-surface-muted px-4 py-10 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-subtle"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-sm text-ink-muted">{emptyTitle}</p>
          <p className="text-xs text-ink-subtle">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredTeams.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
