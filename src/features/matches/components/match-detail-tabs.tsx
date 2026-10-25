"use client";

// Tabs trên trang chi tiết trận /matches/[id]. Mirror team-detail-tabs (underline).
// Tab "Tổng quan" có card info match + nút "Cập nhật kết quả" (owner/member) +
// section bàn đã ghi (nếu COMPLETED). Đội hình / Thống kê placeholder "Sắp có".
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { InternalSquadSide } from "@/generated/prisma/enums";
import { UpdateMatchResultDialog } from "./update-match-result-dialog";
import { MvpVotePanel } from "./mvp-vote-panel";
import { DeleteMatchButton } from "./delete-match-button";
import { MatchSquadPanel } from "./match-squad-panel";

type TabId = "overview" | "mvp" | "squad" | "stats";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "mvp", label: "MVP" },
  { id: "squad", label: "Đội hình" },
  { id: "stats", label: "Thống kê" },
];

type MatchMvpVoteTabData = {
  hasSession: boolean;
  isOwner: boolean;
  isClosed: boolean;
  expiresAt: string | null;
  winnerUserId: string | null;
  candidates: { userId: string; name: string }[];
  voteCounts: { candidateUserId: string; count: number }[];
  initialCandidateUserId: string | null;
  canVoteAsLoggedMember: boolean;
  allowIdentityVoteWithoutLogin: boolean;
  initialVoterUserId: string | null;
};

type MatchSquadTabData = {
  isInternal: boolean;
  canManage: boolean;
  teamMembers: {
    userId: string;
    name: string;
    jerseyNumber: number | null;
    hometown: string | null;
    avatarUrl: string | null;
  }[];
  members: {
    userId: string;
    name: string;
    isGuest: boolean;
    internalSide: InternalSquadSide | null;
  }[];
};

type KeyEventMetric = "goals" | "assists" | "saves";
type KeyEventRow = {
  metric: KeyEventMetric;
  icon: string;
  homeText: string | null;
  awayText: string | null;
};

export function MatchDetailTabs({
  match,
  canEdit,
  canDelete,
  members,
  resultMembers,
  initialTab,
  mvpVote,
  squad,
}: {
  match: MatchDetail;
  canEdit: boolean;
  canDelete: boolean;
  members: TeamMemberItem[];
  resultMembers: TeamMemberItem[];
  initialTab: TabId;
  mvpVote: MatchMvpVoteTabData;
  squad: MatchSquadTabData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venue = match.field?.name ?? match.area ?? "Chưa có sân";
  const isCompleted = match.status === "COMPLETED";
  const tabValue = initialTab;
  const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);
  const memberNameByUserId = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.userId,
          member.user.name ?? member.user.phone ?? "—",
        ]),
      ),
    [members],
  );
  const internalSideByUserId = useMemo(
    () =>
      new Map(
        squad.members.map((member) => [member.userId, member.internalSide]),
      ),
    [squad.members],
  );
  const teamMemberByUserId = useMemo(
    () =>
      new Map(
        squad.teamMembers.map((member) => [member.userId, member]),
      ),
    [squad.teamMembers],
  );
  const mvpLineupCandidates = useMemo(
    () =>
      mvpVote.candidates.map((candidate) => {
        const teamMember = teamMemberByUserId.get(candidate.userId);
        return {
          userId: candidate.userId,
          name: candidate.name,
          jerseyNumber: teamMember?.jerseyNumber ?? null,
          avatarUrl: teamMember?.avatarUrl ?? null,
          internalSide: internalSideByUserId.get(candidate.userId) ?? null,
        };
      }),
    [internalSideByUserId, mvpVote.candidates, teamMemberByUserId],
  );
  const keyEventRows = useMemo<KeyEventRow[]>(() => {
    const homeStats: Array<{
      name: string;
      goals: number;
      assists: number;
      saves: number;
    }> = [];
    const awayStats: Array<{
      name: string;
      goals: number;
      assists: number;
      saves: number;
    }> = [];
    for (const stat of match.playerStats) {
      const userId = stat.userId;
      const name = userId
        ? (memberNameByUserId.get(userId) ?? "—")
        : "Khách";
      const side = squad.isInternal
        && userId != null
        && internalSideByUserId.get(userId) === "SIDE_B"
        ? "away"
        : "home";
      const target = side === "home" ? homeStats : awayStats;
      target.push({
        name,
        goals: stat.goals,
        assists: stat.assists,
        saves: stat.saves,
      });
    }

    const toSummary = (list: typeof homeStats, metric: KeyEventMetric) => {
      const lines = list
        .filter((entry) => entry[metric] > 0)
        .map((entry) =>
          entry[metric] > 1
            ? `${entry.name} ×${entry[metric]}`
            : entry.name,
        );
      return lines.length > 0 ? lines.join(", ") : null;
    };

    const rows: KeyEventRow[] = [
      {
        metric: "goals",
        icon: "⚽",
        homeText: toSummary(homeStats, "goals"),
        awayText: toSummary(awayStats, "goals"),
      },
      {
        metric: "assists",
        icon: "🅰",
        homeText: toSummary(homeStats, "assists"),
        awayText: toSummary(awayStats, "assists"),
      },
      {
        metric: "saves",
        icon: "🧤",
        homeText: toSummary(homeStats, "saves"),
        awayText: toSummary(awayStats, "saves"),
      },
    ];
    return rows.filter((row) => row.homeText || row.awayText);
  }, [internalSideByUserId, match.playerStats, memberNameByUserId, squad.isInternal]);

  function handleTabChange(nextTab: string) {
    const params = new URLSearchParams(currentQuery);
    const tab = nextTab as TabId;
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={tabValue} onValueChange={handleTabChange} className="gap-4">
      <TabsList>
        {TABS.map(({ id, label }) => (
          <TabsTab key={id} value={id}>
            {label}
          </TabsTab>
        ))}
      </TabsList>

      {/* Tổng quan: card info match. */}
      <TabsPanel value="overview" className="flex flex-col gap-4">
        <Card className="gap-0 overflow-hidden border border-line/80 bg-surface p-0 shadow-sm">
          <div className="flex flex-col gap-3 p-4">
            {/* Badge loại kèo + trạng thái + loại sân. */}
            <div className="flex flex-wrap items-center gap-2">
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
            <p className="text-base font-bold leading-tight text-ink">
              {formatPlayTimes(match.playTimes)}
            </p>

            {/* Ghi chú. */}
            {match.note ? (
              <p className="text-[13px] leading-5 text-foreground">{match.note}</p>
            ) : null}
          </div>

          {/* Nút cập nhật kết quả (owner/member). */}
          {canEdit || canDelete ? (
            <div className="flex justify-end gap-1.5 border-t border-line bg-surface-muted/35 px-4 py-2">
              {canDelete ? (
                <DeleteMatchButton
                  matchId={match.id}
                  afterDeleteHref={match.teamId ? `/teams/${match.teamId}` : "/matches"}
                />
              ) : null}
              {canEdit ? <UpdateMatchResultDialog match={match} members={resultMembers} /> : null}
            </div>
          ) : null}
        </Card>

        {/* Section diễn biến chính (completed + có thống kê ghi nhận). */}
        {isCompleted && keyEventRows.length > 0 ? (
          <Card className="gap-0 overflow-hidden border border-line/80 bg-surface p-0 shadow-sm">
            <div className="border-b border-line px-4 py-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                Diễn biến chính
              </h2>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {keyEventRows.map((row) => (
                <li
                  key={row.metric}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5"
                >
                  <p className="truncate text-right text-sm font-semibold text-ink">
                    {row.homeText ?? "—"}
                  </p>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm">
                    {row.icon}
                  </span>
                  <p className="truncate text-left text-sm font-semibold text-ink">
                    {row.awayText ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* Fallback completed nhưng chưa ghi thống kê. */}
        {isCompleted && keyEventRows.length === 0 ? (
          <Card className="gap-2 border border-line/80 bg-surface p-4 shadow-sm">
            <p className="text-sm font-semibold text-ink">Chưa có diễn biến chi tiết</p>
            <p className="text-xs text-ink-subtle">
              Cập nhật kết quả để hiển thị ghi bàn / kiến tạo / cứu thua theo mẫu.
            </p>
          </Card>
        ) : null}
      </TabsPanel>

      <TabsPanel value="mvp">
        {!mvpVote.hasSession ? (
          <Card className="gap-2 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-4">
            <p className="text-sm font-semibold text-ink">Chưa có phiên vote</p>
            <p className="text-xs text-ink-subtle">
              Chưa thể khởi tạo phiên vote MVP cho trận này.
            </p>
          </Card>
        ) : (
          <MvpVotePanel
            matchId={match.id}
            candidates={mvpVote.candidates}
            initialCandidateUserId={mvpVote.initialCandidateUserId}
            voteCounts={mvpVote.voteCounts}
            isClosed={mvpVote.isClosed}
            expiresAt={mvpVote.expiresAt ?? new Date().toISOString()}
            winnerUserId={mvpVote.winnerUserId}
            isOwner={mvpVote.isOwner}
            canVoteAsLoggedMember={mvpVote.canVoteAsLoggedMember}
            allowIdentityVoteWithoutLogin={mvpVote.allowIdentityVoteWithoutLogin}
            initialVoterUserId={mvpVote.initialVoterUserId}
            fieldType={match.fieldType}
            isInternalMatch={squad.isInternal}
            lineupCandidates={mvpLineupCandidates}
          />
        )}
      </TabsPanel>

      <TabsPanel value="squad">
        <MatchSquadPanel
          matchId={match.id}
          isInternal={squad.isInternal}
          fieldType={match.fieldType}
          canManage={squad.canManage}
          members={squad.members}
          teamMembers={squad.teamMembers}
        />
      </TabsPanel>

      <TabsPanel value="stats">
        <ComingSoonPanel text="Thống kê chi tiết (sút/phạm lỗi) đang xây dựng." />
      </TabsPanel>
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
