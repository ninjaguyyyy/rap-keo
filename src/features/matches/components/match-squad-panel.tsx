"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InternalSquadSide } from "@/generated/prisma/enums";
import { RemoveMatchSquadMemberButton } from "./remove-match-squad-member-button";
import { RandomizeInternalSquadButton } from "./randomize-internal-squad-button";
import { AddMatchSquadMemberButton } from "./add-match-squad-member-button";
import { setInternalMatchSquadSide } from "../actions";

type MatchSquadMemberRow = {
  userId: string;
  name: string;
  isGuest: boolean;
  internalSide: InternalSquadSide | null;
};

type InternalPlayingSide = "SIDE_A" | "SIDE_B";

export function MatchSquadPanel({
  matchId,
  isInternal,
  canManage,
  members,
  teamMembers,
}: {
  matchId: string;
  isInternal: boolean;
  canManage: boolean;
  members: MatchSquadMemberRow[];
  teamMembers: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);
  const [participantsCollapsed, setParticipantsCollapsed] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
  const addableMembers = useMemo(() => {
    const participantUserIdSet = new Set(members.map((member) => member.userId));
    return teamMembers
      .filter((member) => !participantUserIdSet.has(member.userId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, teamMembers]);

  function movePlayerToSide(userId: string, nextSide: InternalPlayingSide) {
    setError(undefined);
    startTransition(async () => {
      const result = await setInternalMatchSquadSide(matchId, userId, nextSide);
      if (!result.ok) {
        setError(result.error ?? "Không cập nhật được bên thi đấu.");
        return;
      }
      router.refresh();
    });
  }

  function handleDropToSide(nextSide: InternalPlayingSide) {
    if (!draggingUserId || !canManage || pending) return;
    movePlayerToSide(draggingUserId, nextSide);
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
                    <li key={member.userId} className="flex items-center gap-2 px-4 py-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {member.name}
                      </p>
                      <span className="text-xs text-ink-subtle">
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
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </Card>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {canManage ? (
          <div className="flex justify-center">
            <RandomizeInternalSquadButton
              matchId={matchId}
              disabled={participantMembers.length < 2}
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <InternalSideDropCard
            title="Bên A"
            side="SIDE_A"
            matchId={matchId}
            members={sideA}
            canManage={canManage}
            pending={pending}
            draggingUserId={draggingUserId}
            onDropToSide={handleDropToSide}
            onMoveSide={movePlayerToSide}
            onDragStart={setDraggingUserId}
            onDragEnd={() => setDraggingUserId(null)}
          />
          <InternalSideDropCard
            title="Bên B"
            side="SIDE_B"
            matchId={matchId}
            members={sideB}
            canManage={canManage}
            pending={pending}
            draggingUserId={draggingUserId}
            onDropToSide={handleDropToSide}
            onMoveSide={movePlayerToSide}
            onDragStart={setDraggingUserId}
            onDragEnd={() => setDraggingUserId(null)}
          />
        </div>
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
      {members.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-sm text-ink-muted">Chưa có cầu thủ trong đội hình trận.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
              <p className="flex-1 truncate text-sm font-semibold text-ink">
                {member.name}
              </p>
              {canManage ? (
                <RemoveMatchSquadMemberButton
                  matchId={matchId}
                  userId={member.userId}
                  memberName={member.name}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function InternalSideDropCard({
  title,
  side,
  matchId,
  members,
  canManage,
  pending,
  draggingUserId,
  onDropToSide,
  onMoveSide,
  onDragStart,
  onDragEnd,
}: {
  title: string;
  side: InternalPlayingSide;
  matchId: string;
  members: MatchSquadMemberRow[];
  canManage: boolean;
  pending: boolean;
  draggingUserId: string | null;
  onDropToSide: (side: InternalPlayingSide) => void;
  onMoveSide: (userId: string, side: InternalPlayingSide) => void;
  onDragStart: (userId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <Card
      className={cn(
        "gap-0 p-0 transition-colors",
        canManage && draggingUserId ? "border-brand/60 bg-brand-soft/30" : undefined,
      )}
      onDragOver={(event) => {
        if (!canManage || pending) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!canManage || pending) return;
        event.preventDefault();
        onDropToSide(side);
      }}
    >
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {title}
        </h2>
      </div>
      {members.length === 0 ? (
        <div className="px-4 py-5">
          <p className="text-xs text-ink-subtle">Random để có danh sách bên này.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {members.map((member) => (
            <li
              key={member.userId}
              draggable={canManage && !pending}
              onDragStart={() => onDragStart(member.userId)}
              onDragEnd={onDragEnd}
              className={cn(
                "flex items-center gap-2 px-4 py-3",
                canManage && !pending ? "cursor-grab active:cursor-grabbing" : undefined,
                draggingUserId === member.userId ? "opacity-60" : undefined,
              )}
            >
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {member.name}
              </p>
              {canManage ? (
                <>
                  <button
                    type="button"
                    className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:bg-surface-muted"
                    onClick={() =>
                      onMoveSide(member.userId, side === "SIDE_A" ? "SIDE_B" : "SIDE_A")
                    }
                  >
                    Qua {side === "SIDE_A" ? "B" : "A"}
                  </button>
                  <div
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <RemoveMatchSquadMemberButton
                      matchId={matchId}
                      userId={member.userId}
                      memberName={member.name}
                    />
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
