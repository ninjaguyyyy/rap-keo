// Card leaderboard — top vua phá lưới / kiến tạo của đội. Sort theo goals desc,
// phụ points desc (đã sort ở query). Top 1 highlight brand-soft. Props rows từ
// getTeamLeaderboard. Empty state khi chưa có PlayerStat.
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "../queries";
import { TeamAvatar } from "./team-avatar";

export function LeaderboardCard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <Card className="gap-0 p-0">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          Vua phá lưới
        </h2>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-ink-subtle">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>Chưa có dữ liệu ghi bàn</span>
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {rows.map((row, idx) => {
            const rank = idx + 1;
            const isTop = rank === 1;
            return (
              <li
                key={row.userId}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  isTop && "bg-brand-soft/50",
                )}
              >
                {/* Hạng. */}
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold",
                    isTop
                      ? "bg-accent-yellow text-ink"
                      : rank <= 3
                        ? "bg-brand text-white"
                        : "bg-surface-muted text-ink-subtle",
                  )}
                >
                  {rank}
                </span>

                <TeamAvatar name={row.name} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {row.name}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {row.points} điểm ({row.goals} bàn · {row.assists} kiến tạo)
                  </p>
                </div>

                {/* Tổng bàn thắng nổi bật bên phải. */}
                <span className="shrink-0 text-right">
                  <span className="block text-base font-extrabold tabular-nums text-ink">
                    {row.goals}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase text-ink-subtle">
                    bàn
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
