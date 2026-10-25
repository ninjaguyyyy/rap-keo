import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMyTournaments } from "@/features/tournaments/queries";
import { TournamentCard } from "@/features/tournaments/components/tournament-card";
import { CreateTournamentDialog } from "@/features/tournaments/components/create-tournament-dialog";

// Trang /my-tournaments — list giải user là organizer (mọi status).
// Auth required: chưa đăng nhập -> login kèm callback về đây.
export default async function MyTournamentsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect("/login?callbackUrl=/my-tournaments");
  }

  const tournaments = await listMyTournaments(user.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.875rem] leading-[1.05] font-black tracking-[-0.02em] text-ink">
            Giải của tôi
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            {tournaments.length > 0
              ? `${tournaments.length} giải đang tổ chức`
              : "Chưa tạo giải nào"}
          </p>
        </div>
        <CreateTournamentDialog isAuthed />
      </div>

      {tournaments.length === 0 ? (
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
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <p className="text-sm text-ink-muted">Bạn chưa tổ chức giải nào</p>
          <p className="text-xs text-ink-subtle">
            Bấm &ldquo;Tạo giải&rdquo; để bắt đầu.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <TournamentCard tournament={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
