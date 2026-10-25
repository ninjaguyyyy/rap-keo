"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamPlayerStandingRow } from "../queries";
import { TeamAvatar } from "./team-avatar";

export function TeamPlayerStandingsCard({
  rows,
}: {
  rows: TeamPlayerStandingRow[];
}) {
  const [mode, setMode] = useState<"short" | "full">("short");
  const isShortMode = mode === "short";

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 gap-1 rounded-[0.8rem] bg-[#ebe5eb] p-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode("short")}
              className={cn(
                "h-10 rounded-xl text-sm font-semibold",
                isShortMode
                  ? "bg-surface text-ink shadow-sm hover:bg-surface"
                  : "bg-transparent text-ink-muted hover:bg-surface/70",
              )}
            >
              Short
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode("full")}
              className={cn(
                "h-10 rounded-xl text-sm font-semibold",
                !isShortMode
                  ? "bg-surface text-ink shadow-sm hover:bg-surface"
                  : "bg-transparent text-ink-muted hover:bg-surface/70",
              )}
            >
              Full
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="gap-0 bg-white p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-ink-subtle">
            Chưa có dữ liệu thống kê cầu thủ.
          </div>
        ) : (
          <>
            <div className="overflow-x-hidden bg-white">
            <table className={cn("w-full table-fixed border-collapse bg-white", isShortMode ? "text-sm" : "text-xs")}>
              <thead>
                <tr className="border-b border-line bg-white text-xs uppercase tracking-wide text-ink-muted">
                  <th className="w-8 py-2 pl-3 pr-1 text-left font-semibold">#</th>
                  <th className={cn("py-2 pl-1 text-left font-semibold", isShortMode ? "w-[11rem] pr-1" : "w-[9.5rem] pr-0.5")}>Cầu thủ</th>
                  {isShortMode ? (
                    <>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Trận</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Goal</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Ast</th>
                      <th className="w-9 py-2 pl-1 pr-2 text-center font-semibold">Điểm</th>
                    </>
                  ) : (
                    <>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Trận</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Goal</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Ast</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">Save</th>
                      <th className="w-9 px-1 py-2 text-center font-semibold">MVP</th>
                      <th className="w-9 py-2 pl-1 pr-2 text-center font-semibold">Điểm</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="text-xs">
                {rows.map((row) => {
                  const isTopRank = row.rank === 1;

                  return (
                    <tr
                      key={row.userId}
                      className={cn(
                        "border-b border-line last:border-b-0",
                        isTopRank && "bg-brand-soft/70",
                      )}
                    >
                      <td
                        className={cn(
                          "w-8 py-2 pl-3 pr-1 text-left font-bold text-ink",
                          isTopRank && "font-extrabold text-brand-bright",
                        )}
                      >
                        {row.rank}
                      </td>
                      <td className={cn("py-2 pl-1", isShortMode ? "w-[11rem] pr-1" : "w-[9.5rem] pr-0.5")}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <TeamAvatar
                            name={row.name}
                            size="sm"
                            className="h-10 w-10 rounded-xl text-sm"
                          />
                          <div className="flex min-h-10 min-w-0 flex-col justify-center">
                            <p className={cn("truncate text-sm leading-5 font-bold text-ink", isTopRank && "font-extrabold text-brand-bright")}>
                              {row.name}
                            </p>
                            {row.jerseyNumber != null || row.hometown?.trim() ? (
                              <p className="flex min-w-0 items-center gap-1.5 text-xs leading-4 font-medium text-ink-muted">
                                {row.jerseyNumber != null ? (
                                  <span className="shrink-0">{row.jerseyNumber}</span>
                                ) : null}
                                {row.jerseyNumber != null && row.hometown?.trim() ? (
                                  <span aria-hidden="true" className="shrink-0">•</span>
                                ) : null}
                                {row.hometown?.trim() ? (
                                  <span className="min-w-0 truncate">{row.hometown.trim()}</span>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {isShortMode ? (
                        <>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.matches}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.goals}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.assists}</td>
                          <td className={cn("w-9 py-2 pl-1 pr-2 text-center font-extrabold tabular-nums text-ink", isTopRank && "text-brand-bright")}>
                            {row.points}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.matches}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.goals}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.assists}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.saves}</td>
                          <td className={cn("w-9 px-1 py-2 text-center tabular-nums text-ink", isTopRank && "font-extrabold text-brand-bright")}>{row.mvpAwards}</td>
                          <td className={cn("w-9 py-2 pl-1 pr-2 text-center font-extrabold tabular-nums text-ink", isTopRank && "text-brand-bright")}>
                            {row.points}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-4 py-2 text-xs text-ink-subtle">
            <p className="font-semibold text-ink-muted">📌 Công thức tính điểm</p>
            <p className="mt-1">
              🏟️ Nội bộ: 🥇 Thắng +3 · 😮‍💨 Không thắng +1 · 👑 MVP +2
            </p>
            <p className="mt-1">
              ⚔️ Đá kèo: ⚽ Bàn ×2 · 🎯 Kiến tạo ×1 · 🧤 Save ×1 · 👑 MVP ×3 (không có điểm tham gia)
            </p>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
