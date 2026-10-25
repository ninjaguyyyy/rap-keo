"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { FieldType, InternalSquadSide } from "@/generated/prisma/enums";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitMvpVote, closeMvpVote } from "../mvp-vote-actions";
import type { CloseMvpVoteState, SubmitMvpVoteState } from "../mvp-vote-schemas";

type Candidate = {
  userId: string;
  name: string;
};

type CandidateLineupPlayer = Candidate & {
  jerseyNumber: number | null;
  avatarUrl: string | null;
  internalSide: InternalSquadSide | null;
};

type VoteCount = {
  candidateUserId: string;
  count: number;
};

const LINEUP_ORDER_UPDATED_EVENT = "match-lineup-order-updated";
const initialSubmitState: SubmitMvpVoteState = {};
const initialCloseState: CloseMvpVoteState = {};

const deadlineDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

const deadlineTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function MvpVotePanel({
  matchId,
  candidates,
  identityVoterCandidates,
  initialCandidateUserId,
  voteCounts,
  isClosed,
  expiresAt,
  winnerUserId,
  isOwner,
  canVoteAsLoggedMember,
  allowIdentityVoteWithoutLogin,
  initialVoterUserId,
  fieldType,
  isInternalMatch,
  lineupCandidates,
}: {
  matchId: string;
  candidates: Candidate[];
  identityVoterCandidates: Candidate[];
  initialCandidateUserId: string | null;
  voteCounts: VoteCount[];
  isClosed: boolean;
  expiresAt: string;
  winnerUserId: string | null;
  isOwner: boolean;
  canVoteAsLoggedMember: boolean;
  allowIdentityVoteWithoutLogin: boolean;
  initialVoterUserId: string | null;
  fieldType: FieldType;
  isInternalMatch: boolean;
  lineupCandidates: CandidateLineupPlayer[];
}) {
  const router = useRouter();
  const isIdentityVoteMode = !canVoteAsLoggedMember && allowIdentityVoteWithoutLogin;
  const lineupStorageScope = `${matchId}:${isInternalMatch ? "internal" : "single"}`;
  const topOrderStorageKey = `match-lineup-order:${lineupStorageScope}:top`;
  const bottomOrderStorageKey = `match-lineup-order:${lineupStorageScope}:bottom`;
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialCandidateUserId ?? "",
  );
  const [selectedVoterUserId, setSelectedVoterUserId] = useState<string>(
    initialVoterUserId ?? "",
  );
  const [topLineupOrder, setTopLineupOrder] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readLineupOrderFromStorage(topOrderStorageKey));
  const [bottomLineupOrder, setBottomLineupOrder] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readLineupOrderFromStorage(bottomOrderStorageKey));
  const [submitState, submitAction, submitPending] = useActionState(
    submitMvpVote,
    initialSubmitState,
  );
  const [closeState, closeAction, closePending] = useActionState(
    closeMvpVote,
    initialCloseState,
  );
  const [voteThanksDismissed, setVoteThanksDismissed] = useState(false);
  const hasSubmittedVote = submitState.ok === true;
  const showVoteThanksDialog = hasSubmittedVote && !voteThanksDismissed;

  useEffect(() => {
    if (!closeState.ok) return;
    router.refresh();
  }, [closeState.ok, router]);

  useEffect(() => {
    function handleLineupOrderUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ storageScope?: string }>;
      if (customEvent.detail?.storageScope !== lineupStorageScope) return;
      setTopLineupOrder(readLineupOrderFromStorage(topOrderStorageKey));
      setBottomLineupOrder(readLineupOrderFromStorage(bottomOrderStorageKey));
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key) return;
      if (event.key !== topOrderStorageKey && event.key !== bottomOrderStorageKey) return;
      setTopLineupOrder(readLineupOrderFromStorage(topOrderStorageKey));
      setBottomLineupOrder(readLineupOrderFromStorage(bottomOrderStorageKey));
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      setTopLineupOrder(readLineupOrderFromStorage(topOrderStorageKey));
      setBottomLineupOrder(readLineupOrderFromStorage(bottomOrderStorageKey));
    }

    window.addEventListener(LINEUP_ORDER_UPDATED_EVENT, handleLineupOrderUpdated as EventListener);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(
        LINEUP_ORDER_UPDATED_EVENT,
        handleLineupOrderUpdated as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    bottomOrderStorageKey,
    lineupStorageScope,
    topOrderStorageKey,
  ]);

  const countsByCandidate = useMemo(
    () => new Map(voteCounts.map((vote) => [vote.candidateUserId, vote.count])),
    [voteCounts],
  );
  const hasCandidates = candidates.length > 0;
  const winnerName = candidates.find((candidate) => candidate.userId === winnerUserId)?.name ?? "—";
  const startersLimit = useMemo(() => getLineupSizeLimit(fieldType), [fieldType]);
  const candidateByUserId = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.userId, candidate])),
    [candidates],
  );
  const identityVoterByUserId = useMemo(
    () => new Map(identityVoterCandidates.map((candidate) => [candidate.userId, candidate])),
    [identityVoterCandidates],
  );
  const activeSelectedCandidateId = hasSubmittedVote ? "" : selectedCandidateId;
  const hasInvalidIdentitySelection = isIdentityVoteMode
    && selectedVoterUserId.length > 0
    && !identityVoterByUserId.has(selectedVoterUserId);
  const activeSelectedVoterUserId = hasSubmittedVote || hasInvalidIdentitySelection
    ? ""
    : selectedVoterUserId;
  const normalizedLineupCandidates = useMemo(
    () =>
      lineupCandidates.filter((candidate) => candidateByUserId.has(candidate.userId)),
    [candidateByUserId, lineupCandidates],
  );
  const topCandidates = useMemo(
    () => {
      const sortedPlayers = normalizedLineupCandidates
        .filter((candidate) =>
          !isInternalMatch || candidate.internalSide === "SIDE_A")
        .sort(compareLineupPlayer);
      return applyLineupOrder(sortedPlayers, topLineupOrder);
    },
    [isInternalMatch, normalizedLineupCandidates, topLineupOrder],
  );
  const bottomCandidates = useMemo(
    () => {
      if (!isInternalMatch) return [];
      const sortedPlayers = normalizedLineupCandidates
        .filter((candidate) => candidate.internalSide === "SIDE_B")
        .sort(compareLineupPlayer);
      return applyLineupOrder(sortedPlayers, bottomLineupOrder);
    },
    [bottomLineupOrder, isInternalMatch, normalizedLineupCandidates],
  );
  const topStarterPlayers = useMemo(
    () => topCandidates.slice(0, startersLimit),
    [startersLimit, topCandidates],
  );
  const topBenchPlayers = useMemo(
    () => topCandidates.slice(startersLimit),
    [startersLimit, topCandidates],
  );
  const bottomStarterPlayers = useMemo(
    () => bottomCandidates.slice(0, startersLimit),
    [bottomCandidates, startersLimit],
  );
  const bottomBenchPlayers = useMemo(
    () => bottomCandidates.slice(startersLimit),
    [bottomCandidates, startersLimit],
  );
  const topFormation = useMemo(
    () => formatFormation(buildLineupRows(topStarterPlayers)),
    [topStarterPlayers],
  );
  const bottomFormation = useMemo(
    () => formatFormation(buildLineupRows(bottomStarterPlayers)),
    [bottomStarterPlayers],
  );
  const canVote = !isClosed && (canVoteAsLoggedMember || isIdentityVoteMode);
  const canSubmitVote =
    hasCandidates
    && Boolean(activeSelectedCandidateId)
    && (canVoteAsLoggedMember || (isIdentityVoteMode && Boolean(activeSelectedVoterUserId)));
  const selectedVoterLabel = activeSelectedVoterUserId
    ? (identityVoterByUserId.get(activeSelectedVoterUserId)?.name ?? "")
    : "";
  const deadlineLabel = useMemo(() => {
    const deadline = new Date(expiresAt);
    if (Number.isNaN(deadline.getTime())) return null;
    return `${deadlineDateFormatter.format(deadline)} • ${deadlineTimeFormatter.format(deadline)}`;
  }, [expiresAt]);

  return (
    <div className="flex flex-col gap-4">
      <Dialog
        open={showVoteThanksDialog}
        onOpenChange={(open) => {
          if (open) return;
          setVoteThanksDismissed(true);
          router.refresh();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              🎉 Vote MVP thành công
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-muted">
              Cảm ơn bạn đã vote! Kết quả đã được cập nhật.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setVoteThanksDismissed(true);
                router.refresh();
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isClosed ? "secondary" : "outline"}>
            {isClosed ? "Đã đóng vote" : "Đang mở vote"}
          </Badge>
          {!isClosed && deadlineLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-[11px] font-semibold text-ink-muted">
              ⏳ Hạn vote: {deadlineLabel}
            </span>
          ) : null}
        </div>

        {!hasCandidates ? (
            <p className="text-sm text-ink-muted">
              Chưa có danh sách cầu thủ tham gia trận để vote MVP.
            </p>
          ) : (
            <MvpLineupBoard
              topLabel={isInternalMatch ? "Bên A" : "Đội của bạn"}
              topFormation={topFormation}
              topPlayers={topStarterPlayers}
              topBenchPlayers={topBenchPlayers}
              bottomLabel={isInternalMatch ? "Bên B" : undefined}
              bottomFormation={isInternalMatch ? bottomFormation : undefined}
              bottomPlayers={isInternalMatch ? bottomStarterPlayers : undefined}
              bottomBenchPlayers={isInternalMatch ? bottomBenchPlayers : undefined}
              selectedCandidateId={activeSelectedCandidateId}
              voteCountsByCandidate={countsByCandidate}
              showVoteCounts={isOwner}
              clickable={canVote}
              onSelect={(candidateUserId) => setSelectedCandidateId(candidateUserId)}
            />
          )}

        {!isClosed ? (
          canVote ? (
            <form action={submitAction} className="flex flex-col gap-3">
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="voterUserId" value={activeSelectedVoterUserId} />
              <input type="hidden" name="candidateUserId" value={activeSelectedCandidateId} />

              {isIdentityVoteMode ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-ink">Bạn là ai?</p>
                  <Select
                    value={activeSelectedVoterUserId}
                    onValueChange={(value) => setSelectedVoterUserId(String(value))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Chọn tên của bạn trong đội">
                        {selectedVoterLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {identityVoterCandidates.map((candidate) => (
                        <SelectItem key={candidate.userId} value={candidate.userId}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {identityVoterCandidates.length > 0 ? (
                    <p className="text-xs text-ink-subtle">
                      Không cần đăng nhập. Mỗi cầu thủ trong danh sách có 1 phiếu.
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-ink-subtle">
                      Tất cả cầu thủ đã gửi phiếu.
                    </p>
                  )}
                </div>
              ) : null}
              {activeSelectedCandidateId && !hasSubmittedVote ? (
                <p className="text-sm text-ink-muted">
                  Đang chọn:{" "}
                  <span className="font-semibold text-ink">
                    {candidateByUserId.get(activeSelectedCandidateId)?.name ?? "—"}
                  </span>
                </p>
              ) : null}
              {initialCandidateUserId && !hasSubmittedVote ? (
                <p className="text-xs text-ink-subtle">
                  Phiếu trước đó: {candidateByUserId.get(initialCandidateUserId)?.name ?? "—"}
                </p>
              ) : null}

              <Button type="submit" disabled={submitPending || !canSubmitVote}>
                {submitPending ? "Đang lưu..." : "Gửi vote MVP"}
              </Button>

              {hasSubmittedVote ? (
                <p className="text-sm text-brand">
                  Đã lưu vote MVP của bạn.
                </p>
              ) : null}
              {submitState.error ? (
                <p className="text-sm text-destructive">{submitState.error}</p>
              ) : null}
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">
                Bạn không có quyền gửi phiếu cho trận này.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">
              MVP: <span className="text-brand">{winnerName}</span>
            </p>
            <ul className="flex flex-col gap-1 text-sm text-ink-muted">
              {candidates.map((candidate) => (
                <li
                  key={candidate.userId}
                  className={cn(
                    "flex items-center",
                    isOwner ? "justify-between" : "justify-start",
                  )}
                >
                  <span>{candidate.name}</span>
                  {isOwner ? (
                    <span className="font-semibold text-ink">
                      {countsByCandidate.get(candidate.userId) ?? 0} phiếu
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {!isClosed && isOwner ? (
        <form action={closeAction} className="flex flex-col gap-2">
          <input type="hidden" name="matchId" value={matchId} />
          <Button type="submit" variant="outline" disabled={closePending}>
            {closePending ? "Đang đóng vote..." : "Đóng vote ngay"}
          </Button>
          {closeState.error ? (
            <p className="text-sm text-destructive">{closeState.error}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function MvpLineupBoard({
  topLabel,
  topFormation,
  topPlayers,
  topBenchPlayers,
  bottomLabel,
  bottomFormation,
  bottomPlayers,
  bottomBenchPlayers,
  selectedCandidateId,
  voteCountsByCandidate,
  showVoteCounts,
  clickable,
  onSelect,
}: {
  topLabel: string;
  topFormation: string;
  topPlayers: CandidateLineupPlayer[];
  topBenchPlayers: CandidateLineupPlayer[];
  bottomLabel?: string;
  bottomFormation?: string;
  bottomPlayers?: CandidateLineupPlayer[];
  bottomBenchPlayers?: CandidateLineupPlayer[];
  selectedCandidateId: string;
  voteCountsByCandidate: Map<string, number>;
  showVoteCounts: boolean;
  clickable: boolean;
  onSelect: (candidateUserId: string) => void;
}) {
  const hasBottom = Boolean(bottomLabel && bottomPlayers);
  const hasBenchSection = topBenchPlayers.length > 0 || (bottomBenchPlayers?.length ?? 0) > 0;
  const topRows = buildLineupRows(topPlayers);
  const bottomRows = buildLineupRows(bottomPlayers ?? []);

  return (
    <Card className="gap-0 overflow-hidden border border-line/80 bg-surface p-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Lineup vote MVP</h3>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-muted">
          <span>{topLabel}: {topFormation}</span>
          {hasBottom && bottomFormation ? <span>{bottomLabel}: {bottomFormation}</span> : null}
        </div>
      </div>

      {hasBottom ? (
        <div className="border-b border-line bg-surface-muted/25 px-3 py-2">
          <MvpBenchStrip
            label={`${topLabel} dự bị`}
            players={topBenchPlayers}
            selectedCandidateId={selectedCandidateId}
            voteCountsByCandidate={voteCountsByCandidate}
            showVoteCounts={showVoteCounts}
            clickable={clickable}
            onSelect={onSelect}
          />
        </div>
      ) : null}

      <div className="relative h-[624px] overflow-hidden bg-gradient-to-b from-brand-soft/10 to-surface">
        <div className="absolute inset-x-3 inset-y-3 rounded-xl border border-line/70" />
        <div className="absolute inset-x-3 top-1/2 border-t border-line/70" />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/60" />
        <div className="absolute top-3 left-1/2 h-8 w-28 -translate-x-1/2 border border-line/60 border-t-0" />
        <div className="absolute bottom-3 left-1/2 h-8 w-28 -translate-x-1/2 border border-line/60 border-b-0" />

        <div className={cn("absolute inset-x-5", hasBottom ? "top-8 h-[22%]" : "top-10 h-[84%]")}>
          <MvpLineupRows
            rows={topRows}
            selectedCandidateId={selectedCandidateId}
            voteCountsByCandidate={voteCountsByCandidate}
            showVoteCounts={showVoteCounts}
            clickable={clickable}
            onSelect={onSelect}
          />
        </div>

        {hasBottom ? (
          <div className="absolute inset-x-5 bottom-[9rem] h-[22%]">
            <MvpLineupRows
              rows={bottomRows}
              reverse
              selectedCandidateId={selectedCandidateId}
              voteCountsByCandidate={voteCountsByCandidate}
              showVoteCounts={showVoteCounts}
              clickable={clickable}
              onSelect={onSelect}
            />
          </div>
        ) : null}
      </div>

      {hasBottom ? (
        <div className="border-t border-line bg-surface-muted/25 px-3 py-2">
          <MvpBenchStrip
            label={`${bottomLabel} dự bị`}
            players={bottomBenchPlayers ?? []}
            selectedCandidateId={selectedCandidateId}
            voteCountsByCandidate={voteCountsByCandidate}
            showVoteCounts={showVoteCounts}
            clickable={clickable}
            onSelect={onSelect}
          />
        </div>
      ) : hasBenchSection ? (
        <div className="border-t border-line bg-surface-muted/25 px-3 py-2">
          <MvpBenchStrip
            label="Dự bị"
            players={topBenchPlayers}
            selectedCandidateId={selectedCandidateId}
            voteCountsByCandidate={voteCountsByCandidate}
            showVoteCounts={showVoteCounts}
            clickable={clickable}
            onSelect={onSelect}
          />
        </div>
      ) : null}
    </Card>
  );
}

function MvpLineupRows({
  rows,
  reverse = false,
  selectedCandidateId,
  voteCountsByCandidate,
  showVoteCounts,
  clickable,
  onSelect,
}: {
  rows: CandidateLineupPlayer[][];
  reverse?: boolean;
  selectedCandidateId: string;
  voteCountsByCandidate: Map<string, number>;
  showVoteCounts: boolean;
  clickable: boolean;
  onSelect: (candidateUserId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-medium text-ink-subtle">
        Chưa có cầu thủ
      </div>
    );
  }

  const displayRows = reverse ? [...rows].reverse() : rows;

  return (
    <div className="flex h-full flex-col justify-evenly gap-2">
      {displayRows.map((row, index) => (
        <div
          key={`${index}-${row.map((player) => player.userId).join("-")}`}
          className={cn(
            "flex w-full items-start justify-evenly gap-4",
            !reverse && displayRows.length >= 3 && index === displayRows.length - 1
              ? "mt-3"
              : undefined,
            reverse && displayRows.length >= 3 && index === 0
              ? "mb-3"
              : undefined,
          )}
        >
          {row.map((player) => (
            <MvpLineupPlayerButton
              key={player.userId}
              player={player}
              selected={selectedCandidateId === player.userId}
              votes={voteCountsByCandidate.get(player.userId) ?? 0}
              showVoteCounts={showVoteCounts}
              clickable={clickable}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MvpLineupPlayerButton({
  player,
  selected,
  votes,
  showVoteCounts,
  clickable,
  onSelect,
}: {
  player: CandidateLineupPlayer;
  selected: boolean;
  votes: number;
  showVoteCounts: boolean;
  clickable: boolean;
  onSelect: (candidateUserId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect(player.userId)}
      className={cn(
        "group flex w-[74px] flex-col items-center gap-1 rounded-md p-0.5 text-center transition-colors",
        clickable ? "cursor-pointer hover:bg-surface-muted/70" : "cursor-default",
        selected ? "bg-brand-soft/70 ring-1 ring-brand/50" : undefined,
      )}
    >
      <TeamAvatar
        name={player.name}
        imageUrl={player.avatarUrl}
        size="lg"
        className="h-10 w-10 rounded-xl text-sm"
      />
      <p className="w-full truncate text-[11px] leading-4 font-semibold text-ink">
        {player.jerseyNumber != null ? `${player.jerseyNumber} ` : ""}
        {player.name}
      </p>
      {showVoteCounts ? (
        <span className="text-[10px] leading-3 text-ink-subtle">{votes} phiếu</span>
      ) : null}
    </button>
  );
}

function MvpBenchStrip({
  label,
  players,
  selectedCandidateId,
  voteCountsByCandidate,
  showVoteCounts,
  clickable,
  onSelect,
}: {
  label: string;
  players: CandidateLineupPlayer[];
  selectedCandidateId: string;
  voteCountsByCandidate: Map<string, number>;
  showVoteCounts: boolean;
  clickable: boolean;
  onSelect: (candidateUserId: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label} ({players.length})
      </p>
      {players.length === 0 ? (
        <p className="text-xs text-ink-subtle">Không có dự bị.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <ul className="flex min-w-max gap-2">
            {players.map((player) => {
              const selected = selectedCandidateId === player.userId;
              return (
                <li key={player.userId}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(player.userId)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 transition-colors",
                      clickable ? "cursor-pointer hover:bg-surface-muted" : "cursor-default",
                      selected ? "border-brand/50 bg-brand-soft/60 text-brand" : undefined,
                    )}
                  >
                    <TeamAvatar
                      name={player.name}
                      imageUrl={player.avatarUrl}
                      size="sm"
                      className="h-7 w-7 text-xs"
                    />
                    <span className="max-w-[86px] truncate text-xs font-semibold text-ink">
                      {player.jerseyNumber != null ? `${player.jerseyNumber} ` : ""}
                      {player.name}
                    </span>
                    {showVoteCounts ? (
                      <span className="text-[10px] text-ink-subtle">
                        {voteCountsByCandidate.get(player.userId) ?? 0}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function applyLineupOrder(players: CandidateLineupPlayer[], order: string[]): CandidateLineupPlayer[] {
  if (players.length === 0) return [];

  const playerById = new Map(players.map((player) => [player.userId, player]));
  const orderedPlayers: CandidateLineupPlayer[] = [];
  const takenIds = new Set<string>();

  for (const userId of order) {
    const player = playerById.get(userId);
    if (!player || takenIds.has(userId)) continue;
    orderedPlayers.push(player);
    takenIds.add(userId);
  }

  for (const player of players) {
    if (takenIds.has(player.userId)) continue;
    orderedPlayers.push(player);
  }

  return orderedPlayers;
}

function readLineupOrderFromStorage(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === "string");
  } catch {
    return [];
  }
}

function compareLineupPlayer(a: CandidateLineupPlayer, b: CandidateLineupPlayer) {
  if (a.jerseyNumber != null && b.jerseyNumber != null) {
    return a.jerseyNumber - b.jerseyNumber;
  }
  if (a.jerseyNumber != null) return -1;
  if (b.jerseyNumber != null) return 1;
  return a.name.localeCompare(b.name);
}

function getLineupSizeLimit(fieldType: FieldType): number {
  if (fieldType === "F5") return 5;
  if (fieldType === "F7") return 7;
  return 11;
}

function buildLineupRows(players: CandidateLineupPlayer[]): CandidateLineupPlayer[][] {
  if (players.length === 0) return [];
  if (players.length === 1) return [[players[0]]];
  if (players.length === 2) return [[players[0]], [players[1]]];

  const [goalkeeper, ...outfield] = players;
  const outfieldRowCount = outfield.length <= 3
    ? 1
    : outfield.length <= 6
      ? 2
      : outfield.length <= 9
        ? 3
        : 4;

  const baseRowSize = Math.floor(outfield.length / outfieldRowCount);
  const extraPlayers = outfield.length % outfieldRowCount;
  const rows: CandidateLineupPlayer[][] = [[goalkeeper]];
  let cursor = 0;

  for (let i = 0; i < outfieldRowCount; i += 1) {
    const rowSize = baseRowSize + (i < extraPlayers ? 1 : 0);
    rows.push(outfield.slice(cursor, cursor + rowSize));
    cursor += rowSize;
  }

  return rows;
}

function formatFormation(rows: CandidateLineupPlayer[][]): string {
  if (rows.length === 0) return "—";
  const outfieldRows = rows.length > 1 && rows[0]?.length === 1 ? rows.slice(1) : rows;
  return outfieldRows.map((row) => row.length).join("-");
}
