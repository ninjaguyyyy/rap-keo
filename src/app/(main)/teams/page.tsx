import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMyTeams } from "@/features/teams/queries";
import { TeamCard } from "@/features/teams/components/team-card";
import { CreateTeamDialog } from "@/features/teams/components/create-team-dialog";

// Trang "Đội của tôi" — list đội user là chủ hoặc thành viên, kèm nút tạo đội.
// Auth required: chưa đăng nhập -> login kèm callback về đây (middleware cũng chặn).
export default async function TeamsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect("/login?callbackUrl=/teams");
  }

  const teams = await listMyTeams(user.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink">Đội của tôi</h1>
          <p className="text-sm text-ink-muted">
            {teams.length > 0 ? `${teams.length} đội` : "Chưa có đội nào"}
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center">
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
          <p className="text-sm text-ink-muted">Bạn chưa tạo đội nào</p>
          <p className="text-xs text-ink-subtle">
            Tạo đội đầu tiên để ráp kèo nhanh hơn.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {teams.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} canManage={team.ownerId === user.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
