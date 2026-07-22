"use client";

// Tabs trên trang chi tiết đội /teams/[id]. Dùng Tabs component (underline style,
// gạch chân vàng ở tab active) theo mẫu team detail. Tab "Tổng quan" có Next match
// + Previous games + info đội; Đội hình / Lịch đấu / Bảng là placeholder "Sắp có".
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { MapPinIcon } from "@/features/matches/components/card-shared";
import { teamSkillTierLabels } from "../labels";
import type {
  TeamDetail,
  TeamMatchItem,
  TeamRecentMatch,
  TeamMemberItem,
  LeaderboardRow,
} from "../queries";
import { EditTeamDialog } from "./edit-team-dialog";
import { DeleteTeamButton } from "./delete-team-button";
import {
  NextMatchCard,
  PreviousGamesCard,
} from "./team-match-cards";
import { MemberList } from "./member-list";
import { LeaderboardCard } from "./leaderboard-card";
import { TeamMatchesPanel } from "./team-matches-panel";

type TabId = "overview" | "squad" | "matches" | "table";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "table", label: "Bảng" },
  { id: "squad", label: "Đội hình" },
  { id: "matches", label: "Trận đấu" },
];

// Subtext cho từng tab placeholder.
const COMING_SOON_TEXT: Record<Exclude<TabId, "overview" | "squad" | "matches">, string> = {
  table: "Bảng xếp hạng đang được xây dựng.",
};

export function TeamDetailTabs({
  team,
  canManage,
  nextMatch,
  matches,
  upcoming,
  members,
  leaderboard,
}: {
  team: TeamDetail;
  canManage: boolean;
  nextMatch: TeamMatchItem | null;
  matches: TeamRecentMatch[];
  upcoming: TeamMatchItem[];
  members: TeamMemberItem[];
  leaderboard: LeaderboardRow[];
}) {
  const router = useRouter();
  // Card "Previous games" ở Overview chỉ hiện 5 trận gần nhất; tab Matches hiện hết.
  const recentMatches = matches.slice(0, 5);

  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList>
        {TABS.map(({ id, label }) => (
          <TabsTab key={id} value={id}>
            {label}
          </TabsTab>
        ))}
      </TabsList>

      {/* Tổng quan: Next match + Previous games + info đội. */}
      <TabsPanel value="overview" className="flex flex-col gap-4">
        <NextMatchCard match={nextMatch} teamName={team.name} />
        <PreviousGamesCard matches={recentMatches} />

        {/* Card thông tin đội (skill, khu vực, chủ đội) + action. */}
        <Card className="gap-0 p-0">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {teamSkillTierLabels[team.skillTier]}
              </Badge>
              {canManage ? <Badge variant="outline">Đội trưởng</Badge> : null}
            </div>

            {team.homeArea ? (
              <p className="inline-flex items-center gap-1 text-sm text-ink-muted">
                <MapPinIcon />
                {team.homeArea}
              </p>
            ) : null}

            <p className="text-sm text-ink-muted">
              Chủ đội:{" "}
              <span className="font-semibold text-ink">
                {team.owner.name ?? "—"}
              </span>
            </p>
          </div>

          {canManage ? (
            <div className="flex justify-end gap-1.5 border-t border-line px-4 py-2.5">
              <EditTeamDialog team={team} />
              <DeleteTeamButton
                team={team}
                onDeleted={() => router.push("/teams")}
              />
            </div>
          ) : null}
        </Card>
      </TabsPanel>

      {(["table", "squad", "matches"] as const).map((id) => (
        <TabsPanel key={id} value={id}>
          {id === "squad" ? (
            <div className="flex flex-col gap-4">
              <MemberList
                teamId={team.id}
                members={members}
                canManage={canManage}
              />
              <LeaderboardCard rows={leaderboard} />
            </div>
          ) : id === "matches" ? (
            <TeamMatchesPanel
              teamId={team.id}
              teamName={team.name}
              upcoming={upcoming}
              past={matches}
              canManage={canManage}
            />
          ) : (
            <ComingSoonPanel text={COMING_SOON_TEXT[id]} />
          )}
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
