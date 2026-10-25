"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FieldType, InternalSquadSide } from "@/generated/prisma/enums";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import { RemoveMatchSquadMemberButton } from "./remove-match-squad-member-button";
import { RandomizeInternalSquadButton } from "./randomize-internal-squad-button";
import { AddMatchSquadMemberButton } from "./add-match-squad-member-button";
import {
  setInternalMatchSquadSide,
  swapInternalMatchSquadSides,
} from "../actions";

type MatchSquadMemberRow = {
  userId: string;
  name: string;
  isGuest: boolean;
  internalSide: InternalSquadSide | null;
};

type MatchSquadTeamMemberRow = {
  userId: string;
  name: string;
  jerseyNumber: number | null;
  hometown: string | null;
  avatarUrl: string | null;
};

type LineupPlayer = {
  userId: string;
  name: string;
  jerseyNumber: number | null;
  avatarUrl: string | null;
};

type LineupSide = "top" | "bottom";
type DraggingLineupSlot = {
  side: LineupSide;
  index: number;
  starterSlotIndex: number | null;
};

type MoveAcrossSidesInput = {
  movedUserId: string;
  targetSide: LineupSide;
  swapWithUserId?: string;
};

const LINEUP_ORDER_UPDATED_EVENT = "match-lineup-order-updated";

export function MatchSquadPanel({
  matchId,
  isInternal,
  fieldType,
  canManage,
  members,
  teamMembers,
}: {
  matchId: string;
  isInternal: boolean;
  fieldType: FieldType;
  canManage: boolean;
  members: MatchSquadMemberRow[];
  teamMembers: MatchSquadTeamMemberRow[];
}) {
  const router = useRouter();
  const [isSwitchingSides, startSwitchSidesTransition] = useTransition();
  const [switchSidesError, setSwitchSidesError] = useState<string | undefined>();
  const [participantsCollapsed, setParticipantsCollapsed] = useState(true);
  const teamMemberByUserId = useMemo(
    () => new Map(teamMembers.map((member) => [member.userId, member])),
    [teamMembers],
  );
  const lineupSizeLimit = useMemo(() => getLineupSizeLimit(fieldType), [fieldType]);

  const participantMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );
  const sideA = useMemo(
    () => members.filter((member) => member.internalSide === "SIDE_A"),
    [members],
  );
  const sideB = useMemo(
    () => members.filter((member) => member.internalSide === "SIDE_B"),
    [members],
  );
  const sideAPlayers = useMemo(
    () => toLineupPlayers(sideA, teamMemberByUserId),
    [sideA, teamMemberByUserId],
  );
  const sideBPlayers = useMemo(
    () => toLineupPlayers(sideB, teamMemberByUserId),
    [sideB, teamMemberByUserId],
  );
  const nonInternalPlayers = useMemo(
    () => toLineupPlayers(members, teamMemberByUserId),
    [members, teamMemberByUserId],
  );
  const addableMembers = useMemo(() => {
    const participantUserIdSet = new Set(members.map((member) => member.userId));
    return teamMembers
      .filter((member) => !participantUserIdSet.has(member.userId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, teamMembers]);

  function handleMoveAcrossLineupSides(input: MoveAcrossSidesInput) {
    const targetInternalSide = input.targetSide === "top" ? "SIDE_A" : "SIDE_B";
    setSwitchSidesError(undefined);
    startSwitchSidesTransition(async () => {
      const result = input.swapWithUserId
        ? await swapInternalMatchSquadSides(matchId, input.movedUserId, input.swapWithUserId)
        : await setInternalMatchSquadSide(matchId, input.movedUserId, targetInternalSide);
      if (!result.ok) {
        setSwitchSidesError(result.error ?? "Không cập nhật được bên thi đấu.");
        return;
      }
      router.refresh();
    });
  }

  if (isInternal) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="gap-0 p-0">
          <div
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-center justify-between gap-2 border-b border-line px-4 py-2.5"
            aria-expanded={!participantsCollapsed}
            aria-controls="match-participants-panel"
            onClick={() => setParticipantsCollapsed((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setParticipantsCollapsed((prev) => !prev);
            }}
          >
            <div className="flex items-center gap-1.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "text-ink-subtle transition-transform",
                  participantsCollapsed ? "-rotate-90" : "rotate-0",
                )}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <span className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                Cầu thủ tham gia trận
              </span>
              <span className="text-xs text-ink-subtle">
                ({participantMembers.length})
              </span>
            </div>
            {canManage
              ? (
                <div
                  className="flex items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <AddMatchSquadMemberButton matchId={matchId} options={addableMembers} />
                </div>
              )
              : null}
          </div>
          {!participantsCollapsed ? (
            <div id="match-participants-panel">
              <div className="px-4 py-2">
                <p className="text-xs text-ink-subtle">
                  Chọn danh sách tham gia trước, sau đó random để chia 2 bên A/B.
                </p>
              </div>
              {participantMembers.length === 0 ? (
                <div className="px-4 pb-4">
                  <p className="text-sm text-ink-muted">Chưa có cầu thủ tham gia trận.</p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {participantMembers.map((member) => (
                    <li key={member.userId} className="flex items-start gap-3 px-4 py-2.5">
                      <SquadMemberIdentity
                        name={member.name}
                        profile={teamMemberByUserId.get(member.userId)}
                      />
                      <div className="flex shrink-0 items-center gap-1 pt-0.5">
                        <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">
                          {member.internalSide === "SIDE_A"
                            ? "Bên A"
                            : member.internalSide === "SIDE_B"
                              ? "Bên B"
                              : "Chưa chia"}
                        </span>
                        {canManage ? (
                          <RemoveMatchSquadMemberButton
                            matchId={matchId}
                            userId={member.userId}
                            memberName={member.name}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </Card>

        {canManage ? (
          <div className="flex justify-center">
            <RandomizeInternalSquadButton
              matchId={matchId}
              disabled={participantMembers.length < 2}
            />
          </div>
        ) : null}

        <LineupPreviewCard
          title="Lineup mô phỏng"
          topLabel="Bên A"
          topPlayers={sideAPlayers}
          bottomLabel="Bên B"
          bottomPlayers={sideBPlayers}
          startersLimit={lineupSizeLimit}
          canManage={canManage}
          storageScope={`${matchId}:internal`}
          sideMovePending={isSwitchingSides}
          sideMoveError={switchSidesError}
          onMoveAcrossSides={handleMoveAcrossLineupSides}
        />

        {switchSidesError ? <p className="text-xs text-destructive">{switchSidesError}</p> : null}
      </div>
    );
  }

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          Đội hình ra sân
        </h2>
        {canManage ? (
          <AddMatchSquadMemberButton matchId={matchId} options={addableMembers} />
        ) : null}
      </div>
      <div className="border-b border-line px-3 py-3">
        <LineupPreviewCard
          title="Lineup mô phỏng"
          topLabel="Đội của bạn"
          topPlayers={nonInternalPlayers}
          startersLimit={lineupSizeLimit}
          canManage={canManage}
          storageScope={`${matchId}:single`}
          sideMovePending={false}
          sideMoveError={undefined}
        />
      </div>
      {members.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-sm text-ink-muted">Chưa có cầu thủ trong đội hình trận.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {members.map((member) => (
            <li key={member.userId} className="flex items-start gap-3 px-4 py-2.5">
              <SquadMemberIdentity
                name={member.name}
                profile={teamMemberByUserId.get(member.userId)}
              />
              {canManage ? (
                <div className="shrink-0 pt-0.5">
                  <RemoveMatchSquadMemberButton
                    matchId={matchId}
                    userId={member.userId}
                    memberName={member.name}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SquadMemberIdentity({
  name,
  profile,
}: {
  name: string;
  profile: MatchSquadTeamMemberRow | undefined;
}) {
  const jerseyText = profile?.jerseyNumber != null ? String(profile.jerseyNumber) : "";
  const hometownText = profile?.hometown?.trim() ?? "";
  const hasMeta = jerseyText.length > 0 || hometownText.length > 0;

  return (
    <>
      <TeamAvatar
        name={name}
        imageUrl={profile?.avatarUrl}
        size="lg"
        className="h-12 w-12 rounded-2xl text-lg"
      />
      <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-sm leading-5 font-bold text-ink">{name}</p>
        {hasMeta ? (
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-4 font-medium text-ink-muted">
            {jerseyText ? <span className="shrink-0">{jerseyText}</span> : null}
            {jerseyText && hometownText ? (
              <span aria-hidden="true" className="shrink-0">•</span>
            ) : null}
            {hometownText ? <span className="min-w-0 truncate">{hometownText}</span> : null}
          </p>
        ) : null}
      </div>
    </>
  );
}

function LineupPreviewCard({
  title,
  topLabel,
  topPlayers,
  bottomLabel,
  bottomPlayers,
  startersLimit,
  canManage,
  storageScope,
  sideMovePending,
  sideMoveError,
  onMoveAcrossSides,
}: {
  title: string;
  topLabel: string;
  topPlayers: LineupPlayer[];
  bottomLabel?: string;
  bottomPlayers?: LineupPlayer[];
  startersLimit: number;
  canManage: boolean;
  storageScope: string;
  sideMovePending: boolean;
  sideMoveError?: string;
  onMoveAcrossSides?: (input: MoveAcrossSidesInput) => void;
}) {
  const canDrag = canManage && !sideMovePending;
  const hasBottom = Boolean(bottomLabel && bottomPlayers);
  const topOrderStorageKey = `match-lineup-order:${storageScope}:top`;
  const bottomOrderStorageKey = `match-lineup-order:${storageScope}:bottom`;
  const [topOrder, setTopOrder] = useState<string[]>(() =>
    typeof window === "undefined" || !canManage
      ? []
      : readLineupOrderFromStorage(topOrderStorageKey));
  const [bottomOrder, setBottomOrder] = useState<string[]>(() =>
    typeof window === "undefined" || !canManage
      ? []
      : readLineupOrderFromStorage(bottomOrderStorageKey));
  const [topEmptyStarterSlots, setTopEmptyStarterSlots] = useState<number[]>([]);
  const [bottomEmptyStarterSlots, setBottomEmptyStarterSlots] = useState<number[]>([]);
  const [draggingSlot, setDraggingSlot] = useState<DraggingLineupSlot | null>(null);
  const [optimisticTopOrderedPlayers, setOptimisticTopOrderedPlayers] = useState<LineupPlayer[] | null>(null);
  const [optimisticBottomOrderedPlayers, setOptimisticBottomOrderedPlayers] = useState<LineupPlayer[] | null>(null);

  const bottomPlayerPool = useMemo(() => bottomPlayers ?? [], [bottomPlayers]);
  const baseTopOrderedPlayers = useMemo(
    () => applyLineupOrder(topPlayers, topOrder),
    [topOrder, topPlayers],
  );
  const baseBottomOrderedPlayers = useMemo(
    () => applyLineupOrder(bottomPlayerPool, bottomOrder),
    [bottomOrder, bottomPlayerPool],
  );
  const topPoolUserIds = useMemo(
    () => new Set(topPlayers.map((player) => player.userId)),
    [topPlayers],
  );
  const bottomPoolUserIds = useMemo(
    () => new Set(bottomPlayerPool.map((player) => player.userId)),
    [bottomPlayerPool],
  );
  const hasCrossSideOrderMismatch = hasBottom
    && (
      topOrder.some((userId) => !topPoolUserIds.has(userId))
      || bottomOrder.some((userId) => !bottomPoolUserIds.has(userId))
    );
  const useOptimisticCrossSide = Boolean(
    hasBottom
      && !sideMoveError
      && optimisticTopOrderedPlayers
      && optimisticBottomOrderedPlayers
      && hasCrossSideOrderMismatch,
  );
  const topOrderedPlayers: LineupPlayer[] = useOptimisticCrossSide
    ? (optimisticTopOrderedPlayers ?? baseTopOrderedPlayers)
    : baseTopOrderedPlayers;
  const bottomOrderedPlayers: LineupPlayer[] = useOptimisticCrossSide
    ? (optimisticBottomOrderedPlayers ?? baseBottomOrderedPlayers)
    : baseBottomOrderedPlayers;

  useEffect(() => {
    if (!canManage) return;
    localStorage.setItem(
      topOrderStorageKey,
      JSON.stringify(normalizeLineupOrder(topOrder, topOrderedPlayers)),
    );
    window.dispatchEvent(
      new CustomEvent<{ storageScope: string }>(LINEUP_ORDER_UPDATED_EVENT, {
        detail: { storageScope },
      }),
    );
  }, [canManage, storageScope, topOrder, topOrderStorageKey, topOrderedPlayers]);

  useEffect(() => {
    if (!canManage) return;
    if (!hasBottom) {
      localStorage.removeItem(bottomOrderStorageKey);
      window.dispatchEvent(
        new CustomEvent<{ storageScope: string }>(LINEUP_ORDER_UPDATED_EVENT, {
          detail: { storageScope },
        }),
      );
      return;
    }
    localStorage.setItem(
      bottomOrderStorageKey,
      JSON.stringify(normalizeLineupOrder(bottomOrder, bottomOrderedPlayers)),
    );
    window.dispatchEvent(
      new CustomEvent<{ storageScope: string }>(LINEUP_ORDER_UPDATED_EVENT, {
        detail: { storageScope },
      }),
    );
  }, [
    bottomOrder,
    bottomOrderStorageKey,
    bottomOrderedPlayers,
    canManage,
    hasBottom,
    storageScope,
  ]);

  const normalizedTopEmptyStarterSlots = useMemo(
    () => normalizeStarterSlotIndexes(topEmptyStarterSlots, startersLimit),
    [startersLimit, topEmptyStarterSlots],
  );
  const normalizedBottomEmptyStarterSlots = useMemo(
    () => normalizeStarterSlotIndexes(bottomEmptyStarterSlots, startersLimit),
    [bottomEmptyStarterSlots, startersLimit],
  );
  const topStarterSlotCount = Math.min(
    startersLimit,
    topOrderedPlayers.length + normalizedTopEmptyStarterSlots.length,
  );
  const bottomStarterSlotCount = Math.min(
    startersLimit,
    bottomOrderedPlayers.length + normalizedBottomEmptyStarterSlots.length,
  );
  const topLayout = useMemo(
    () => buildStarterLayout(topOrderedPlayers, topStarterSlotCount, normalizedTopEmptyStarterSlots),
    [normalizedTopEmptyStarterSlots, topOrderedPlayers, topStarterSlotCount],
  );
  const bottomLayout = useMemo(
    () => buildStarterLayout(bottomOrderedPlayers, bottomStarterSlotCount, normalizedBottomEmptyStarterSlots),
    [bottomOrderedPlayers, bottomStarterSlotCount, normalizedBottomEmptyStarterSlots],
  );

  const topRows = buildLineupRows(topLayout.starterSlots);
  const bottomRows = buildLineupRows(bottomLayout.starterSlots);
  const topBench = topLayout.benchPlayers;
  const bottomBench = bottomLayout.benchPlayers;
  const topFormation = formatFormation(topRows);
  const bottomFormation = hasBottom ? formatFormation(bottomRows) : null;
  const hasBenchSection = topBench.length > 0 || bottomBench.length > 0;

  function persistOrders(nextTopOrder: string[], nextBottomOrder: string[]) {
    setTopOrder(nextTopOrder);
    setBottomOrder(nextBottomOrder);
    if (!canManage) return;
    localStorage.setItem(topOrderStorageKey, JSON.stringify(nextTopOrder));
    if (hasBottom) {
      localStorage.setItem(bottomOrderStorageKey, JSON.stringify(nextBottomOrder));
      window.dispatchEvent(
        new CustomEvent<{ storageScope: string }>(LINEUP_ORDER_UPDATED_EVENT, {
          detail: { storageScope },
        }),
      );
      return;
    }
    localStorage.removeItem(bottomOrderStorageKey);
    window.dispatchEvent(
      new CustomEvent<{ storageScope: string }>(LINEUP_ORDER_UPDATED_EVENT, {
        detail: { storageScope },
      }),
    );
  }

  function handleDropOnSlot(
    side: LineupSide,
    targetIndex: number,
    targetStarterSlotIndex?: number,
    isTargetEmptyStarter?: boolean,
  ) {
    if (!canDrag || !draggingSlot) return;
    if (draggingSlot.side === side) {
      setOptimisticTopOrderedPlayers(null);
      setOptimisticBottomOrderedPlayers(null);
      const sidePlayers = side === "top" ? topOrderedPlayers : bottomOrderedPlayers;
      const isDropToBenchEnd = targetIndex === sidePlayers.length;
      const sideStarterSlotCount = side === "top" ? topStarterSlotCount : bottomStarterSlotCount;
      const sourceEmptySlots = side === "top"
        ? normalizedTopEmptyStarterSlots
        : normalizedBottomEmptyStarterSlots;

      if (isDropToBenchEnd || (isTargetEmptyStarter && targetStarterSlotIndex != null)) {
        const reordered = moveLineupPlayer(sidePlayers, draggingSlot.index, targetIndex);
        const nextEmptySlots = new Set(sourceEmptySlots);
        if (isTargetEmptyStarter && targetStarterSlotIndex != null) {
          nextEmptySlots.delete(targetStarterSlotIndex);
        }
        if (draggingSlot.starterSlotIndex != null && draggingSlot.starterSlotIndex < sideStarterSlotCount) {
          nextEmptySlots.add(draggingSlot.starterSlotIndex);
        }
        const normalizedNextEmptySlots = normalizeStarterSlotIndexes(
          [...nextEmptySlots],
          sideStarterSlotCount,
        );
        if (side === "top") {
          setTopEmptyStarterSlots(normalizedNextEmptySlots);
          persistOrders(
            lineupOrderFromPlayers(reordered),
            lineupOrderFromPlayers(bottomOrderedPlayers),
          );
        } else {
          setBottomEmptyStarterSlots(normalizedNextEmptySlots);
          persistOrders(
            lineupOrderFromPlayers(topOrderedPlayers),
            lineupOrderFromPlayers(reordered),
          );
        }
        setDraggingSlot(null);
        return;
      }

      if (side === "top") {
        const reordered = swapLineupPlayers(topOrderedPlayers, draggingSlot.index, targetIndex);
        persistOrders(
          lineupOrderFromPlayers(reordered),
          lineupOrderFromPlayers(bottomOrderedPlayers),
        );
      } else {
        const reordered = swapLineupPlayers(bottomOrderedPlayers, draggingSlot.index, targetIndex);
        persistOrders(
          lineupOrderFromPlayers(topOrderedPlayers),
          lineupOrderFromPlayers(reordered),
        );
      }
      setDraggingSlot(null);
      return;
    }

    if (!hasBottom || !onMoveAcrossSides) return;
    const sourcePlayers = draggingSlot.side === "top" ? topOrderedPlayers : bottomOrderedPlayers;
    const targetPlayers = side === "top" ? topOrderedPlayers : bottomOrderedPlayers;
    const movedPlayer = sourcePlayers[draggingSlot.index];
    if (!movedPlayer) return;
    const targetPlayer = targetPlayers[targetIndex];

    const sourceWithoutPlayer = sourcePlayers.filter((_, index) => index !== draggingSlot.index);
    const nextTargetPlayers = [...targetPlayers];
    if (targetPlayer) {
      const nextSourcePlayers = [...sourcePlayers];
      nextSourcePlayers[draggingSlot.index] = targetPlayer;
      nextTargetPlayers[targetIndex] = movedPlayer;
      if (draggingSlot.side === "top") {
        setOptimisticTopOrderedPlayers(nextSourcePlayers);
        setOptimisticBottomOrderedPlayers(nextTargetPlayers);
        persistOrders(
          lineupOrderFromPlayers(nextSourcePlayers),
          lineupOrderFromPlayers(nextTargetPlayers),
        );
      } else {
        setOptimisticTopOrderedPlayers(nextTargetPlayers);
        setOptimisticBottomOrderedPlayers(nextSourcePlayers);
        persistOrders(
          lineupOrderFromPlayers(nextTargetPlayers),
          lineupOrderFromPlayers(nextSourcePlayers),
        );
      }
      onMoveAcrossSides({
        movedUserId: movedPlayer.userId,
        targetSide: side,
        swapWithUserId: targetPlayer.userId,
      });
    } else {
      const boundedTargetIndex = Math.max(0, Math.min(targetIndex, nextTargetPlayers.length));
      nextTargetPlayers.splice(boundedTargetIndex, 0, movedPlayer);
      if (draggingSlot.side === "top") {
        setOptimisticTopOrderedPlayers(sourceWithoutPlayer);
        setOptimisticBottomOrderedPlayers(nextTargetPlayers);
        persistOrders(
          lineupOrderFromPlayers(sourceWithoutPlayer),
          lineupOrderFromPlayers(nextTargetPlayers),
        );
      } else {
        setOptimisticTopOrderedPlayers(nextTargetPlayers);
        setOptimisticBottomOrderedPlayers(sourceWithoutPlayer);
        persistOrders(
          lineupOrderFromPlayers(nextTargetPlayers),
          lineupOrderFromPlayers(sourceWithoutPlayer),
        );
      }
      onMoveAcrossSides({
        movedUserId: movedPlayer.userId,
        targetSide: side,
      });
    }
    setDraggingSlot(null);
  }

  return (
    <Card className="gap-0 overflow-hidden border border-line/80 bg-surface p-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-muted">
          <span>{topLabel}: {topFormation}</span>
          {hasBottom && bottomFormation ? <span>{bottomLabel}: {bottomFormation}</span> : null}
        </div>
      </div>

      {hasBottom ? (
        <div className="border-b border-line bg-surface-muted/25 px-3 py-2">
          <BenchStrip
            label={`${topLabel} dự bị`}
            side="top"
            players={topBench}
            benchStartIndex={topLayout.benchStartIndex}
            canManage={canManage}
            draggingSlot={draggingSlot}
            onDragStart={(side, index, starterSlotIndex) =>
              setDraggingSlot({ side, index, starterSlotIndex })}
            onDragEnd={() => setDraggingSlot(null)}
            onDropOnSlot={handleDropOnSlot}
            onDropToBenchEnd={(side) =>
              handleDropOnSlot(side, side === "top" ? topOrderedPlayers.length : bottomOrderedPlayers.length)}
          />
        </div>
      ) : null}

      <div className="relative h-[460px] overflow-hidden bg-gradient-to-b from-brand-soft/10 to-surface sm:h-[512px]">
        <div className="absolute inset-x-3 inset-y-3 rounded-xl border border-line/70" />
        <div className="absolute inset-x-3 top-1/2 border-t border-line/70" />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/60" />
        <div className="absolute top-3 left-1/2 h-8 w-28 -translate-x-1/2 border border-line/60 border-t-0" />
        <div className="absolute bottom-3 left-1/2 h-8 w-28 -translate-x-1/2 border border-line/60 border-b-0" />

        <div className={cn("absolute inset-x-5", hasBottom ? "top-7 h-[22%] sm:top-8" : "top-9 h-[84%] sm:top-10")}>
          <LineupRows
            rows={topRows}
            side="top"
            canManage={canDrag}
            draggingSlot={draggingSlot}
            onDragStart={(side, index, starterSlotIndex) =>
              setDraggingSlot({ side, index, starterSlotIndex })}
            onDragEnd={() => setDraggingSlot(null)}
            onDropOnSlot={handleDropOnSlot}
            emptyText="Chưa có cầu thủ"
          />
        </div>

        {hasBottom ? (
          <div className="absolute inset-x-5 bottom-[5.75rem] h-[22%] sm:bottom-[6.75rem]">
            <LineupRows
              rows={bottomRows}
              side="bottom"
              reverse
              canManage={canDrag}
              draggingSlot={draggingSlot}
              onDragStart={(side, index, starterSlotIndex) =>
                setDraggingSlot({ side, index, starterSlotIndex })}
              onDragEnd={() => setDraggingSlot(null)}
              onDropOnSlot={handleDropOnSlot}
              emptyText="Chưa có cầu thủ"
            />
          </div>
        ) : null}
      </div>

      {hasBottom ? (
        <div className="border-t border-line bg-surface-muted/25 px-3 py-2">
          <BenchStrip
            label={`${bottomLabel} dự bị`}
            side="bottom"
            players={bottomBench}
            benchStartIndex={bottomLayout.benchStartIndex}
            canManage={canDrag}
            draggingSlot={draggingSlot}
            onDragStart={(side, index, starterSlotIndex) =>
              setDraggingSlot({ side, index, starterSlotIndex })}
            onDragEnd={() => setDraggingSlot(null)}
            onDropOnSlot={handleDropOnSlot}
            onDropToBenchEnd={(side) =>
              handleDropOnSlot(side, side === "top" ? topOrderedPlayers.length : bottomOrderedPlayers.length)}
          />
        </div>
      ) : hasBenchSection ? (
        <div className="border-t border-line bg-surface-muted/25 px-3 py-2">
          <BenchStrip
            label="Dự bị"
            side="top"
            players={topBench}
            benchStartIndex={topLayout.benchStartIndex}
            canManage={canDrag}
            draggingSlot={draggingSlot}
            onDragStart={(side, index, starterSlotIndex) =>
              setDraggingSlot({ side, index, starterSlotIndex })}
            onDragEnd={() => setDraggingSlot(null)}
            onDropOnSlot={handleDropOnSlot}
            onDropToBenchEnd={(side) =>
              handleDropOnSlot(side, side === "top" ? topOrderedPlayers.length : bottomOrderedPlayers.length)}
          />
        </div>
      ) : null}
    </Card>
  );
}

function LineupRows({
  rows,
  side,
  reverse = false,
  canManage,
  draggingSlot,
  onDragStart,
  onDragEnd,
  onDropOnSlot,
  emptyText,
}: {
  rows: LineupSlot[][];
  side: LineupSide;
  reverse?: boolean;
  canManage: boolean;
  draggingSlot: DraggingLineupSlot | null;
  onDragStart: (side: LineupSide, index: number, starterSlotIndex: number | null) => void;
  onDragEnd: () => void;
  onDropOnSlot: (
    side: LineupSide,
    index: number,
    targetStarterSlotIndex?: number,
    isTargetEmptyStarter?: boolean,
  ) => void;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-medium text-ink-subtle">
        {emptyText}
      </div>
    );
  }

  const displayRows = reverse ? [...rows].reverse() : rows;

  return (
    <div className="flex h-full flex-col justify-evenly gap-1.5 sm:gap-2">
      {displayRows.map((row, index) => (
        <div
          key={`${index}-${row.map((slot) => slot.player?.userId ?? `empty-${slot.starterSlotIndex}`).join("-")}`}
          className={cn(
            "flex w-full items-start justify-evenly gap-3 sm:gap-4",
            !reverse && displayRows.length >= 3 && index === displayRows.length - 1
              ? "mt-3"
              : undefined,
            reverse && displayRows.length >= 3 && index === 0
              ? "mb-3"
              : undefined,
          )}
        >
          {row.map((slot) => (
            slot.player ? (
              <div
                key={slot.player.userId}
                draggable={canManage}
                onDragStart={() => onDragStart(side, slot.index, slot.starterSlotIndex)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                  onDropOnSlot(side, slot.index, slot.starterSlotIndex, false);
                }}
                className={cn(
                  canManage ? "cursor-grab active:cursor-grabbing" : undefined,
                  draggingSlot?.side === side && draggingSlot.index === slot.index
                    ? "opacity-55"
                    : undefined,
                )}
              >
                <LineupPlayerChip player={slot.player} />
              </div>
            ) : (
              <div
                key={`empty-${slot.starterSlotIndex}`}
                onDragOver={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                  onDropOnSlot(side, slot.index, slot.starterSlotIndex, true);
                }}
                className="flex h-[56px] w-[68px] items-center justify-center rounded-xl border border-dashed border-line bg-surface/75 text-[9px] font-semibold text-ink-subtle sm:h-[62px] sm:w-[74px] sm:text-[10px]"
              >
                Vị trí trống
              </div>
            )
          ))}
        </div>
      ))}
    </div>
  );
}

function LineupPlayerChip({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex w-[68px] flex-col items-center gap-0.5 text-center sm:w-[74px] sm:gap-1">
      <TeamAvatar
        name={player.name}
        imageUrl={player.avatarUrl}
        size="lg"
        className="h-9 w-9 rounded-xl text-sm sm:h-10 sm:w-10"
      />
      <p className="w-full truncate text-[10px] leading-[14px] font-semibold text-ink sm:text-[11px] sm:leading-4">
        {player.jerseyNumber != null ? `${player.jerseyNumber} ` : ""}
        {player.name}
      </p>
    </div>
  );
}

function BenchStrip({
  label,
  side,
  players,
  benchStartIndex,
  canManage,
  draggingSlot,
  onDragStart,
  onDragEnd,
  onDropOnSlot,
  onDropToBenchEnd,
}: {
  label: string;
  side: LineupSide;
  players: LineupPlayer[];
  benchStartIndex: number;
  canManage: boolean;
  draggingSlot: DraggingLineupSlot | null;
  onDragStart: (side: LineupSide, index: number, starterSlotIndex: number | null) => void;
  onDragEnd: () => void;
  onDropOnSlot: (
    side: LineupSide,
    index: number,
    targetStarterSlotIndex?: number,
    isTargetEmptyStarter?: boolean,
  ) => void;
  onDropToBenchEnd: (side: LineupSide) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label} ({players.length})
      </p>
      {players.length === 0 ? (
        <div
          onDragOver={(event) => {
            if (!canManage || !draggingSlot) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            if (!canManage || !draggingSlot) return;
            event.preventDefault();
            onDropToBenchEnd(side);
          }}
          className={cn(
            "rounded-md border border-dashed border-line px-2 py-2 text-xs text-ink-subtle",
            canManage ? "bg-surface" : undefined,
          )}
        >
          {canManage ? "Kéo cầu thủ vào đây để đưa xuống dự bị." : "Không có dự bị."}
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <ul
            className="flex min-w-max gap-2"
            onDragOver={(event) => {
              if (!canManage || !draggingSlot) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!canManage || !draggingSlot) return;
              event.preventDefault();
              event.stopPropagation();
              onDropToBenchEnd(side);
            }}
          >
            {players.map((player, index) => (
              <li
                key={player.userId}
                draggable={canManage}
                onDragStart={() => onDragStart(side, benchStartIndex + index, null)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!canManage || !draggingSlot) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onDropOnSlot(side, benchStartIndex + index);
                }}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1"
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function toLineupPlayers(
  members: MatchSquadMemberRow[],
  teamMemberByUserId: Map<string, MatchSquadTeamMemberRow>,
): LineupPlayer[] {
  return [...members]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => {
      const profile = teamMemberByUserId.get(member.userId);
      return {
        userId: member.userId,
        name: member.name,
        jerseyNumber: profile?.jerseyNumber ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      };
    })
    .sort((a, b) => {
      if (a.jerseyNumber != null && b.jerseyNumber != null) {
        return a.jerseyNumber - b.jerseyNumber;
      }
      if (a.jerseyNumber != null) return -1;
      if (b.jerseyNumber != null) return 1;
      return a.name.localeCompare(b.name);
    });
}

function getLineupSizeLimit(fieldType: FieldType): number {
  if (fieldType === "F5") return 5;
  if (fieldType === "F7") return 7;
  return 11;
}

type LineupSlot = {
  player: LineupPlayer | null;
  index: number;
  starterSlotIndex: number;
};

type StarterLayout = {
  starterSlots: LineupSlot[];
  benchPlayers: LineupPlayer[];
  benchStartIndex: number;
};

function normalizeStarterSlotIndexes(slotIndexes: number[], startersLimit: number): number[] {
  const valid = slotIndexes.filter((index) => index >= 0 && index < startersLimit);
  return [...new Set(valid)].sort((a, b) => a - b);
}

function buildStarterLayout(
  orderedPlayers: LineupPlayer[],
  startersLimit: number,
  emptyStarterSlots: number[],
): StarterLayout {
  const normalizedEmptySlots = normalizeStarterSlotIndexes(emptyStarterSlots, startersLimit);
  const emptySlotSet = new Set(normalizedEmptySlots);
  const nonEmptyStarterCount = Math.max(0, startersLimit - normalizedEmptySlots.length);
  const starterPlayers = orderedPlayers.slice(0, nonEmptyStarterCount);

  const starterSlots: LineupSlot[] = [];
  let playerCursor = 0;

  for (let slotIndex = 0; slotIndex < startersLimit; slotIndex += 1) {
    const isEmptySlot = emptySlotSet.has(slotIndex);
    if (isEmptySlot) {
      starterSlots.push({
        player: null,
        index: playerCursor,
        starterSlotIndex: slotIndex,
      });
      continue;
    }

    const player = starterPlayers[playerCursor] ?? null;
    starterSlots.push({
      player,
      index: playerCursor,
      starterSlotIndex: slotIndex,
    });
    if (player) {
      playerCursor += 1;
    }
  }

  return {
    starterSlots,
    benchPlayers: orderedPlayers.slice(playerCursor),
    benchStartIndex: playerCursor,
  };
}

function buildLineupRows(starterSlots: LineupSlot[]): LineupSlot[][] {
  if (starterSlots.length === 0) return [];
  if (starterSlots.length === 1) return [[starterSlots[0]]];
  if (starterSlots.length === 2) {
    return [
      [starterSlots[0]],
      [starterSlots[1]],
    ];
  }

  const [goalkeeperSlot, ...outfieldSlots] = starterSlots;
  const outfieldRowCount = outfieldSlots.length <= 3
    ? 1
    : outfieldSlots.length <= 6
      ? 2
      : outfieldSlots.length <= 9
        ? 3
        : 4;

  const baseRowSize = Math.floor(outfieldSlots.length / outfieldRowCount);
  const extraPlayers = outfieldSlots.length % outfieldRowCount;
  const rows: LineupSlot[][] = [[goalkeeperSlot]];
  let cursor = 0;

  for (let i = 0; i < outfieldRowCount; i += 1) {
    const rowSize = baseRowSize + (i < extraPlayers ? 1 : 0);
    const row: LineupSlot[] = [];
    for (let j = 0; j < rowSize; j += 1) {
      const slot = outfieldSlots[cursor];
      if (!slot) break;
      row.push(slot);
      cursor += 1;
    }
    rows.push(row);
  }

  return rows;
}

function formatFormation(rows: LineupSlot[][]): string {
  if (rows.length === 0) return "—";
  const outfieldRows = rows.length > 1 && rows[0]?.length === 1 ? rows.slice(1) : rows;
  return outfieldRows.map((row) => row.length).join("-");
}

function applyLineupOrder(players: LineupPlayer[], order: string[]): LineupPlayer[] {
  if (players.length === 0) return [];
  const playerById = new Map(players.map((player) => [player.userId, player]));
  const orderedPlayers: LineupPlayer[] = [];
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

function normalizeLineupOrder(seed: string[], players: LineupPlayer[]): string[] {
  const orderedPlayers = applyLineupOrder(players, seed);
  return orderedPlayers.map((player) => player.userId);
}

function lineupOrderFromPlayers(players: LineupPlayer[]): string[] {
  return players.map((player) => player.userId);
}

function swapLineupPlayers(
  players: LineupPlayer[],
  fromIndex: number,
  toIndex: number,
): LineupPlayer[] {
  if (fromIndex === toIndex) return players;
  if (fromIndex < 0 || fromIndex >= players.length) return players;
  if (toIndex < 0 || toIndex > players.length) return players;
  if (toIndex === players.length) {
    const nextPlayers = [...players];
    const [movedPlayer] = nextPlayers.splice(fromIndex, 1);
    if (!movedPlayer) return players;
    nextPlayers.push(movedPlayer);
    return nextPlayers;
  }

  const nextPlayers = [...players];
  const fromPlayer = nextPlayers[fromIndex];
  const toPlayer = nextPlayers[toIndex];
  if (!fromPlayer || !toPlayer) return players;
  nextPlayers[fromIndex] = toPlayer;
  nextPlayers[toIndex] = fromPlayer;
  return nextPlayers;
}

function moveLineupPlayer(
  players: LineupPlayer[],
  fromIndex: number,
  toIndex: number,
): LineupPlayer[] {
  if (fromIndex === toIndex) return players;
  if (fromIndex < 0 || fromIndex >= players.length) return players;

  const nextPlayers = [...players];
  const [movedPlayer] = nextPlayers.splice(fromIndex, 1);
  if (!movedPlayer) return players;

  const boundedToIndex = Math.max(0, Math.min(toIndex, nextPlayers.length));
  nextPlayers.splice(boundedToIndex, 0, movedPlayer);
  return nextPlayers;
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
