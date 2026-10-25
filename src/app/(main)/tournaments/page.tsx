import { getCurrentUser } from "@/lib/session";
import {
  listApprovedTournaments,
  listPendingTournaments,
} from "@/features/tournaments/queries";
import { TournamentCard } from "@/features/tournaments/components/tournament-card";
import { CreateTournamentDialog } from "@/features/tournaments/components/create-tournament-dialog";

// Trang /tournaments — list giải public (APPROVED/COMPLETED/CANCELLED). Nếu user
// là ADMIN, thêm section "Chờ duyệt" (PENDING) trên cùng.
// /tournaments public (xem cả khi chưa login) — tạo giải cần đăng nhập (dialog
// tự check isAuthed).
export default async function TournamentsPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const [approved, pending] = await Promise.all([
    listApprovedTournaments(),
    isAdmin ? listPendingTournaments() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.875rem] leading-[1.05] font-black tracking-[-0.02em] text-ink">
            Giải đấu
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            {approved.length > 0
              ? `${approved.length} giải đang diễn ra / đã kết thúc`
              : "Chưa có giải nào công khai"}
          </p>
        </div>
        <CreateTournamentDialog isAuthed={!!user} />
      </div>

      {/* Section ADMIN: giải chờ duyệt. */}
      {isAdmin && pending.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-accent-yellow/40 bg-linear-to-b from-accent-yellow/10 to-surface p-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
            Chờ duyệt ({pending.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {pending.map((t) => (
              <li key={t.id}>
                <TournamentCard tournament={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {approved.length === 0 ? (
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
          <p className="text-sm text-ink-muted">Chưa có giải nào công khai</p>
          {user ? (
            <p className="text-xs text-ink-subtle">
              Bấm &ldquo;Tạo giải&rdquo; để bắt đầu tổ chức giải đầu tiên.
            </p>
          ) : (
            <p className="text-xs text-ink-subtle">
              Đăng nhập để tạo giải đấu cho đội của bạn.
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {approved.map((t) => (
            <li key={t.id}>
              <TournamentCard tournament={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
