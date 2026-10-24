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
  }[];
  members: {
    userId: string;
    name: string;
    isGuest: boolean;
    internalSide: InternalSquadSide | null;
  }[];
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
          {canEdit || canDelete ? (
            <div className="flex justify-end gap-1.5 border-t border-line px-4 py-2.5">
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

        {/* Section thống kê cầu thủ (nếu COMPLETED + có playerStats). */}
        {isCompleted && match.playerStats.length > 0 ? (
          <Card className="gap-0 p-0">
            <div className="border-b border-line px-4 py-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                Thống kê cầu thủ
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
                    {stat.saves > 0 ? (
                      <span className="text-xs font-bold text-ink-muted">
                        🧤 {stat.saves}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </TabsPanel>

      <TabsPanel value="mvp">
        {!isCompleted ? (
          <Card className="gap-2 p-4">
            <p className="text-sm font-semibold text-ink">Chưa mở vote MVP</p>
            <p className="text-xs text-ink-subtle">
              Vote MVP chỉ mở khi trận đã hoàn thành.
            </p>
          </Card>
        ) : !mvpVote.hasSession ? (
          <Card className="gap-2 p-4">
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
          />
        )}
      </TabsPanel>

      <TabsPanel value="squad">
        <MatchSquadPanel
          matchId={match.id}
          isInternal={squad.isInternal}
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
