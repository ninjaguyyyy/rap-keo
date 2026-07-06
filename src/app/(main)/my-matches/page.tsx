import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMyMatches } from "@/features/matches/queries";
import { MyMatchCard } from "@/features/matches/components/my-match-card";

// Trang "Kèo của tôi" — list kèo do user tạo, kèm trạng thái + action cáp kèo.
// Auth required: chưa đăng nhập -> login kèm callback về đây.
export default async function MyMatchesPage() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect("/login?callbackUrl=/my-matches");
  }

  const matches = await listMyMatches(user.id);
  const openCount = matches.filter((m) => m.status === "OPEN").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink">Kèo của tôi</h1>
        <p className="text-sm text-ink-muted">
          {openCount > 0
            ? `${openCount} kèo đang hiển thị trên bảng`
            : "Chưa có kèo nào đang mở"}
        </p>
      </div>

      {matches.length === 0 ? (
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm text-ink-muted">Bạn chưa đăng kèo nào</p>
          <p className="text-xs text-ink-subtle">
            Tạo kèo đầu tiên từ trang danh sách kèo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <li key={match.id}>
              <MyMatchCard match={match} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
