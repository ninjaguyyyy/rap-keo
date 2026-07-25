// Card leaderboard cầu thủ trong giải (Vua phá lưới / Vua kiến tạo / MVP).
// Mirror LeaderboardCard (teams feature) nhưng có thêm participantDisplayName
// (đội trong giải) dưới tên. Props: title + rows + valueKey + valueLabel.
// Empty state khi chưa có PlayerStat. Top 1 highlight brand-soft.
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlayerLeaderboardRow } from "../queries";

export function PlayerLeaderboardCard({
  title,
  rows,
  valueKey,
  valueLabel,
}: {
  title: string;
  rows: PlayerLeaderboardRow[];
  valueKey: "goals" | "assists" | "points";
  valueLabel: string; // "bàn" | "kiến tạo" | "điểm"
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {title}
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
          <span>Chưa có dữ liệu</span>
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {rows.map((row, idx) => {
            const rank = idx + 1;
            const isTop = rank === 1;
            return (
              <li
                key={row.key}
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

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {row.displayName}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">
                    {row.participantDisplayName}
                  </p>
                </div>

                {/* Giá trị nổi bật bên phải. */}
                <span className="shrink-0 text-right">
                  <span className="block text-base font-extrabold tabular-nums text-ink">
                    {row[valueKey]}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase text-ink-subtle">
                    {valueLabel}
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
