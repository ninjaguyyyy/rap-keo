// Tabs trên trang chi tiết trận /matches/[id]. Mirror team-detail-tabs (underline).
// Tab "Tổng quan" có card info match + nút "Cập nhật kết quả" (owner/member) +
// section bàn đã ghi (nếu COMPLETED). Đội hình / Thống kê placeholder "Sắp có".
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { MapPinIcon } from "./card-shared";
import {
  fieldTypeLabels,
  formatPlayTimes,
  matchStatusLabels,
  matchTypeLabels,
} from "../labels";
import type { MatchDetail } from "../queries";
import type { TeamMemberItem } from "@/features/teams/queries";
import { UpdateMatchResultDialog } from "./update-match-result-dialog";

type TabId = "overview" | "squad" | "stats";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "squad", label: "Đội hình" },
  { id: "stats", label: "Thống kê" },
];

const COMING_SOON_TEXT: Record<Exclude<TabId, "overview">, string> = {
  squad: "Đội hình 2 bên sẽ có sau.",
  stats: "Thống kê chi tiết (sút/phạm lỗi) đang xây dựng.",
};

export function MatchDetailTabs({
  match,
  canEdit,
  members,
}: {
  match: MatchDetail;
  canEdit: boolean;
  members: TeamMemberItem[];
}) {
  const venue = match.field?.name ?? match.area ?? "Chưa có sân";
  const isCompleted = match.status === "COMPLETED";

  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList>
        {TABS.map(({ id, label }) => (
          <TabsTab key={id} value={id}>
            {label}
          </TabsTab>
        ))}
      </TabsList>

      {/* Tổng quan: card info match. */}
      <TabsPanel value="overview" className="flex flex-col gap-4">
        <Card className="gap-0 p-0">
          <div className="flex flex-col gap-3 p-4">
            {/* Badge loại kèo + trạng thái + loại sân. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{matchTypeLabels[match.matchType]}</Badge>
              <Badge variant="outline">{fieldTypeLabels[match.fieldType]}</Badge>
              <Badge variant="outline">{matchStatusLabels[match.status]}</Badge>
            </div>

            {/* Sân. */}
            <p className="inline-flex items-center gap-1 text-sm text-ink-muted">
              <MapPinIcon />
              {venue}
            </p>

            {/* Giờ đá. */}
            <p className="text-sm font-semibold text-ink">
              {formatPlayTimes(match.playTimes)}
            </p>

            {/* Ghi chú. */}
            {match.note ? (
              <p className="text-sm text-foreground">{match.note}</p>
            ) : null}
          </div>

          {/* Nút cập nhật kết quả (owner/member). */}
          {canEdit ? (
            <div className="flex justify-end gap-1.5 border-t border-line px-4 py-2.5">
              <UpdateMatchResultDialog match={match} members={members} />
            </div>
          ) : null}
        </Card>

        {/* Section bàn đã ghi (nếu COMPLETED + có playerStats). */}
        {isCompleted && match.playerStats.length > 0 ? (
          <Card className="gap-0 p-0">
            <div className="border-b border-line px-4 py-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                Bàn thắng
              </h2>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {match.playerStats.map((stat) => {
                const member = members.find((m) => m.userId === stat.userId);
                const name = member?.user.name ?? member?.user.phone ?? "—";
                return (
                  <li key={stat.userId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 truncate text-sm font-semibold text-ink">
                      {name}
                    </span>
                    {stat.goals > 0 ? (
                      <span className="text-xs font-bold text-brand">
                        ⚽ {stat.goals}
                      </span>
                    ) : null}
                    {stat.assists > 0 ? (
                      <span className="text-xs font-bold text-ink-muted">
                        🅰 {stat.assists}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </TabsPanel>

      {(["squad", "stats"] as const).map((id) => (
        <TabsPanel key={id} value={id}>
          <ComingSoonPanel text={COMING_SOON_TEXT[id]} />
        </TabsPanel>
      ))}
    </Tabs>
  );
}

function ComingSoonPanel({ text }: { text: string }) {
  return (
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
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <p className="text-sm text-ink-muted">Sắp có</p>
      <p className="text-xs text-ink-subtle">{text}</p>
    </div>
  );
}
