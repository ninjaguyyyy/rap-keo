import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TeamPlayerStandingRow } from "../queries";
import { TeamAvatar } from "./team-avatar";

function formatPointsPerMatch(value: number) {
  return value.toFixed(2);
}

export function TeamPlayerStandingsCard({
  rows,
}: {
  rows: TeamPlayerStandingRow[];
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          BXH cầu thủ
        </h2>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-ink-subtle">
          Chưa có dữ liệu thống kê cầu thủ.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Cầu thủ</th>
                  <th className="px-3 py-2 text-right font-semibold">Điểm</th>
                  <th className="px-3 py-2 text-right font-semibold">Bàn</th>
                  <th className="px-3 py-2 text-right font-semibold">Kiến tạo</th>
                  <th className="px-3 py-2 text-right font-semibold">Save</th>
                  <th className="px-3 py-2 text-right font-semibold">MVP</th>
                  <th className="px-3 py-2 text-right font-semibold">Trận</th>
                  <th className="px-3 py-2 text-right font-semibold">Điểm/trận</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-b border-line last:border-b-0",
                      row.rank === 1 && "bg-brand-soft/50",
                    )}
                  >
                    <td className="px-3 py-2 text-left font-bold text-ink">
                      {row.rank}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex min-w-48 items-center gap-2">
                        <TeamAvatar name={row.name} size="sm" />
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-ink">{row.name}</span>
                          {row.jerseyNumber != null ? (
                            <Badge
                              variant="outline"
                              className="h-5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold"
                            >
                              #{row.jerseyNumber}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-extrabold tabular-nums text-ink">
                      {row.points}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{row.goals}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{row.assists}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{row.saves}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{row.mvpAwards}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{row.matches}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {formatPointsPerMatch(row.pointsPerMatch)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-4 py-2 text-xs text-ink-subtle">
            <p className="font-semibold text-ink-muted">📌 Công thức tính điểm</p>
            <p className="mt-1">
              ⚽ Bàn × 2 · 🎯 Kiến tạo × 1 · 🧤 Save × 1 · 👑 MVP × 3
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
